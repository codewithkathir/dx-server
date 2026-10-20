import type { ExpenseReimbursement } from "../payables/payable.types";
import type { ExpenseStage } from "../../shared/constants/expense";
import type {
  AdminExpenseStatus,
  EmployeeExpenseStatus,
} from "../../shared/constants/expense";
import type { ListQueryOptions } from "../../shared/utils/query-builder";

export interface ExpenseRow {
  id: number;
  employee_id: number;
  date: string;
  amount: string;
  whom: number;
  category_id: number;
  sub_category_id: number;
  sub_sub_category_id: number | null;
  description: string | null;
  payment_method_id: number;
  support_file: string | null;
  /** Vehicle the claim was for (vehicle categories). */
  asset_id: number | null;
  odometer_km: number | null;
  /** Approved claims: part covered by the employee's advance / part reimbursed via Payables. */
  advance_amount: string;
  reimbursable_amount: string | null;
  employee_status: EmployeeExpenseStatus;
  admin_status: AdminExpenseStatus;
  review_note: string | null;
  reviewed_at: Date | null;
  reviewed_by: number | null;
  created_at: Date;
  updated_at: Date;
  deleted_at: Date | null;
}

export interface ExpensePublic {
  id: number;
  employeeId: number;
  date: string;
  amount: number;
  whom: number;
  categoryId: number;
  subCategoryId: number;
  subSubCategoryId: number | null;
  description: string | null;
  paymentMethodId: number;
  supportFile: string | null;
  assetId: number | null;
  odometerKm: number | null;
  /** Registration and name of `assetId` (list/detail responses). */
  vehicle?: { assetNo: string; name: string } | null;
  /** Part of the claim taken from the employee's advance (0 until approved). */
  advanceAmount: number;
  /** Part reimbursed through Payables; null until approved. */
  reimbursableAmount: number | null;
  employeeStatus: EmployeeExpenseStatus;
  adminStatus: AdminExpenseStatus;
  /** Admin's note to the employee on approval or rejection. */
  reviewNote: string | null;
  reviewedAt: Date | null;
  /** The payable bill created when the expense was approved (list/detail responses). */
  reimbursement?: ExpenseReimbursement | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface AdminExpenseFilterQuery {
  employeeId?: number;
  assetId?: number;
  adminStatus?: AdminExpenseStatus;
  stage?: ExpenseStage;
  categoryId?: number;
  dateFrom?: string;
  dateTo?: string;
}

export interface AdminExpenseListQuery
  extends ListQueryOptions,
    AdminExpenseFilterQuery {}

export interface AdminExpenseSummary {
  totalCount: number;
  totalAmount: number;
  byStatus: Array<{
    adminStatus: AdminExpenseStatus;
    count: number;
    amount: number;
  }>;
}

export interface UpdateAdminExpenseStatusInput {
  adminStatus: AdminExpenseStatus;
}

export interface ExpenseListQuery extends ListQueryOptions {
  stage?: ExpenseStage;
  categoryId?: number;
  dateFrom?: string;
  dateTo?: string;
}

export interface CreateExpenseInput {
  date: string;
  amount: number;
  whom?: number;
  categoryId: number;
  subCategoryId: number;
  subSubCategoryId?: number | null;
  description?: string | null;
  paymentMethodId: number;
  supportFile?: string | null;
  assetId?: number | null;
  odometerKm?: number | null;
}

export interface UpdateExpenseInput {
  date?: string;
  amount?: number;
  whom?: number;
  categoryId?: number;
  subCategoryId?: number;
  subSubCategoryId?: number | null;
  description?: string | null;
  paymentMethodId?: number;
  supportFile?: string | null;
  assetId?: number | null;
  odometerKm?: number | null;
}

/** Admin correction of the vehicle (and km) on a claim. */
export interface UpdateExpenseVehicleInput {
  assetId: number | null;
  odometerKm: number | null;
}

export interface StageTotals {
  count: number;
  amount: number;
}

/** Employee home: claims per stage, what is still owed back, and what was paid this year. */
export interface EmployeeExpenseSummary {
  stages: Record<ExpenseStage, StageTotals>;
  toBeReimbursed: StageTotals;
  paidThisYear: number;
}
