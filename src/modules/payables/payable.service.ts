import path from "path";
import type { Knex } from "knex";
import { db } from "../../database/knex";
import type { BillStatus } from "../../shared/constants/finance";
import { ApiError } from "../../shared/errors/api.error";
import { ErrorCodes } from "../../shared/errors/error-codes";
import { logger } from "../../shared/logger/logger";
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
import {
  getMimeTypeFromFilename,
  isImageFilename,
  removeUploadFile,
  resolveUploadAbsolutePath,
} from "../../shared/utils/file.util";
import { buildPaginationMeta } from "../../shared/utils/pagination.util";
import { categoryService } from "../categories/category.service";
import { notifyReimbursementPayment } from "../expenses/expense-notifications";
import { paymentMethodRepository } from "../payment-methods/payment-method.repository";
import { supplierService } from "../suppliers/supplier.service";
import { payableRepository } from "./payable.repository";
import type {
  BillAttachment,
  BillAttachmentFile,
  BillDetail,
  BillListQuery,
  BillListRow,
  BillPublic,
  BillRow,
  ExpenseReimbursement,
  PayablesSummary,
  PaymentPublic,
  PaymentRow,
} from "./payable.types";
import type {
  CreateBillBody,
  RecordPaymentBody,
  UpdateBillBody,
} from "./payable.validation";

const badRequest = (message: string) =>
  new ApiError(message, ErrorCodes.VALIDATION_ERROR, 400);
const conflict = (message: string) => new ApiError(message, ErrorCodes.CONFLICT, 409);
const notFound = (message: string) => new ApiError(message, ErrorCodes.NOT_FOUND, 404);

