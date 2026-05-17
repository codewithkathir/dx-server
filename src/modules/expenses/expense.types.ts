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
  employee_status: EmployeeExpenseStatus;
  admin_status: AdminExpenseStatus;
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
  employeeStatus: EmployeeExpenseStatus;
  adminStatus: AdminExpenseStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface AdminExpenseFilterQuery {
  employeeId?: number;
  adminStatus?: AdminExpenseStatus;
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
  categoryId?: number;
  dateFrom?: string;
  dateTo?: string;
}

export interface CreateExpenseInput {
  date: string;
  amount: number;
  whom: number;
  categoryId: number;
  subCategoryId: number;
  subSubCategoryId?: number | null;
  description?: string | null;
  paymentMethodId: number;
  supportFile?: string | null;
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
}
