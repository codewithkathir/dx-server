import { Router } from "express";
import { authenticateEmployee } from "../../middlewares/employee-auth.middleware";
import { sanitizeExpenseBody } from "../../middlewares/sanitize-expense-body.middleware";
import { optionalExpenseSupportFileUpload } from "../../middlewares/upload.middleware";
import { requireEmployeeRole } from "../../middlewares/role.middleware";
import { validate } from "../../middlewares/validation.middleware";
import { expenseController } from "./expense.controller";
import {
  createExpenseSchema,
  expenseListQuerySchema,
  idParamSchema,
  updateExpenseSchema,
} from "./expense.validation";

const expenseRoutes = Router();

expenseRoutes.use(authenticateEmployee, requireEmployeeRole());

expenseRoutes.get(
  "/",
  validate(expenseListQuerySchema, "query"),
  expenseController.listMyExpenses
);

expenseRoutes.post(
  "/",
  optionalExpenseSupportFileUpload,
  sanitizeExpenseBody,
  validate(createExpenseSchema, "body"),
  expenseController.createExpense
);

expenseRoutes.get(
  "/:id/support-file",
  validate(idParamSchema, "params"),
  expenseController.streamSupportFile
);

expenseRoutes.get(
  "/:id",
  validate(idParamSchema, "params"),
  expenseController.getMyExpenseById
);

expenseRoutes.put(
  "/:id",
  validate(idParamSchema, "params"),
  optionalExpenseSupportFileUpload,
  sanitizeExpenseBody,
  validate(updateExpenseSchema, "body"),
  expenseController.updateExpense
);

expenseRoutes.delete(
  "/:id",
  validate(idParamSchema, "params"),
  expenseController.deleteExpense
);

export default expenseRoutes;
