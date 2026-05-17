import type { Request, Response } from "express";
import { getExpenseSupportFilePath } from "../../middlewares/upload.middleware";
import { asyncHandler } from "../../shared/utils/async-handler";
import {
  createdResponse,
  paginationResponse,
  successResponse,
} from "../../shared/responses/response.handler";
import type { IdParam } from "../../shared/validators/common.validation";
import { expenseService } from "./expense.service";
import type {
  CreateExpenseBody,
  ExpenseListQueryParams,
  UpdateExpenseBody,
} from "./expense.validation";

class ExpenseController {
  private getEmployeeId(req: Request): number {
    return req.user!.id;
  }

  listMyExpenses = asyncHandler(async (req: Request, res: Response) => {
    const query = req.validated!.query as ExpenseListQueryParams;
    const result = await expenseService.listMyExpenses(
      this.getEmployeeId(req),
      query
    );
    paginationResponse(
      res,
      result.data,
      result.meta,
      "Expenses fetched successfully"
    );
  });

  getMyExpenseById = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.validated!.params as IdParam;
    const expense = await expenseService.getMyExpenseById(
      this.getEmployeeId(req),
      id
    );
    successResponse(res, expense, "Expense fetched successfully");
  });

  streamSupportFile = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.validated!.params as IdParam;
    const file = await expenseService.getSupportFileForEmployee(
      this.getEmployeeId(req),
      id
    );
    res.setHeader("Content-Type", file.contentType);
    res.setHeader(
      "Content-Disposition",
      `inline; filename="${encodeURIComponent(file.filename)}"`
    );
    res.sendFile(file.absolutePath);
  });

  createExpense = asyncHandler(async (req: Request, res: Response) => {
    const body = req.validated!.body as CreateExpenseBody;
    const supportFile = getExpenseSupportFilePath(req.file);
    const expense = await expenseService.createExpense(this.getEmployeeId(req), {
      ...body,
      supportFile,
    });
    createdResponse(res, expense, "Expense created successfully");
  });

  updateExpense = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.validated!.params as IdParam;
    const body = req.validated!.body as UpdateExpenseBody;
    const uploadedPath = getExpenseSupportFilePath(req.file);
    const payload =
      uploadedPath !== null ? { ...body, supportFile: uploadedPath } : body;
    const expense = await expenseService.updateExpense(
      this.getEmployeeId(req),
      id,
      payload
    );
    successResponse(res, expense, "Expense updated successfully");
  });

  deleteExpense = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.validated!.params as IdParam;
    await expenseService.deleteExpense(this.getEmployeeId(req), id);
    successResponse(res, null, "Expense deleted successfully");
  });
}

export const expenseController = new ExpenseController();
