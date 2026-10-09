import type { Knex } from "knex";
import { BaseRepository } from "../../shared/repositories/base.repository";
import { paginateQuery } from "../../shared/utils/query-builder";
import { toFils, type Fils } from "../../shared/utils/money.util";
import type {
  BillListQuery,
  BillListRow,
  BillRow,
  PaymentRow,
} from "./payable.types";

type Db = Knex | Knex.Transaction;

const SORTABLE: Record<string, string> = {
  created_at: "b.created_at",
  bill_date: "b.bill_date",
  due_date: "b.due_date",
  total_amount: "b.total_amount",
  bill_no: "b.bill_no",
  status: "b.status",
};

const UNSETTLED = ["open", "partially_paid"];

class PayableRepository extends BaseRepository<BillRow> {
  constructor() {
    super("payable_bills");
  }

  /** Bills joined with payee/category names. Tables are aliased, so columns are qualified. */
  private joinedQuery(db: Db = this.db): Knex.QueryBuilder {
    return db("payable_bills as b")
      .leftJoin("suppliers as s", "s.id", "b.supplier_id")
      .leftJoin("employees as e", "e.id", "b.employee_id")
      .leftJoin("categories as c", "c.id", "b.category_id")
      .whereNull("b.deleted_at")
      .select(
        "b.*",
        "s.company_name as supplier_name",
        "e.emp_name as employee_name",
        "e.employee_code as employee_code",
        "c.name as category_name"
      );
  }

  async findAllPaginated(
    options: BillListQuery,
    today: string
  ): Promise<{ data: BillListRow[]; total: number }> {
    const query = this.joinedQuery();

    if (options.search) {
      const term = `%${options.search}%`;
      query.where((q) => {
        void q
          .where("b.bill_no", "like", term)
          .orWhere("b.description", "like", term)
          .orWhere("s.company_name", "like", term)
          .orWhere("e.emp_name", "like", term);
      });
    }
    if (options.status === "overdue") {
      query.whereIn("b.status", UNSETTLED).where("b.due_date", "<", today);
    } else if (options.status) {
      query.where("b.status", options.status);
    }
    if (options.payeeType) query.where("b.payee_type", options.payeeType);
    if (options.supplierId) query.where("b.supplier_id", options.supplierId);
    if (options.employeeId) query.where("b.employee_id", options.employeeId);
    if (options.dateFrom) query.where("b.bill_date", ">=", options.dateFrom);
    if (options.dateTo) query.where("b.bill_date", "<=", options.dateTo);

    const sortColumn = SORTABLE[options.sortBy ?? ""] ?? "b.created_at";
    query.orderBy(sortColumn, options.order ?? "desc").orderBy("b.id", "desc");

    return paginateQuery<BillListRow>(query, options);
  }

  async findDetailById(id: number, db: Db = this.db): Promise<BillListRow | undefined> {
    return this.joinedQuery(db).where("b.id", id).first() as Promise<BillListRow | undefined>;
  }

  /** Locks the bill row until the transaction ends (serialises payments). */
  async findByIdForUpdate(trx: Knex.Transaction, id: number): Promise<BillRow | undefined> {
    return trx("payable_bills")
      .where({ id })
      .whereNull("deleted_at")
      .forUpdate()
      .first() as Promise<BillRow | undefined>;
  }

  async findByExpenseId(expenseId: number, db: Db = this.db): Promise<BillRow | undefined> {
    return db("payable_bills")
      .where({ expense_id: expenseId })
      .whereNull("deleted_at")
      .first() as Promise<BillRow | undefined>;
  }

  async findBySupplierAndBillNo(
    supplierId: number,
    billNo: string
  ): Promise<BillRow | undefined> {
    return this.baseQuery()
      .where({ supplier_id: supplierId, bill_no: billNo })
      .first() as Promise<BillRow | undefined>;
  }

  async insertBill(db: Db, data: Record<string, unknown>): Promise<number> {
    const [id] = await db("payable_bills").insert({
      ...data,
      created_at: this.db.fn.now(),
      updated_at: this.db.fn.now(),
    });
    return id as number;
  }

  async updateBill(db: Db, id: number, data: Record<string, unknown>): Promise<void> {
    await db("payable_bills")
      .where({ id })
      .whereNull("deleted_at")
      .update({ ...data, updated_at: this.db.fn.now() });
  }

