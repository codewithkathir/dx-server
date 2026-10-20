import type { Knex } from "knex";
import { BaseRepository } from "../../shared/repositories/base.repository";
import { paginateQuery } from "../../shared/utils/query-builder";
import type { AccountEntryListRow, AccountEntryRow, AccountListRow } from "./employee-account.types";
import type { AccountListQueryParams, EntryListQueryParams } from "./employee-account.validation";

type Db = Knex | Knex.Transaction;

const LIVE = "x.voided_at IS NULL";

const ACCOUNT_SORT: Record<AccountListQueryParams["sortBy"], string> = {
  balance: "balance",
  name: "emp_name",
  last_activity: "last_entry_date",
  owed: "owed_amount",
};

class EmployeeAccountRepository extends BaseRepository<AccountEntryRow> {
  constructor() {
    super("employee_account_entries");
  }

  /** Serialises balance changes for one employee (approvals, advances, returns) until the transaction ends. */
  async lockEmployee(trx: Knex.Transaction, employeeId: number): Promise<{ id: number; status: string } | undefined> {
    return trx("employees").where({ id: employeeId }).whereNull("deleted_at").forUpdate().first("id", "status");
  }

  async balance(employeeId: number, db: Db = this.db): Promise<string> {
    const row = (await db("employee_account_entries")
      .where({ employee_id: employeeId })
      .whereNull("voided_at")
      .first(db.raw("COALESCE(SUM(amount), 0) AS balance"))) as { balance: string | number } | undefined;
    return String(row?.balance ?? "0");
  }

  /** Balances for a page of employees (employee list). Employees with no entries are absent. */
  async balancesFor(employeeIds: number[]): Promise<Map<number, string>> {
    if (employeeIds.length === 0) return new Map();
    const rows = (await this.db("employee_account_entries")
      .whereIn("employee_id", employeeIds)
      .whereNull("voided_at")
      .groupBy("employee_id")
      .select("employee_id", this.db.raw("SUM(amount) AS balance"))) as Array<{ employee_id: number; balance: string | number }>;
    return new Map(rows.map((r) => [r.employee_id, String(r.balance)]));
  }

  async insertEntry(db: Db, row: Omit<AccountEntryRow, "id" | "created_at" | "voided_at" | "voided_by" | "void_reason">): Promise<number> {
    const [id] = await db("employee_account_entries").insert(row);
    return id as number;
  }

  async findEntry(id: number, db: Db = this.db): Promise<AccountEntryRow | undefined> {
    return db("employee_account_entries").where({ id }).first();
  }

  async findLiveExpenseEntry(trx: Knex.Transaction, expenseId: number): Promise<AccountEntryRow | undefined> {
    return trx("employee_account_entries").where({ expense_id: expenseId, type: "expense" }).whereNull("voided_at").first();
  }

  async voidEntry(db: Db, id: number, voidedBy: number | null, reason: string): Promise<void> {
    await db("employee_account_entries")
      .where({ id })
      .update({ voided_at: db.fn.now(), voided_by: voidedBy, void_reason: reason.slice(0, 255) });
  }

  /** Every employee with their balance, advances, pending claims and open reimbursements. */
  private accountsQuery(): Knex.QueryBuilder {
    const db = this.db;
    const inner = db("employees as e")
      .whereNull("e.deleted_at")
      .select(
        "e.id as employee_id",
        "e.emp_name",
        "e.employee_code",
        "e.status",
        db.raw(`COALESCE((SELECT SUM(x.amount) FROM employee_account_entries x WHERE x.employee_id = e.id AND ${LIVE}), 0) AS balance`),
        db.raw(
          `COALESCE((SELECT SUM(x.amount) FROM employee_account_entries x WHERE x.employee_id = e.id AND x.type = 'advance' AND ${LIVE}), 0) AS total_advanced`
        ),
        db.raw(`(SELECT MAX(x.entry_date) FROM employee_account_entries x WHERE x.employee_id = e.id AND ${LIVE}) AS last_entry_date`),
        db.raw(
          "(SELECT COUNT(*) FROM expenses p WHERE p.employee_id = e.id AND p.deleted_at IS NULL AND p.employee_status = 'pending' AND p.admin_status = 'pending') AS pending_count"
        ),
        db.raw(
          "COALESCE((SELECT SUM(p.amount) FROM expenses p WHERE p.employee_id = e.id AND p.deleted_at IS NULL AND p.employee_status = 'pending' AND p.admin_status = 'pending'), 0) AS pending_amount"
        ),
        db.raw(
          "COALESCE((SELECT SUM(b.total_amount - b.amount_paid) FROM payable_bills b WHERE b.employee_id = e.id AND b.payee_type = 'employee' AND b.status IN ('open', 'partially_paid') AND b.deleted_at IS NULL), 0) AS owed_amount"
        )
      );
    // Wrapped so the computed columns can be filtered and sorted like real ones.
    return db.from(inner.as("acc"));
  }

