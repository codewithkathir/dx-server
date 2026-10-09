import type { Request, Response } from "express";
import { asyncHandler } from "../../shared/utils/async-handler";
import {
  paginationResponse,
  successResponse,
} from "../../shared/responses/response.handler";
import type { IdParam } from "../../shared/validators/common.validation";
import { adminExpenseService } from "./admin-expense.service";
import type {
  AdminExpenseListQueryParams,
  AdminExpenseSummaryQueryParams,
  UpdateAdminExpenseStatusBody,
  ApproveExpenseBody,
  RejectExpenseBody,
} from "./admin-expense.validation";

class AdminExpenseController {
  listExpenses = asyncHandler(async (req: Request, res: Response) => {
    const query = req.validated!.query as AdminExpenseListQueryParams;
    const result = await adminExpenseService.listExpenses(query);
    paginationResponse(
      res,
      result.data,
      result.meta,
      "Expenses fetched successfully"
    );
  });

  getSummary = asyncHandler(async (req: Request, res: Response) => {
    const query = req.validated!.query as AdminExpenseSummaryQueryParams;
    const summary = await adminExpenseService.getSummary(query);
    successResponse(res, summary, "Expense summary fetched successfully");
  });

  getExpenseById = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.validated!.params as IdParam;
    const expense = await adminExpenseService.getExpenseById(id);
    successResponse(res, expense, "Expense fetched successfully");
  });

  streamSupportFile = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.validated!.params as IdParam;
    const file = await adminExpenseService.getSupportFile(id);
    res.setHeader("Content-Type", file.contentType);
    res.setHeader(
      "Content-Disposition",
      `inline; filename="${encodeURIComponent(file.filename)}"`
    );
    res.sendFile(file.absolutePath);
  });

  updateExpenseStatus = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.validated!.params as IdParam;
    const body = req.validated!.body as UpdateAdminExpenseStatusBody;
    const expense = await adminExpenseService.updateExpenseStatus(
      id,
      { adminStatus: body.adminStatus },
      req.user?.id
    );
    successResponse(res, expense, "Expense status updated successfully");
  });

  approveExpense = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.validated!.params as IdParam;
    const { note } = req.validated!.body as ApproveExpenseBody;
    const expense = await adminExpenseService.approveExpense(id, req.user?.id, note);
    successResponse(res, expense, "Expense approved; reimbursement bill created");
  });

  rejectExpense = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.validated!.params as IdParam;
    const { note } = req.validated!.body as RejectExpenseBody;
    const expense = await adminExpenseService.rejectExpense(id, req.user?.id, note);
    successResponse(res, expense, "Expense rejected");
  });

  deleteExpense = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.validated!.params as IdParam;
    await adminExpenseService.deleteExpense(id, req.user?.id);
    successResponse(res, null, "Expense deleted successfully");
  });
}

export const adminExpenseController = new AdminExpenseController();
