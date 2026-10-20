import type { Knex } from "knex";
import { db } from "../../database/knex";
import { ManualAccountEntryTypes, type ManualAccountEntryType } from "../../shared/constants/employee-account";
import { ApiError } from "../../shared/errors/api.error";
import { ErrorCodes } from "../../shared/errors/error-codes";
import { logger } from "../../shared/logger/logger";
import { filsToDecimalString, fromFils, isFutureDate, todayIso, toFils } from "../../shared/utils/money.util";
import { buildPaginationMeta } from "../../shared/utils/pagination.util";
import { paymentMethodRepository } from "../payment-methods/payment-method.repository";
import { employeeAccountRepository } from "./employee-account.repository";
import type {
  AccountEntryListRow,
  AccountEntryPublic,
  AccountListRow,
  ApprovalPreview,
  EmployeeAccountPublic,
  EmployeeAccountsSummary,
  ExpenseSettlement,
} from "./employee-account.types";
import type {
  AccountListQueryParams,
  AdjustmentBody,
  CashEntryBody,
  EntryListQueryParams,
} from "./employee-account.validation";

const badRequest = (message: string) => new ApiError(message, ErrorCodes.VALIDATION_ERROR, 400);
const conflict = (message: string) => new ApiError(message, ErrorCodes.CONFLICT, 409);
const notFound = (message: string) => new ApiError(message, ErrorCodes.NOT_FOUND, 404);

const dateOnly = (value: string | Date | null): string | null =>
  value === null ? null : typeof value === "string" ? value.slice(0, 10) : value.toISOString().slice(0, 10);
/** DECIMAL strings and SUM()s → number with 2 decimals, without float drift. */
const money = (value: string | number | null | undefined): number => fromFils(toFils(Number(value ?? 0).toFixed(2)));
const aed = (fils: number) => `AED ${filsToDecimalString(fils)}`;

const toAccount = (row: AccountListRow): EmployeeAccountPublic => ({
  employeeId: row.employee_id,
  employeeName: row.emp_name,
  employeeCode: row.employee_code,
  employeeStatus: row.status,
  balance: money(row.balance),
  totalAdvanced: money(row.total_advanced),
  lastActivity: dateOnly(row.last_entry_date),
  pendingClaims: { count: Number(row.pending_count), amount: money(row.pending_amount) },
  owedToEmployee: money(row.owed_amount),
});

const toEntry = (row: AccountEntryListRow): AccountEntryPublic => ({
  id: row.id,
  employeeId: row.employee_id,
  entryDate: dateOnly(row.entry_date) as string,
  type: row.type,
  amount: money(row.amount),
  runningBalance: money(row.running_balance),
  expenseId: row.expense_id,
  expenseLabel: row.category_name ? [row.category_name, row.sub_category_name].filter(Boolean).join(" › ") : null,
  expenseAmount: row.expense_amount === null ? null : money(row.expense_amount),
  paymentMethodId: row.payment_method_id,
  paymentMethodName: row.payment_method_name,
  reference: row.reference,
  notes: row.notes,
  createdByName: row.created_by_name,
  createdAt: row.created_at,
  voidedAt: row.voided_at,
  voidedByName: row.voided_by_name,
  voidReason: row.void_reason,
});

/** The claim columns settlement needs (an ExpenseRow fits). */
export interface ExpenseForSettlement {
  id: number;
  employee_id: number;
  amount: string | number;
  description: string | null;
}

class EmployeeAccountService {
  /** Split a claim: the advance covers what it can, the rest is reimbursed. */
  private split(amountFils: number, balanceFils: number, useAdvance: boolean): { fromAdvance: number; reimbursable: number } {
    const fromAdvance = useAdvance ? Math.min(amountFils, Math.max(balanceFils, 0)) : 0;
    return { fromAdvance, reimbursable: amountFils - fromAdvance };
  }

  // ── Admin: accounts and statements ─────────────────────────────────────────

  async listAccounts(query: AccountListQueryParams) {
    const { data, total } = await employeeAccountRepository.findAccounts(query);
    return { data: data.map(toAccount), meta: buildPaginationMeta(query.page, query.limit, total) };
  }

