import type { Knex } from "knex";
import { BaseRepository } from "../../shared/repositories/base.repository";
import { paginateQuery } from "../../shared/utils/query-builder";
import { toFils, type Fils } from "../../shared/utils/money.util";
import type {
  InvoiceListQuery,
  InvoiceListRow,
  InvoiceRow,
  ReceiptRow,
} from "./receivable.types";

type Db = Knex | Knex.Transaction;

const SORTABLE: Record<string, string> = {
  created_at: "i.created_at",
  invoice_date: "i.invoice_date",
  due_date: "i.due_date",
  total_amount: "i.total_amount",
  invoice_no: "i.invoice_no",
  status: "i.status",
};

const UNSETTLED = ["sent", "partially_paid"];

class ReceivableRepository extends BaseRepository<InvoiceRow> {
  constructor() {
    super("receivable_invoices");
  }

  private joinedQuery(db: Db = this.db): Knex.QueryBuilder {
    return db("receivable_invoices as i")
      .join("customers as c", "c.id", "i.customer_id")
      .whereNull("i.deleted_at")
      .select(
        "i.*",
        "c.company_name as customer_name",
        "c.company_address as customer_address",
        "c.city_state as customer_city_state",
        "c.country as customer_country",
        "c.email as customer_email"
      );
  }

  async findAllPaginated(
    options: InvoiceListQuery,
    today: string
  ): Promise<{ data: InvoiceListRow[]; total: number }> {
    const query = this.joinedQuery();

    if (options.search) {
      const term = `%${options.search}%`;
      query.where((q) => {
        void q
          .where("i.invoice_no", "like", term)
          .orWhere("i.description", "like", term)
          .orWhere("i.po_reference", "like", term)
          .orWhere("c.company_name", "like", term);
      });
    }
    if (options.status === "overdue") {
      query.whereIn("i.status", UNSETTLED).where("i.due_date", "<", today);
    } else if (options.status) {
      query.where("i.status", options.status);
    }
    if (options.customerId) query.where("i.customer_id", options.customerId);
    if (options.dateFrom) query.where("i.invoice_date", ">=", options.dateFrom);
    if (options.dateTo) query.where("i.invoice_date", "<=", options.dateTo);

    const sortColumn = SORTABLE[options.sortBy ?? ""] ?? "i.created_at";
    query.orderBy(sortColumn, options.order ?? "desc").orderBy("i.id", "desc");

    return paginateQuery<InvoiceListRow>(query, options);
  }

  async findDetailById(id: number, db: Db = this.db): Promise<InvoiceListRow | undefined> {
    return this.joinedQuery(db).where("i.id", id).first() as Promise<InvoiceListRow | undefined>;
  }

  /** Locks the invoice row until the transaction ends (serialises receipts). */
  async findByIdForUpdate(trx: Knex.Transaction, id: number): Promise<InvoiceRow | undefined> {
    return trx("receivable_invoices")
      .where({ id })
      .whereNull("deleted_at")
      .forUpdate()
      .first() as Promise<InvoiceRow | undefined>;
  }

  async insertInvoice(db: Db, data: Record<string, unknown>): Promise<number> {
    const [id] = await db("receivable_invoices").insert({
      ...data,
      created_at: this.db.fn.now(),
      updated_at: this.db.fn.now(),
    });
    return id as number;
  }

  async updateInvoice(db: Db, id: number, data: Record<string, unknown>): Promise<void> {
    await db("receivable_invoices")
      .where({ id })
      .whereNull("deleted_at")
      .update({ ...data, updated_at: this.db.fn.now() });
  }

  async listReceipts(invoiceId: number, db: Db = this.db): Promise<ReceiptRow[]> {
    return db("receivable_receipts as r")
      .leftJoin("payment_methods as m", "m.id", "r.payment_method_id")
      .where("r.invoice_id", invoiceId)
      .whereNull("r.deleted_at")
      .orderBy("r.receipt_date", "asc")
      .orderBy("r.id", "asc")
      .select("r.*", "m.name as payment_method_name") as Promise<ReceiptRow[]>;
  }

  async findReceipt(
    trx: Knex.Transaction,
    invoiceId: number,
    receiptId: number
  ): Promise<ReceiptRow | undefined> {
    return trx("receivable_receipts")
      .where({ id: receiptId, invoice_id: invoiceId })
      .whereNull("deleted_at")
      .first() as Promise<ReceiptRow | undefined>;
  }

  async insertReceipt(db: Db, data: Record<string, unknown>): Promise<number> {
    const [id] = await db("receivable_receipts").insert({
      ...data,
      created_at: this.db.fn.now(),
      updated_at: this.db.fn.now(),
    });
    return id as number;
  }

  async softDeleteReceipt(trx: Knex.Transaction, id: number, deletedBy?: number): Promise<void> {
    await trx("receivable_receipts")
      .where({ id })
      .update({
        deleted_at: this.db.fn.now(),
        updated_at: this.db.fn.now(),
        ...(deletedBy !== undefined ? { updated_by: deletedBy } : {}),
      });
  }

  /** Authoritative amount received: the sum of non-deleted receipts. */
  async sumReceipts(db: Db, invoiceId: number): Promise<Fils> {
    const row = (await db("receivable_receipts")
      .where({ invoice_id: invoiceId })
      .whereNull("deleted_at")
      .sum({ total: "amount" })
      .first()) as { total: string | null } | undefined;
    return toFils(row?.total ?? "0");
  }

  async getSummary(today: string, monthStart: string): Promise<{
    outstanding: Fils;
    outstandingCount: number;
    overdue: Fils;
    overdueCount: number;
    receivedThisMonth: Fils;
    draftCount: number;
  }> {
    const balance = this.db.raw("COALESCE(SUM(total_amount - amount_received), 0) AS amount");
    const unsettled = () =>
      this.db("receivable_invoices").whereNull("deleted_at").whereIn("status", UNSETTLED);

    const [outstanding, overdue, drafts, received] = await Promise.all([
      unsettled().select(balance).count("* as count").first(),
      unsettled().where("due_date", "<", today).select(balance).count("* as count").first(),
      this.db("receivable_invoices").whereNull("deleted_at").where({ status: "draft" }).count("* as count").first(),
      this.db("receivable_receipts as r")
        .join("receivable_invoices as i", "i.id", "r.invoice_id")
        .whereNull("r.deleted_at")
        .whereNull("i.deleted_at")
        .whereBetween("r.receipt_date", [monthStart, today])
        .sum({ total: "r.amount" })
        .first(),
    ]);

    return {
      outstanding: toFils(String(outstanding?.amount ?? "0")),
      outstandingCount: Number(outstanding?.count ?? 0),
      overdue: toFils(String(overdue?.amount ?? "0")),
      overdueCount: Number(overdue?.count ?? 0),
      receivedThisMonth: toFils(String((received as { total: string | null })?.total ?? "0")),
      draftCount: Number(drafts?.count ?? 0),
    };
  }
}

export const receivableRepository = new ReceivableRepository();
