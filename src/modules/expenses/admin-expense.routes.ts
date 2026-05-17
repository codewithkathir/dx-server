import { Router } from "express";
import { authenticateAdmin } from "../../middlewares/admin-auth.middleware";
import { requireAdminRole } from "../../middlewares/role.middleware";
import { requirePermission } from "../../middlewares/permission.middleware";
import { validate } from "../../middlewares/validation.middleware";
import { Permissions } from "../../shared/constants/permissions";
import { adminExpenseController } from "./admin-expense.controller";
import {
  adminExpenseListQuerySchema,
  adminExpenseSummaryQuerySchema,
  idParamSchema,
  updateAdminExpenseStatusSchema,
} from "./admin-expense.validation";

const adminExpenseRoutes = Router();

adminExpenseRoutes.use(authenticateAdmin, requireAdminRole());

adminExpenseRoutes.get(
  "/summary",
  requirePermission(Permissions.EMPLOYEE_EXPENSE_READ),
  validate(adminExpenseSummaryQuerySchema, "query"),
  adminExpenseController.getSummary
);

adminExpenseRoutes.get(
  "/",
  requirePermission(Permissions.EMPLOYEE_EXPENSE_READ),
  validate(adminExpenseListQuerySchema, "query"),
  adminExpenseController.listExpenses
);

adminExpenseRoutes.get(
  "/:id/support-file",
  requirePermission(Permissions.EMPLOYEE_EXPENSE_READ),
  validate(idParamSchema, "params"),
  adminExpenseController.streamSupportFile
);

adminExpenseRoutes.get(
  "/:id",
  requirePermission(Permissions.EMPLOYEE_EXPENSE_READ),
  validate(idParamSchema, "params"),
  adminExpenseController.getExpenseById
);

adminExpenseRoutes.put(
  "/:id/status",
  requirePermission(Permissions.EMPLOYEE_EXPENSE_UPDATE),
  validate(idParamSchema, "params"),
  validate(updateAdminExpenseStatusSchema, "body"),
  adminExpenseController.updateExpenseStatus
);

adminExpenseRoutes.delete(
  "/:id",
  requirePermission(Permissions.EMPLOYEE_EXPENSE_DELETE),
  validate(idParamSchema, "params"),
  adminExpenseController.deleteExpense
);

export default adminExpenseRoutes;
