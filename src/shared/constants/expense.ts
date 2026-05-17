export const EmployeeExpenseStatuses = [
  "pending",
  "approved",
  "rejected",
] as const;

export type EmployeeExpenseStatus =
  (typeof EmployeeExpenseStatuses)[number];

export const DEFAULT_EMPLOYEE_EXPENSE_STATUS: EmployeeExpenseStatus = "pending";

export const AdminExpenseStatuses = ["pending", "paid", "rejected"] as const;

export type AdminExpenseStatus = (typeof AdminExpenseStatuses)[number];

export const DEFAULT_ADMIN_EXPENSE_STATUS: AdminExpenseStatus = "pending";