  async getAccount(employeeId: number): Promise<EmployeeAccountPublic> {
    const row = await employeeAccountRepository.findAccount(employeeId);
    if (!row) throw notFound("Employee not found");
    return toAccount(row);
  }

  async listEntries(employeeId: number, query: EntryListQueryParams) {
    await this.getAccount(employeeId);
    const { data, total } = await employeeAccountRepository.findEntries(employeeId, query);
    return { data: data.map(toEntry), meta: buildPaginationMeta(query.page, query.limit, total) };
  }

  async summary(): Promise<EmployeeAccountsSummary> {
    const row = await employeeAccountRepository.summary(`${todayIso().slice(0, 7)}-01`);
    return {
      totalOutstanding: money(row.total_outstanding),
      employeesHolding: Number(row.employees_holding ?? 0),
      advancedThisMonth: money(row.advanced_month),
      returnedThisMonth: money(row.returned_month),
      owedToEmployees: money(row.owed),
    };
  }

  // ── Admin: entries ─────────────────────────────────────────────────────────

  private async assertPaymentMethod(id: number): Promise<void> {
    const method = await paymentMethodRepository.findById(id);
    if (!method || method.status !== "active") throw notFound("Payment method not found");
  }

  /** Money given to the employee (advance) or handed back (return). */
  async addCashEntry(
    employeeId: number,
    type: "advance" | "return",
    input: CashEntryBody,
    createdBy?: number
  ): Promise<EmployeeAccountPublic> {
    if (isFutureDate(input.entryDate)) throw badRequest("The date can't be in the future");
    await this.assertPaymentMethod(input.paymentMethodId);
    const amount = toFils(input.amount);
    await db.transaction(async (trx) => {
      const employee = await employeeAccountRepository.lockEmployee(trx, employeeId);
      if (!employee) throw notFound("Employee not found");
      if (type === "advance" && employee.status !== "active") throw badRequest("Advances can only be given to active employees");
      if (type === "return") {
        const balance = toFils(await employeeAccountRepository.balance(employeeId, trx));
        if (amount > balance) throw badRequest(`The employee only holds ${aed(Math.max(balance, 0))}`);
      }
      await employeeAccountRepository.insertEntry(trx, {
        employee_id: employeeId,
        entry_date: input.entryDate,
        type,
        amount: filsToDecimalString(type === "advance" ? amount : -amount),
        expense_id: null,
        payment_method_id: input.paymentMethodId,
        reference: input.reference ?? null,
        notes: input.notes ?? null,
        created_by: createdBy ?? null,
      });
    });
    logger.info({ employeeId, type, amount: input.amount, createdBy }, "Employee account entry added");
    return this.getAccount(employeeId);
  }

  async addAdjustment(employeeId: number, input: AdjustmentBody, createdBy?: number): Promise<EmployeeAccountPublic> {
    if (isFutureDate(input.entryDate)) throw badRequest("The date can't be in the future");
    const amount = toFils(input.amount);
    await db.transaction(async (trx) => {
      if (!(await employeeAccountRepository.lockEmployee(trx, employeeId))) throw notFound("Employee not found");
      const balance = toFils(await employeeAccountRepository.balance(employeeId, trx));
      if (balance + amount < 0) throw badRequest(`The balance can't go below zero (it is ${aed(balance)})`);
      await employeeAccountRepository.insertEntry(trx, {
        employee_id: employeeId,
        entry_date: input.entryDate,
        type: "adjustment",
        amount: filsToDecimalString(amount),
        expense_id: null,
        payment_method_id: null,
        reference: null,
        notes: input.notes,
        created_by: createdBy ?? null,
      });
    });
    logger.info({ employeeId, amount: input.amount, createdBy }, "Employee account adjusted");
    return this.getAccount(employeeId);
  }