class PayableService {
  toPublic(row: BillListRow, today: string = todayIso()): BillPublic {
    const total = toFils(row.total_amount);
    const paid = toFils(row.amount_paid);
    return {
      id: row.id,
      billNo: row.bill_no,
      payeeType: row.payee_type,
      supplierId: row.supplier_id,
      employeeId: row.employee_id,
      payeeName: row.payee_type === "supplier" ? row.supplier_name : row.employee_name,
      employeeCode: row.employee_code,
      billDate: row.bill_date,
      dueDate: row.due_date,
      subtotalAmount: fromFils(toFils(row.subtotal_amount)),
      vatRate: Number(row.vat_rate),
      vatAmount: fromFils(toFils(row.vat_amount)),
      totalAmount: fromFils(total),
      amountPaid: fromFils(paid),
      balance: fromFils(total - paid),
      currency: row.currency,
      categoryId: row.category_id,
      categoryName: row.category_name,
      description: row.description,
      expenseId: row.expense_id,
      source: row.source,
      notes: row.notes,
      attachment: this.toAttachment(row),
      status: row.status,
      isOverdue: isOverdue(row.status as SettlementStatus, row.due_date, total - paid, today),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  private toAttachment(row: BillListRow): BillAttachment | null {
    const file = row.support_file ?? row.expense_support_file;
    if (!file) return null;
    const fileName = path.basename(file);
    return {
      fileName,
      contentType: getMimeTypeFromFilename(fileName),
      isImage: isImageFilename(fileName),
      source: row.support_file ? "bill" : "expense",
    };
  }

  private toPublicPayment(row: PaymentRow): PaymentPublic {
    return {
      id: row.id,
      billId: row.bill_id,
      paymentDate: row.payment_date,
      amount: fromFils(toFils(row.amount)),
      paymentMethodId: row.payment_method_id,
      paymentMethodName: row.payment_method_name ?? null,
      reference: row.reference,
      notes: row.notes,
      createdAt: row.created_at,
    };
  }

  async listBills(query: BillListQuery) {
    const today = todayIso();
    const { data, total } = await payableRepository.findAllPaginated(query, today);
    return {
      data: data.map((row) => this.toPublic(row, today)),
      meta: buildPaginationMeta(query.page, query.limit, total),
    };
  }

  async getBill(id: number, trx?: Knex.Transaction): Promise<BillDetail> {
    const row = await payableRepository.findDetailById(id, trx);
    if (!row) throw notFound("Bill not found");
    const payments = await payableRepository.listPayments(id, trx);
    return { ...this.toPublic(row), payments: payments.map((p) => this.toPublicPayment(p)) };
  }

  async getAttachmentFile(id: number): Promise<BillAttachmentFile> {
    const row = await payableRepository.findDetailById(id);
    if (!row) throw notFound("Bill not found");
    const file = row.support_file ?? row.expense_support_file;
    if (!file) throw notFound("Attachment not found");
    const filename = path.basename(file);
    return {
      absolutePath: resolveUploadAbsolutePath(file),
      contentType: getMimeTypeFromFilename(filename),
      filename,
    };
  }

  /** Stores (or replaces) the bill's own document. `filePath` is already on disk. */
  async setAttachment(id: number, filePath: string, updatedBy?: number): Promise<BillDetail> {
    const bill = await payableRepository.findById(id);
    if (!bill || bill.source === "expense") {
      await removeUploadFile(filePath);
      if (!bill) throw notFound("Bill not found");
      throw badRequest("Reimbursement bills use the expense claim's receipt");
    }
    await payableRepository.updateBill(db, id, { support_file: filePath, updated_by: updatedBy ?? null });
    if (bill.support_file) await removeUploadFile(bill.support_file);
    logger.info({ billId: id, updatedBy }, "Payable bill attachment uploaded");
    return this.getBill(id);
  }

  async removeAttachment(id: number, updatedBy?: number): Promise<BillDetail> {
    const bill = await payableRepository.findById(id);
    if (!bill) throw notFound("Bill not found");
    if (!bill.support_file) throw notFound("Attachment not found");
    await payableRepository.updateBill(db, id, { support_file: null, updated_by: updatedBy ?? null });
    await removeUploadFile(bill.support_file);
    logger.info({ billId: id, updatedBy }, "Payable bill attachment removed");
    return this.getBill(id);
  }

  async getReimbursements(expenseIds: number[]): Promise<Map<number, ExpenseReimbursement>> {
    const rows = await payableRepository.findReimbursementsByExpenseIds(expenseIds);
    return new Map(
      rows.map((row) => [
        row.expense_id,
        {
          billId: row.id,
          billNo: row.bill_no,
          status: row.status as BillStatus,
          totalAmount: fromFils(toFils(row.total_amount)),
          amountPaid: fromFils(toFils(row.amount_paid)),
          lastPaymentDate: row.last_payment_date,
        },
      ])
    );
  }

  async getSummary(): Promise<PayablesSummary> {
    const today = todayIso();
    const summary = await payableRepository.getSummary(today, `${today.slice(0, 8)}01`);
    return {
      outstandingAmount: fromFils(summary.outstanding),
      outstandingCount: summary.outstandingCount,
      overdueAmount: fromFils(summary.overdue),
      overdueCount: summary.overdueCount,
      paidThisMonth: fromFils(summary.paidThisMonth),
      draftCount: summary.draftCount,
    };
  }

  private async assertSupplierUsable(supplierId: number): Promise<void> {
    const supplier = await supplierService.assertSupplierExists(supplierId);
    if (supplier.status !== "active") {
      throw badRequest("Supplier is inactive");
    }
  }

  private async assertBillNoAvailable(
    supplierId: number,
    billNo: string,
    exceptId?: number
  ): Promise<void> {
    const existing = await payableRepository.findBySupplierAndBillNo(supplierId, billNo);
    if (existing && existing.id !== exceptId) {
      throw conflict(`Bill ${billNo} already exists for this supplier`);
    }
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

  async createBill(input: CreateBillBody, createdBy?: number): Promise<BillDetail> {
    await this.assertSupplierUsable(input.supplierId);
    await this.assertBillNoAvailable(input.supplierId, input.billNo);
    if (input.categoryId) await categoryService.assertCategoryExists(input.categoryId);

    const id = await payableRepository.insertBill(db, {
      bill_no: input.billNo,
      payee_type: "supplier",
      supplier_id: input.supplierId,
      employee_id: null,
      bill_date: input.billDate,
      due_date: input.dueDate,
      ...this.totalsColumns(input.subtotalAmount, input.vatRate),
      amount_paid: 0,
      category_id: input.categoryId ?? null,
      description: input.description ?? null,
      notes: input.notes ?? null,
      source: "manual",
      status: input.status,
      created_by: createdBy ?? null,
      updated_by: createdBy ?? null,
    });
    logger.info({ billId: id, createdBy }, "Payable bill created");
    return this.getBill(id);
  }

  async updateBill(id: number, input: UpdateBillBody, updatedBy?: number): Promise<BillDetail> {
    const bill = await payableRepository.findById(id);
    if (!bill) throw notFound("Bill not found");
    if (bill.source === "expense") {
      throw badRequest("Expense reimbursement bills follow their expense and can't be edited");
    }
    if (!["draft", "open"].includes(bill.status) || toFils(bill.amount_paid) > 0) {
      throw conflict("Only unpaid draft or open bills can be edited");
    }

    const supplierId = input.supplierId ?? (bill.supplier_id as number);
    const billNo = input.billNo ?? bill.bill_no;
    const billDate = input.billDate ?? bill.bill_date;
    const dueDate = input.dueDate ?? bill.due_date;
    if (dueDate < billDate) throw badRequest("Due date can't be before the bill date");
    if (input.supplierId) await this.assertSupplierUsable(input.supplierId);
    if (input.supplierId || input.billNo) await this.assertBillNoAvailable(supplierId, billNo, id);
    if (input.categoryId) await categoryService.assertCategoryExists(input.categoryId);

    const data: Record<string, unknown> = {
      supplier_id: supplierId,
      bill_no: billNo,
      bill_date: billDate,
      due_date: dueDate,
      updated_by: updatedBy ?? null,
    };
    if (input.subtotalAmount !== undefined || input.vatRate !== undefined) {
      Object.assign(
        data,
        this.totalsColumns(
          input.subtotalAmount ?? Number(bill.subtotal_amount),
          input.vatRate ?? Number(bill.vat_rate)
        )
      );
    }
    if (input.categoryId !== undefined) data.category_id = input.categoryId;
    if (input.description !== undefined) data.description = input.description;
    if (input.notes !== undefined) data.notes = input.notes;

    await payableRepository.updateBill(db, id, data);
    return this.getBill(id);
  }

  async issueBill(id: number, updatedBy?: number): Promise<BillDetail> {
    const bill = await payableRepository.findById(id);
    if (!bill) throw notFound("Bill not found");
    if (bill.status !== "draft") throw conflict("Only draft bills can be issued");
    await payableRepository.updateBill(db, id, { status: "open", updated_by: updatedBy ?? null });
    return this.getBill(id);
  }

  async cancelBill(id: number, updatedBy?: number): Promise<BillDetail> {
    await db.transaction(async (trx) => {
      const bill = await payableRepository.findByIdForUpdate(trx, id);
      if (!bill) throw notFound("Bill not found");
      if (bill.source === "expense") {
        throw badRequest("To cancel a reimbursement, reject the expense instead");
      }
      if (bill.status === "cancelled") throw conflict("Bill is already cancelled");
      if ((await payableRepository.sumPayments(trx, id)) > 0) {
        throw conflict("Bill has payments. Delete the payments before cancelling.");
      }
      await payableRepository.updateBill(trx, id, { status: "cancelled", updated_by: updatedBy ?? null });
    });
    return this.getBill(id);
  }

  async deleteBill(id: number, updatedBy?: number): Promise<void> {
    await db.transaction(async (trx) => {
      const bill = await payableRepository.findByIdForUpdate(trx, id);
      if (!bill) throw notFound("Bill not found");
      if (bill.source === "expense") {
        throw badRequest("Reimbursement bills can't be deleted; reject the expense instead");
      }
      if (!["draft", "cancelled"].includes(bill.status)) {
        throw conflict("Only draft or cancelled bills can be deleted");
      }
      if ((await payableRepository.sumPayments(trx, id)) > 0) {
        throw conflict("Bill has payments and can't be deleted");
      }
      await payableRepository.softDelete(id, updatedBy, trx);
    });
  }

  async recordPayment(
    billId: number,
    input: RecordPaymentBody,
    createdBy?: number
  ): Promise<BillDetail> {
    if (input.paymentDate > todayIso()) throw badRequest("Payment date can't be in the future");
    const method = await paymentMethodRepository.findById(input.paymentMethodId);
    if (!method || method.status !== "active") throw badRequest("Payment method is not available");

    await db.transaction(async (trx) => {
      const bill = await payableRepository.findByIdForUpdate(trx, billId);
      if (!bill) throw notFound("Bill not found");
      if (bill.status === "draft") throw conflict("Issue the bill before recording payments");
      if (bill.status === "cancelled") throw conflict("Bill is cancelled");
      if (input.paymentDate < bill.bill_date) {
        throw badRequest("Payment date can't be before the bill date");
      }

      const total = toFils(bill.total_amount);
      const paid = await payableRepository.sumPayments(trx, billId);
      const amount = toFils(input.amount);
      if (amount > total - paid) {
        throw badRequest(
          `Payment exceeds the balance of ${filsToDecimalString(total - paid)} ${bill.currency}`
        );
      }

      await payableRepository.insertPayment(trx, {
        bill_id: billId,
        payment_date: input.paymentDate,
        amount: filsToDecimalString(amount),
        payment_method_id: input.paymentMethodId,
        reference: input.reference ?? null,
        notes: input.notes ?? null,
        created_by: createdBy ?? null,
        updated_by: createdBy ?? null,
      });
      await this.applySettlement(trx, bill, paid + amount, createdBy);
    });

    logger.info({ billId, amount: input.amount, createdBy }, "Payable payment recorded");
    notifyReimbursementPayment(billId, {
      amount: input.amount,
      date: input.paymentDate,
      paymentMethodId: input.paymentMethodId,
    });
    return this.getBill(billId);
  }

  async deletePayment(billId: number, paymentId: number, deletedBy?: number): Promise<BillDetail> {
    await db.transaction(async (trx) => {
      const bill = await payableRepository.findByIdForUpdate(trx, billId);
      if (!bill) throw notFound("Bill not found");
      const payment = await payableRepository.findPayment(trx, billId, paymentId);
      if (!payment) throw notFound("Payment not found");

      await payableRepository.softDeletePayment(trx, paymentId, deletedBy);
      await this.applySettlement(trx, bill, await payableRepository.sumPayments(trx, billId), deletedBy);
    });

    logger.info({ billId, paymentId, deletedBy }, "Payable payment deleted");
    return this.getBill(billId);
  }

  /**
   * Writes amount_paid and the derived status, and keeps a reimbursement's
   * expense in step: fully paid → expense "paid", otherwise back to "pending".
   */
  private async applySettlement(
    trx: Knex.Transaction,
    bill: BillRow,
    paid: number,
    updatedBy?: number
  ): Promise<void> {
    const status = deriveSettlementStatus(
      bill.status as SettlementStatus,
      toFils(bill.total_amount),
      paid,
      "open"
    ) as BillStatus;

    await payableRepository.updateBill(trx, bill.id, {
      amount_paid: filsToDecimalString(paid),
      status,
      updated_by: updatedBy ?? null,
    });

    if (bill.expense_id) {
      await payableRepository.setExpenseAdminStatus(
        trx,
        bill.expense_id,
        status === "paid" ? "paid" : "pending"
      );
    }
  }
}

export const payableService = new PayableService();
