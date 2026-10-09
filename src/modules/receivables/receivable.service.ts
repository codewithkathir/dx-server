import type { Knex } from "knex";
import { config } from "../../config";
import { db } from "../../database/knex";
import type { InvoiceStatus } from "../../shared/constants/finance";
import { ApiError } from "../../shared/errors/api.error";
import { ErrorCodes } from "../../shared/errors/error-codes";
import { logger } from "../../shared/logger/logger";
import {
  DocumentSequences,
  nextDocumentNumber,
} from "../../shared/utils/document-number.util";
import {
  calculateTotals,
  deriveSettlementStatus,
  filsToDecimalString,
  fromFils,
  isOverdue,
  type SettlementStatus,
  toFils,
  todayIso,
} from "../../shared/utils/money.util";
import { buildPaginationMeta } from "../../shared/utils/pagination.util";
import { customerService } from "../customers/customer.service";
import { paymentMethodRepository } from "../payment-methods/payment-method.repository";
import { renderInvoicePdf } from "./invoice-pdf";
import { receivableRepository } from "./receivable.repository";
import type {
  InvoiceDetail,
  InvoiceListQuery,
  InvoiceListRow,
  InvoicePublic,
  InvoiceRow,
  ReceiptPublic,
  ReceiptRow,
  ReceivablesSummary,
} from "./receivable.types";
import type {
  CreateInvoiceBody,
  RecordReceiptBody,
  UpdateInvoiceBody,
} from "./receivable.validation";

const badRequest = (message: string) => new ApiError(message, ErrorCodes.VALIDATION_ERROR, 400);
const conflict = (message: string) => new ApiError(message, ErrorCodes.CONFLICT, 409);
const notFound = (message: string) => new ApiError(message, ErrorCodes.NOT_FOUND, 404);

