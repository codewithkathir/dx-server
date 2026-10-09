import type { Knex } from "knex";
import { db } from "../../database/knex";
import { toFils, type Fils } from "../../shared/utils/money.util";

const UNSETTLED_BILL = ["open", "partially_paid"];
const UNSETTLED_INVOICE = ["sent", "partially_paid"];

const fils = (value: unknown): Fils => toFils(String(value ?? "0"));

interface DueRow {
  type: "bill" | "invoice";
  id: number;
  number: string;
  party_name: string | null;
  due_date: string;
  status: string;
  balance: string;
}

/** Read-only aggregates across expenses, payables and receivables. */
class DashboardRepository {
  constructor(private readonly knex: Knex = db) {}

  /** Sum and document count of settlements dated in [from, to). */
  async settledBetween(
    kind: "payments" | "receipts",
    from: string,
    to: string
  ): Promise<{ amount: Fils; count: number }> {
    const [table, docTable, docKey] =
      kind === "payments"
        ? ["payable_payments", "payable_bills", "bill_id"]
        : ["receivable_receipts", "receivable_invoices", "invoice_id"];
    const row = (await this.knex(`${table} as s`)
      .join(`${docTable} as d`, "d.id", `s.${docKey}`)
      .whereNull("s.deleted_at")
      .whereNull("d.deleted_at")
      .where("s." + (kind === "payments" ? "payment_date" : "receipt_date"), ">=", from)
      .where("s." + (kind === "payments" ? "payment_date" : "receipt_date"), "<", to)
      .select(this.knex.raw("COALESCE(SUM(s.amount), 0) AS amount"))
      .countDistinct({ count: `s.${docKey}` })
      .first()) as { amount: string; count: number } | undefined;
    return { amount: fils(row?.amount), count: Number(row?.count ?? 0) };
  }

  async receivablesOutstanding(): Promise<{ amount: Fils; count: number }> {
    const row = (await this.knex("receivable_invoices")
      .whereNull("deleted_at")
      .whereIn("status", UNSETTLED_INVOICE)
      .select(this.knex.raw("COALESCE(SUM(total_amount - amount_received), 0) AS amount"))
      .count({ count: "*" })
      .first()) as { amount: string; count: number } | undefined;
    return { amount: fils(row?.amount), count: Number(row?.count ?? 0) };
  }

  async overdueBills(today: string): Promise<{ amount: Fils; count: number }> {
    const row = (await this.knex("payable_bills")
      .whereNull("deleted_at")
      .whereIn("status", UNSETTLED_BILL)
      .where("due_date", "<", today)
      .select(this.knex.raw("COALESCE(SUM(total_amount - amount_paid), 0) AS amount"))
      .count({ count: "*" })
      .first()) as { amount: string; count: number } | undefined;
    return { amount: fils(row?.amount), count: Number(row?.count ?? 0) };
  }

  async countOverdueInvoices(today: string): Promise<number> {
    const row = (await this.knex("receivable_invoices")
      .whereNull("deleted_at")
      .whereIn("status", UNSETTLED_INVOICE)
      .where("due_date", "<", today)
      .count({ count: "*" })
      .first()) as { count: number } | undefined;
    return Number(row?.count ?? 0);
  }

  /** Monthly totals (YYYY-MM → fils) of payments or receipts dated on/after `from`. */
  async monthlySettled(kind: "payments" | "receipts", from: string): Promise<Map<string, Fils>> {
    const [table, docTable, docKey, dateCol] =
      kind === "payments"
        ? ["payable_payments", "payable_bills", "bill_id", "payment_date"]
        : ["receivable_receipts", "receivable_invoices", "invoice_id", "receipt_date"];
    const rows = (await this.knex(`${table} as s`)
      .join(`${docTable} as d`, "d.id", `s.${docKey}`)
      .whereNull("s.deleted_at")
      .whereNull("d.deleted_at")
      .where(`s.${dateCol}`, ">=", from)
      .groupByRaw(`DATE_FORMAT(s.${dateCol}, '%Y-%m')`)
      .select(
        this.knex.raw(`DATE_FORMAT(s.${dateCol}, '%Y-%m') AS month`),
        this.knex.raw("SUM(s.amount) AS amount")
      )) as Array<{ month: string; amount: string }>;
    return new Map(rows.map((r) => [r.month, fils(r.amount)]));
  }

  private pendingClaimsQuery(): Knex.QueryBuilder {
    return this.knex("expenses as x")
      .whereNull("x.deleted_at")
      .where("x.employee_status", "pending")
      .where("x.admin_status", "pending");
  }

  async pendingClaimsTotals(): Promise<{ amount: Fils; count: number }> {
    const row = (await this.pendingClaimsQuery()
      .select(this.knex.raw("COALESCE(SUM(x.amount), 0) AS amount"))
      .count({ count: "*" })
      .first()) as { amount: string; count: number } | undefined;
    return { amount: fils(row?.amount), count: Number(row?.count ?? 0) };
  }