  async listPayments(billId: number, db: Db = this.db): Promise<PaymentRow[]> {
    return db("payable_payments as p")
      .leftJoin("payment_methods as m", "m.id", "p.payment_method_id")
      .where("p.bill_id", billId)
      .whereNull("p.deleted_at")
      .orderBy("p.payment_date", "asc")
      .orderBy("p.id", "asc")
      .select("p.*", "m.name as payment_method_name") as Promise<PaymentRow[]>;
  }

  async findPayment(
    trx: Knex.Transaction,
    billId: number,
    paymentId: number
  ): Promise<PaymentRow | undefined> {
    return trx("payable_payments")
      .where({ id: paymentId, bill_id: billId })
      .whereNull("deleted_at")
      .first() as Promise<PaymentRow | undefined>;
  }

  async insertPayment(db: Db, data: Record<string, unknown>): Promise<number> {
    const [id] = await db("payable_payments").insert({
      ...data,
      created_at: this.db.fn.now(),
      updated_at: this.db.fn.now(),
    });
    return id as number;
  }

  async softDeletePayment(trx: Knex.Transaction, id: number, deletedBy?: number): Promise<void> {
    await trx("payable_payments")
      .where({ id })
      .update({
        deleted_at: this.db.fn.now(),
        updated_at: this.db.fn.now(),
        ...(deletedBy !== undefined ? { updated_by: deletedBy } : {}),
      });
  }

  /** Reimbursement bill per expense, with the latest payment date. */
  async findReimbursementsByExpenseIds(expenseIds: number[]): Promise<
    Array<{
      expense_id: number;
      id: number;
      bill_no: string;
      status: string;
      total_amount: string;
      amount_paid: string;
      last_payment_date: string | null;
    }>
  > {
    if (expenseIds.length === 0) return [];
    return this.db("payable_bills as b")
      .leftJoin("payable_payments as p", (join) => {
        join.on("p.bill_id", "b.id").andOnNull("p.deleted_at");
      })
      .whereIn("b.expense_id", expenseIds)
      .whereNull("b.deleted_at")
      .groupBy("b.id")
      .select(
        "b.expense_id",
        "b.id",
        "b.bill_no",
        "b.status",
        "b.total_amount",
        "b.amount_paid",
        this.db.raw("DATE_FORMAT(MAX(p.payment_date), '%Y-%m-%d') AS last_payment_date")
      );
  }

  /** Mirrors a reimbursement bill's settlement onto its expense. */
  async setExpenseAdminStatus(
    trx: Knex.Transaction,
    expenseId: number,
    adminStatus: "pending" | "paid" | "rejected"
  ): Promise<void> {
    await trx("expenses")
      .where({ id: expenseId })
      .update({ admin_status: adminStatus, updated_at: this.db.fn.now() });
  }

  /** Authoritative amount paid: the sum of non-deleted payments. */
  async sumPayments(db: Db, billId: number): Promise<Fils> {
    const row = (await db("payable_payments")
      .where({ bill_id: billId })
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
    paidThisMonth: Fils;
    draftCount: number;
  }> {
    const balance = this.db.raw("COALESCE(SUM(total_amount - amount_paid), 0) AS amount");
    const unsettled = () =>
      this.db("payable_bills").whereNull("deleted_at").whereIn("status", UNSETTLED);

    const [outstanding, overdue, drafts, paid] = await Promise.all([
      unsettled().select(balance).count("* as count").first(),
      unsettled().where("due_date", "<", today).select(balance).count("* as count").first(),
      this.db("payable_bills").whereNull("deleted_at").where({ status: "draft" }).count("* as count").first(),
      this.db("payable_payments as p")
        .join("payable_bills as b", "b.id", "p.bill_id")
        .whereNull("p.deleted_at")
        .whereNull("b.deleted_at")
        .whereBetween("p.payment_date", [monthStart, today])
        .sum({ total: "p.amount" })
        .first(),
    ]);

    return {
      outstanding: toFils(String(outstanding?.amount ?? "0")),
      outstandingCount: Number(outstanding?.count ?? 0),
      overdue: toFils(String(overdue?.amount ?? "0")),
      overdueCount: Number(overdue?.count ?? 0),
      paidThisMonth: toFils(String((paid as { total: string | null })?.total ?? "0")),
      draftCount: Number(drafts?.count ?? 0),
    };
  }
}

export const payableRepository = new PayableRepository();
