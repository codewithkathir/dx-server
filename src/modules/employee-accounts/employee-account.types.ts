import type { AccountEntryType } from "../../shared/constants/employee-account";

export interface AccountEntryRow {
  id: number;
  employee_id: number;
  entry_date: string;
  type: AccountEntryType;
  /** Signed DECIMAL string. */
  amount: string;
  expense_id: number | null;
  payment_method_id: number | null;
  reference: string | null;
  notes: string | null;
  created_by: number | null;
  created_at: Date;
  voided_at: Date | null;
  voided_by: number | null;
  void_reason: string | null;
}

/** A statement line: the entry, its running balance and what it refers to. */
export interface AccountEntryListRow extends AccountEntryRow {
  running_balance: string | number;
  payment_method_name: string | null;
  created_by_name: string | null;
  voided_by_name: string | null;
  expense_description: string | null;
  expense_amount: string | null;
  category_name: string | null;
  sub_category_name: string | null;
}

export interface AccountEntryPublic {
  id: number;
  employeeId: number;
  entryDate: string;
  type: AccountEntryType;
  amount: number;
  /** Balance after this entry (voided entries count as zero). */
  runningBalance: number;
  expenseId: number | null;
  /** For claims: "Fuel › Petrol", and the claim total (the entry may be part of it). */
  expenseLabel: string | null;
  expenseAmount: number | null;
  paymentMethodId: number | null;
  paymentMethodName: string | null;
  reference: string | null;
  notes: string | null;
  createdByName: string | null;
  createdAt: Date;
  voidedAt: Date | null;
  voidedByName: string | null;
  voidReason: string | null;
}

export interface AccountListRow {
  employee_id: number;
  emp_name: string;
  employee_code: string | null;
  status: string;
  balance: string | number;
  total_advanced: string | number;
  last_entry_date: string | null;
  pending_count: number | string;
  pending_amount: string | number;
  owed_amount: string | number;
}

export interface EmployeeAccountPublic {
  employeeId: number;
  employeeName: string;
  employeeCode: string | null;
  employeeStatus: string;
  /** Company money the employee is holding (advances not yet spent or returned). */
  balance: number;
  totalAdvanced: number;
  lastActivity: string | null;
  /** Claims waiting for approval; they will draw on the balance first. */
  pendingClaims: { count: number; amount: number };
  /** Open reimbursement bills: what the company still has to pay the employee. */
  owedToEmployee: number;
}

export interface EmployeeAccountsSummary {
  /** Sum of positive balances: advances still out with employees. */
  totalOutstanding: number;
  employeesHolding: number;
  advancedThisMonth: number;
  returnedThisMonth: number;
  owedToEmployees: number;
}

/** How an approval splits a claim between the advance and Payables. */
export interface ExpenseSettlement {
  balanceBefore: number;
  fromAdvance: number;
  reimbursable: number;
}

export interface ApprovalPreview extends ExpenseSettlement {
  expenseId: number;
  amount: number;
  balanceAfter: number;
}
