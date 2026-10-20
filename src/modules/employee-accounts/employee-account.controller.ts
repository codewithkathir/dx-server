import type { Request, Response } from "express";
import { asyncHandler } from "../../shared/utils/async-handler";
import { createdResponse, paginationResponse, successResponse } from "../../shared/responses/response.handler";
import { employeeAccountService } from "./employee-account.service";
import type {
  AccountListQueryParams,
  AdjustmentBody,
  CashEntryBody,
  EmployeeIdParam,
  EntryIdParam,
  EntryListQueryParams,
  VoidEntryBody,
} from "./employee-account.validation";

class EmployeeAccountController {
  list = asyncHandler(async (req: Request, res: Response) => {
    const result = await employeeAccountService.listAccounts(req.validated!.query as AccountListQueryParams);
    paginationResponse(res, result.data, result.meta, "Employee accounts fetched successfully");
  });

  summary = asyncHandler(async (_req: Request, res: Response) => {
    successResponse(res, await employeeAccountService.summary(), "Employee accounts summary fetched successfully");
  });

  getAccount = asyncHandler(async (req: Request, res: Response) => {
    const { employeeId } = req.validated!.params as EmployeeIdParam;
    successResponse(res, await employeeAccountService.getAccount(employeeId), "Employee account fetched successfully");
  });

  listEntries = asyncHandler(async (req: Request, res: Response) => {
    const { employeeId } = req.validated!.params as EmployeeIdParam;
    const result = await employeeAccountService.listEntries(employeeId, req.validated!.query as EntryListQueryParams);
    paginationResponse(res, result.data, result.meta, "Account entries fetched successfully");
  });

  addAdvance = asyncHandler(async (req: Request, res: Response) => {
    const { employeeId } = req.validated!.params as EmployeeIdParam;
    const account = await employeeAccountService.addCashEntry(employeeId, "advance", req.validated!.body as CashEntryBody, req.user?.id);
    createdResponse(res, account, "Advance recorded");
  });

  addReturn = asyncHandler(async (req: Request, res: Response) => {
    const { employeeId } = req.validated!.params as EmployeeIdParam;
    const account = await employeeAccountService.addCashEntry(employeeId, "return", req.validated!.body as CashEntryBody, req.user?.id);
    createdResponse(res, account, "Return recorded");
  });

  addAdjustment = asyncHandler(async (req: Request, res: Response) => {
    const { employeeId } = req.validated!.params as EmployeeIdParam;
    const account = await employeeAccountService.addAdjustment(employeeId, req.validated!.body as AdjustmentBody, req.user?.id);
    createdResponse(res, account, "Balance adjusted");
  });

  voidEntry = asyncHandler(async (req: Request, res: Response) => {
    const { entryId } = req.validated!.params as EntryIdParam;
    const { reason } = req.validated!.body as VoidEntryBody;
    successResponse(res, await employeeAccountService.voidEntry(entryId, reason, req.user?.id), "Entry voided");
  });

  /** Employee app */
  myAccount = asyncHandler(async (req: Request, res: Response) => {
    successResponse(res, await employeeAccountService.myAccount(req.user!.id), "Account fetched successfully");
  });

  myEntries = asyncHandler(async (req: Request, res: Response) => {
    const result = await employeeAccountService.myEntries(req.user!.id, req.validated!.query as EntryListQueryParams);
    paginationResponse(res, result.data, result.meta, "Account entries fetched successfully");
  });
}

export const employeeAccountController = new EmployeeAccountController();