  async pendingClaims(limit: number): Promise<
    Array<{
      id: number;
      employee_id: number;
      employee_name: string;
      category_name: string | null;
      description: string | null;
      date: string;
      amount: string;
    }>
  > {
    return this.pendingClaimsQuery()
      .join("employees as e", "e.id", "x.employee_id")
      .leftJoin("categories as c", "c.id", "x.category_id")
      .orderBy("x.date", "desc")
      .orderBy("x.id", "desc")
      .limit(limit)
      .select(
        "x.id",
        "x.employee_id",
        "e.emp_name as employee_name",
        "c.name as category_name",
        "x.description",
        "x.date",
        "x.amount"
      );
  }

  /** Unsettled bills and invoices due on/before `until` (includes overdue ones), soonest first. */
  async dueSoon(until: string, limit: number, include: { bills: boolean; invoices: boolean }): Promise<DueRow[]> {
    const parts: Knex.QueryBuilder[] = [];
    if (include.bills) {
      parts.push(
        this.knex("payable_bills as b")
          .leftJoin("suppliers as s", "s.id", "b.supplier_id")
          .leftJoin("employees as e", "e.id", "b.employee_id")
          .whereNull("b.deleted_at")
          .whereIn("b.status", UNSETTLED_BILL)
          .where("b.due_date", "<=", until)
          .select(
            this.knex.raw("'bill' AS type"),
            "b.id",
            "b.bill_no as number",
            this.knex.raw("COALESCE(s.company_name, e.emp_name) AS party_name"),
            this.knex.raw("DATE_FORMAT(b.due_date, '%Y-%m-%d') AS due_date"),
            "b.status",
            this.knex.raw("(b.total_amount - b.amount_paid) AS balance")
          )
      );
    }
    if (include.invoices) {
      parts.push(
        this.knex("receivable_invoices as i")
          .join("customers as c", "c.id", "i.customer_id")
          .whereNull("i.deleted_at")
          .whereIn("i.status", UNSETTLED_INVOICE)
          .where("i.due_date", "<=", until)
          .select(
            this.knex.raw("'invoice' AS type"),
            "i.id",
            "i.invoice_no as number",
            "c.company_name as party_name",
            this.knex.raw("DATE_FORMAT(i.due_date, '%Y-%m-%d') AS due_date"),
            "i.status",
            this.knex.raw("(i.total_amount - i.amount_received) AS balance")
          )
      );
    }
    if (parts.length === 0) return [];
    const [first, ...rest] = parts as [Knex.QueryBuilder, ...Knex.QueryBuilder[]];
    const union = rest.length > 0 ? first.unionAll(rest, true) : first;
    return this.knex
      .from(union.as("due"))
      .orderBy("due_date", "asc")
      .orderBy("balance", "desc")
      .limit(limit)
      .select("*") as Promise<DueRow[]>;
  }

  async search(term: string, limit: number) {
    const like = `%${term}%`;
    const [employees, expenses, bills, invoices, suppliers, customers] = await Promise.all([
      this.knex("employees")
        .whereNull("deleted_at")
        .where((q) => void q.where("emp_name", "like", like).orWhere("email", "like", like).orWhere("employee_code", "like", like))
        .orderBy("emp_name")
        .limit(limit)
        .select("id", "emp_name", "email", "employee_code"),
      this.knex("expenses as x")
        .join("employees as e", "e.id", "x.employee_id")
        .whereNull("x.deleted_at")
        .where("x.description", "like", like)
        .orderBy("x.date", "desc")
        .limit(limit)
        .select("x.id", "x.description", "x.amount", "x.date", "e.emp_name"),
      this.knex("payable_bills as b")
        .leftJoin("suppliers as s", "s.id", "b.supplier_id")
        .leftJoin("employees as e", "e.id", "b.employee_id")
        .whereNull("b.deleted_at")
        .where((q) => void q.where("b.bill_no", "like", like).orWhere("s.company_name", "like", like).orWhere("e.emp_name", "like", like).orWhere("b.description", "like", like))
        .orderBy("b.bill_date", "desc")
        .limit(limit)
        .select("b.id", "b.bill_no", "b.total_amount", this.knex.raw("COALESCE(s.company_name, e.emp_name) AS party_name")),
      this.knex("receivable_invoices as i")
        .join("customers as c", "c.id", "i.customer_id")
        .whereNull("i.deleted_at")
        .where((q) => void q.where("i.invoice_no", "like", like).orWhere("i.po_reference", "like", like).orWhere("c.company_name", "like", like))
        .orderBy("i.invoice_date", "desc")
        .limit(limit)
        .select("i.id", "i.invoice_no", "i.total_amount", "c.company_name"),
      this.knex("suppliers")
        .whereNull("deleted_at")
        .where((q) => void q.where("company_name", "like", like).orWhere("email", "like", like))
        .orderBy("company_name")
        .limit(limit)
        .select("id", "company_name", "email"),
      this.knex("customers")
        .whereNull("deleted_at")
        .where((q) => void q.where("company_name", "like", like).orWhere("trn", "like", like).orWhere("email", "like", like))
        .orderBy("company_name")
        .limit(limit)
        .select("id", "company_name", "trn"),
    ]);
    return { employees, expenses, bills, invoices, suppliers, customers };
  }
}

export const dashboardRepository = new DashboardRepository();