  async findAccounts(options: AccountListQueryParams): Promise<{ data: AccountListRow[]; total: number }> {
    let query = this.accountsQuery().select("acc.*");
    if (options.search) {
      const term = `%${options.search}%`;
      query = query.where((q) => q.where("acc.emp_name", "like", term).orWhere("acc.employee_code", "like", term));
    }
    if (options.show === "holding") query = query.where("acc.balance", ">", 0);
    if (options.show === "owed") query = query.where("acc.owed_amount", ">", 0);
    if (options.show === "active") query = query.where((q) => q.where("acc.balance", "!=", 0).orWhere("acc.owed_amount", ">", 0));
    query = query.orderBy(`acc.${ACCOUNT_SORT[options.sortBy]}`, options.order).orderBy("acc.emp_name", "asc");
    return paginateQuery<AccountListRow>(query, options);
  }

  async findAccount(employeeId: number): Promise<AccountListRow | undefined> {
    return this.accountsQuery().select("acc.*").where("acc.employee_id", employeeId).first();
  }

  /** Statement lines, newest first, each with the balance after it. */
  async findEntries(
    employeeId: number,
    options: EntryListQueryParams
  ): Promise<{ data: AccountEntryListRow[]; total: number }> {
    const db = this.db;
    const inner = db("employee_account_entries as x")
      .leftJoin("payment_methods as pm", "pm.id", "x.payment_method_id")
      .leftJoin("admins as cb", "cb.id", "x.created_by")
      .leftJoin("admins as vb", "vb.id", "x.voided_by")
      .leftJoin("expenses as ex", "ex.id", "x.expense_id")
      .leftJoin("categories as c", "c.id", "ex.category_id")
      .leftJoin("sub_categories as s", "s.id", "ex.sub_category_id")
      .where("x.employee_id", employeeId)
      .select(
        "x.*",
        db.raw(
          `SUM(CASE WHEN ${LIVE} THEN x.amount ELSE 0 END) OVER (ORDER BY x.entry_date, x.id) AS running_balance`
        ),
        "pm.name as payment_method_name",
        "cb.name as created_by_name",
        "vb.name as voided_by_name",
        "ex.description as expense_description",
        "ex.amount as expense_amount",
        "c.name as category_name",
        "s.name as sub_category_name"
      );
    let query = db.from(inner.as("st")).select("st.*");
    if (!options.includeVoided) query = query.whereNull("st.voided_at");
    if (options.dateFrom) query = query.where("st.entry_date", ">=", options.dateFrom);
    if (options.dateTo) query = query.where("st.entry_date", "<=", options.dateTo);
    query = query.orderBy("st.entry_date", "desc").orderBy("st.id", "desc");
    return paginateQuery<AccountEntryListRow>(query, options);
  }

  async summary(monthStart: string): Promise<{
    total_outstanding: string | number;
    employees_holding: number | string;
    advanced_month: string | number;
    returned_month: string | number;
    owed: string | number;
  }> {
    const db = this.db;
    const [balances, month, owed] = await Promise.all([
      db
        .from(
          db("employee_account_entries as x")
            .whereNull("x.voided_at")
            .groupBy("x.employee_id")
            .select(db.raw("SUM(x.amount) AS balance"))
            .as("b")
        )
        .where("b.balance", ">", 0)
        .first(db.raw("COALESCE(SUM(b.balance), 0) AS total_outstanding"), db.raw("COUNT(*) AS employees_holding")),
      db("employee_account_entries")
        .whereNull("voided_at")
        .where("entry_date", ">=", monthStart)
        .first(
          db.raw("COALESCE(SUM(CASE WHEN type = 'advance' THEN amount END), 0) AS advanced_month"),
          db.raw("COALESCE(-SUM(CASE WHEN type = 'return' THEN amount END), 0) AS returned_month")
        ),
      db("payable_bills")
        .where({ payee_type: "employee" })
        .whereIn("status", ["open", "partially_paid"])
        .whereNull("deleted_at")
        .first(db.raw("COALESCE(SUM(total_amount - amount_paid), 0) AS owed")),
    ]);
    return { ...balances, ...month, ...owed };
  }
}

export const employeeAccountRepository = new EmployeeAccountRepository();