class ReceivableService {
  toPublic(row: InvoiceListRow, today: string = todayIso()): InvoicePublic {
    const total = toFils(row.total_amount);
    const received = toFils(row.amount_received);
    return {
      id: row.id,
      invoiceNo: row.invoice_no,
      customerId: row.customer_id,
      customerName: row.customer_name,
      customerTrn: row.customer_trn,
      invoiceDate: row.invoice_date,
      dueDate: row.due_date,
      subtotalAmount: fromFils(toFils(row.subtotal_amount)),
      vatRate: Number(row.vat_rate),
      vatAmount: fromFils(toFils(row.vat_amount)),
      totalAmount: fromFils(total),
      amountReceived: fromFils(received),
      balance: fromFils(total - received),
      currency: row.currency,
      description: row.description,
      poReference: row.po_reference,
      notes: row.notes,
      status: row.status,
      // Drafts aren't owed yet, so they're never overdue ("sent" ≈ open).
      isOverdue: isOverdue(row.status as SettlementStatus, row.due_date, total - received, today),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  private toPublicReceipt(row: ReceiptRow): ReceiptPublic {
    return {
      id: row.id,
      invoiceId: row.invoice_id,
      receiptDate: row.receipt_date,
      amount: fromFils(toFils(row.amount)),
      paymentMethodId: row.payment_method_id,
      paymentMethodName: row.payment_method_name ?? null,
      reference: row.reference,
      notes: row.notes,
      createdAt: row.created_at,
    };
  }

  async listInvoices(query: InvoiceListQuery) {
    const today = todayIso();
    const { data, total } = await receivableRepository.findAllPaginated(query, today);
    return {
      data: data.map((row) => this.toPublic(row, today)),
      meta: buildPaginationMeta(query.page, query.limit, total),
    };
  }

  async getInvoice(id: number, trx?: Knex.Transaction): Promise<InvoiceDetail> {
    const row = await receivableRepository.findDetailById(id, trx);
    if (!row) throw notFound("Invoice not found");
    const receipts = await receivableRepository.listReceipts(id, trx);
    return { ...this.toPublic(row), receipts: receipts.map((r) => this.toPublicReceipt(r)) };
  }

  async getSummary(): Promise<ReceivablesSummary> {
    const today = todayIso();
    const summary = await receivableRepository.getSummary(today, `${today.slice(0, 8)}01`);
    return {
      outstandingAmount: fromFils(summary.outstanding),
      outstandingCount: summary.outstandingCount,
      overdueAmount: fromFils(summary.overdue),
      overdueCount: summary.overdueCount,
      receivedThisMonth: fromFils(summary.receivedThisMonth),
      draftCount: summary.draftCount,
    };
  }

  /** Active customer, returning the TRN to snapshot onto the invoice. */
  private async assertCustomerUsable(customerId: number): Promise<{ trn: string | null }> {
    const customer = await customerService.assertCustomerExists(customerId);
    if (customer.status !== "active") throw badRequest("Customer is inactive");
    return { trn: customer.trn };
  }

  private totalsColumns(subtotal: number, vatRate: number) {
    const totals = calculateTotals(toFils(subtotal), vatRate);
    return {
      subtotal_amount: filsToDecimalString(totals.subtotal),
      vat_rate: vatRate,
      vat_amount: filsToDecimalString(totals.vat),
      total_amount: filsToDecimalString(totals.total),
    };
  }

  /**
   * The invoice number is assigned at creation from a gap-free yearly sequence.
   * Invoices are cancelled rather than deleted, so a number is never lost.
   */
  async createInvoice(input: CreateInvoiceBody, createdBy?: number): Promise<InvoiceDetail> {
    const customer = await this.assertCustomerUsable(input.customerId);

    const id = await db.transaction(async (trx) => {
      const invoiceNo = await nextDocumentNumber(
        trx,
        DocumentSequences.RECEIVABLE_INVOICE,
        Number(input.invoiceDate.slice(0, 4))
      );
      return receivableRepository.insertInvoice(trx, {
        invoice_no: invoiceNo,
        customer_id: input.customerId,
        customer_trn: customer.trn,
        invoice_date: input.invoiceDate,
        due_date: input.dueDate,
        ...this.totalsColumns(input.subtotalAmount, input.vatRate),
        amount_received: 0,
        description: input.description,
        po_reference: input.poReference ?? null,
        notes: input.notes ?? null,
        status: input.status,
        created_by: createdBy ?? null,
        updated_by: createdBy ?? null,
      });
    });

    logger.info({ invoiceId: id, createdBy }, "Receivable invoice created");
    return this.getInvoice(id);
  }

  /** Only drafts can change: a sent invoice is a document the customer already has. */
  async updateInvoice(id: number, input: UpdateInvoiceBody, updatedBy?: number): Promise<InvoiceDetail> {
    const invoice = await receivableRepository.findById(id);
    if (!invoice) throw notFound("Invoice not found");
    if (invoice.status !== "draft") {
      throw conflict("Only draft invoices can be edited. Cancel and re-issue to correct a sent invoice.");
    }

    const invoiceDate = input.invoiceDate ?? invoice.invoice_date;
    const dueDate = input.dueDate ?? invoice.due_date;
    if (dueDate < invoiceDate) throw badRequest("Due date can't be before the invoice date");

    const data: Record<string, unknown> = {
      invoice_date: invoiceDate,
      due_date: dueDate,
      updated_by: updatedBy ?? null,
    };
    if (input.customerId !== undefined) {
      const customer = await this.assertCustomerUsable(input.customerId);
      data.customer_id = input.customerId;
      data.customer_trn = customer.trn;
    }
    if (input.subtotalAmount !== undefined || input.vatRate !== undefined) {
      Object.assign(
        data,
        this.totalsColumns(
          input.subtotalAmount ?? Number(invoice.subtotal_amount),
          input.vatRate ?? Number(invoice.vat_rate)
        )
      );
    }
    if (input.description !== undefined) data.description = input.description;
    if (input.poReference !== undefined) data.po_reference = input.poReference;
    if (input.notes !== undefined) data.notes = input.notes;

    await receivableRepository.updateInvoice(db, id, data);
    return this.getInvoice(id);
  }

  /** Draft → sent. Refreshes the TRN snapshot to what the customer has now. */
  async sendInvoice(id: number, updatedBy?: number): Promise<InvoiceDetail> {
    const invoice = await receivableRepository.findById(id);
    if (!invoice) throw notFound("Invoice not found");
    if (invoice.status !== "draft") throw conflict("Only draft invoices can be marked as sent");
    const customer = await this.assertCustomerUsable(invoice.customer_id);
    await receivableRepository.updateInvoice(db, id, {
      status: "sent",
      customer_trn: customer.trn,
      updated_by: updatedBy ?? null,
    });
    return this.getInvoice(id);
  }

  async cancelInvoice(id: number, updatedBy?: number): Promise<InvoiceDetail> {
    await db.transaction(async (trx) => {
      const invoice = await receivableRepository.findByIdForUpdate(trx, id);
      if (!invoice) throw notFound("Invoice not found");
      if (invoice.status === "cancelled") throw conflict("Invoice is already cancelled");
      if ((await receivableRepository.sumReceipts(trx, id)) > 0) {
        throw conflict("Invoice has receipts. Delete the receipts before cancelling.");
      }
      await receivableRepository.updateInvoice(trx, id, { status: "cancelled", updated_by: updatedBy ?? null });
    });
    return this.getInvoice(id);
  }

  async recordReceipt(invoiceId: number, input: RecordReceiptBody, createdBy?: number): Promise<InvoiceDetail> {
    if (input.receiptDate > todayIso()) throw badRequest("Receipt date can't be in the future");
    const method = await paymentMethodRepository.findById(input.paymentMethodId);
    if (!method || method.status !== "active") throw badRequest("Payment method is not available");

    await db.transaction(async (trx) => {
      const invoice = await receivableRepository.findByIdForUpdate(trx, invoiceId);
      if (!invoice) throw notFound("Invoice not found");
      if (invoice.status === "draft") throw conflict("Mark the invoice as sent before recording receipts");
      if (invoice.status === "cancelled") throw conflict("Invoice is cancelled");
      if (input.receiptDate < invoice.invoice_date) {
        throw badRequest("Receipt date can't be before the invoice date");
      }

      const total = toFils(invoice.total_amount);
      const received = await receivableRepository.sumReceipts(trx, invoiceId);
      const amount = toFils(input.amount);
      if (amount > total - received) {
        throw badRequest(
          `Receipt exceeds the balance of ${filsToDecimalString(total - received)} ${invoice.currency}`
        );
      }

      await receivableRepository.insertReceipt(trx, {
        invoice_id: invoiceId,
        receipt_date: input.receiptDate,
        amount: filsToDecimalString(amount),
        payment_method_id: input.paymentMethodId,
        reference: input.reference ?? null,
        notes: input.notes ?? null,
        created_by: createdBy ?? null,
        updated_by: createdBy ?? null,
      });
      await this.applySettlement(trx, invoice, received + amount, createdBy);
    });

    logger.info({ invoiceId, amount: input.amount, createdBy }, "Receivable receipt recorded");
    return this.getInvoice(invoiceId);
  }

  async deleteReceipt(invoiceId: number, receiptId: number, deletedBy?: number): Promise<InvoiceDetail> {
    await db.transaction(async (trx) => {
      const invoice = await receivableRepository.findByIdForUpdate(trx, invoiceId);
      if (!invoice) throw notFound("Invoice not found");
      const receipt = await receivableRepository.findReceipt(trx, invoiceId, receiptId);
      if (!receipt) throw notFound("Receipt not found");

      await receivableRepository.softDeleteReceipt(trx, receiptId, deletedBy);
      await this.applySettlement(trx, invoice, await receivableRepository.sumReceipts(trx, invoiceId), deletedBy);
    });

    logger.info({ invoiceId, receiptId, deletedBy }, "Receivable receipt deleted");
    return this.getInvoice(invoiceId);
  }

  private async applySettlement(
    trx: Knex.Transaction,
    invoice: InvoiceRow,
    received: number,
    updatedBy?: number
  ): Promise<void> {
    const status = deriveSettlementStatus(
      invoice.status as SettlementStatus,
      toFils(invoice.total_amount),
      received,
      "sent"
    ) as InvoiceStatus;
    await receivableRepository.updateInvoice(trx, invoice.id, {
      amount_received: filsToDecimalString(received),
      status,
      updated_by: updatedBy ?? null,
    });
  }

  async getInvoicePdf(id: number): Promise<{ filename: string; document: PDFKit.PDFDocument }> {
    const row = await receivableRepository.findDetailById(id);
    if (!row) throw notFound("Invoice not found");
    return {
      filename: `${row.invoice_no}.pdf`,
      document: renderInvoicePdf(row, config.company),
    };
  }
}

export const receivableService = new ReceivableService();