  /** Undo a mistaken advance, return or adjustment. Claim entries follow their claim instead. */
  async voidEntry(entryId: number, reason: string, voidedBy?: number): Promise<EmployeeAccountPublic> {
    const entry = await employeeAccountRepository.findEntry(entryId);
    if (!entry) throw notFound("Entry not found");
    if (!(ManualAccountEntryTypes as readonly string[]).includes(entry.type)) {
      throw conflict("This entry comes from an approved claim. Reject or delete the claim instead.");
    }
    if (entry.voided_at) throw conflict("This entry is already voided");
    await db.transaction(async (trx) => {
      await employeeAccountRepository.lockEmployee(trx, entry.employee_id);
      const balance = toFils(await employeeAccountRepository.balance(entry.employee_id, trx));
      if (balance - toFils(entry.amount) < 0) {
        throw conflict(
          `Voiding this would leave a negative balance: approved claims already used the money. Record a return or adjustment instead.`
        );
      }
      await employeeAccountRepository.voidEntry(trx, entryId, voidedBy ?? null, reason);
    });
    logger.info({ entryId, employeeId: entry.employee_id, type: entry.type as ManualAccountEntryType, voidedBy }, "Account entry voided");
    return this.getAccount(entry.employee_id);
  }

  // ── Claim settlement (used by the approval flow) ───────────────────────────

  /** What approving this claim now would take from the advance. */
  async previewSettlement(expense: ExpenseForSettlement): Promise<ApprovalPreview> {
    const amount = toFils(Number(expense.amount).toFixed(2));
    const balance = toFils(await employeeAccountRepository.balance(expense.employee_id));
    const { fromAdvance, reimbursable } = this.split(amount, balance, true);
    return {
      expenseId: expense.id,
      amount: fromFils(amount),
      balanceBefore: fromFils(balance),
      fromAdvance: fromFils(fromAdvance),
      reimbursable: fromFils(reimbursable),
      balanceAfter: fromFils(balance - fromAdvance),
    };
  }

  /**
   * Draws an approved claim from the employee's advance, inside the approval
   * transaction. Returns how much the advance covered and what is left to reimburse.
   */
  async settleExpense(
    trx: Knex.Transaction,
    expense: ExpenseForSettlement,
    useAdvance: boolean,
    approvedBy?: number
  ): Promise<ExpenseSettlement> {
    await employeeAccountRepository.lockEmployee(trx, expense.employee_id);
    if (await employeeAccountRepository.findLiveExpenseEntry(trx, expense.id)) {
      throw conflict("This claim was already settled from the advance");
    }
    const amount = toFils(Number(expense.amount).toFixed(2));
    const balance = toFils(await employeeAccountRepository.balance(expense.employee_id, trx));
    const { fromAdvance, reimbursable } = this.split(amount, balance, useAdvance);
    if (fromAdvance > 0) {
      await employeeAccountRepository.insertEntry(trx, {
        employee_id: expense.employee_id,
        entry_date: todayIso(),
        type: "expense",
        amount: filsToDecimalString(-fromAdvance),
        expense_id: expense.id,
        payment_method_id: null,
        reference: `Claim #${expense.id}`,
        notes: expense.description,
        created_by: approvedBy ?? null,
      });
    }
    return { balanceBefore: fromFils(balance), fromAdvance: fromFils(fromAdvance), reimbursable: fromFils(reimbursable) };
  }

  /** Rejecting or deleting a claim gives its advance share back. */
  async reverseExpense(trx: Knex.Transaction, expenseId: number, reason: string, by?: number): Promise<void> {
    const entry = await employeeAccountRepository.findLiveExpenseEntry(trx, expenseId);
    if (!entry) return;
    await employeeAccountRepository.lockEmployee(trx, entry.employee_id);
    await employeeAccountRepository.voidEntry(trx, entry.id, by ?? null, reason);
  }

  // ── Employee app ───────────────────────────────────────────────────────────

  async myAccount(employeeId: number): Promise<EmployeeAccountPublic> {
    return this.getAccount(employeeId);
  }

  async myEntries(employeeId: number, query: EntryListQueryParams) {
    return this.listEntries(employeeId, { ...query, includeVoided: false });
  }
}

export const employeeAccountService = new EmployeeAccountService();
