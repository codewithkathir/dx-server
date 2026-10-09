import type { Request, Response } from "express";
import { asyncHandler } from "../../shared/utils/async-handler";
import {
  createdResponse,
  paginationResponse,
  successResponse,
} from "../../shared/responses/response.handler";
import type { IdParam } from "../../shared/validators/common.validation";
import { receivableService } from "./receivable.service";
import type {
  CreateInvoiceBody,
  InvoiceListQueryParams,
  ReceiptIdParam,
  RecordReceiptBody,
  UpdateInvoiceBody,
} from "./receivable.validation";

class ReceivableController {
  listInvoices = asyncHandler(async (req: Request, res: Response) => {
    const query = req.validated!.query as InvoiceListQueryParams;
    const result = await receivableService.listInvoices(query);
    paginationResponse(res, result.data, result.meta, "Invoices fetched successfully");
  });

  getSummary = asyncHandler(async (_req: Request, res: Response) => {
    successResponse(res, await receivableService.getSummary(), "Receivables summary fetched successfully");
  });

  getInvoice = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.validated!.params as IdParam;
    successResponse(res, await receivableService.getInvoice(id), "Invoice fetched successfully");
  });

  createInvoice = asyncHandler(async (req: Request, res: Response) => {
    const body = req.validated!.body as CreateInvoiceBody;
    createdResponse(res, await receivableService.createInvoice(body, req.user?.id), "Invoice created successfully");
  });

  updateInvoice = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.validated!.params as IdParam;
    const body = req.validated!.body as UpdateInvoiceBody;
    successResponse(res, await receivableService.updateInvoice(id, body, req.user?.id), "Invoice updated successfully");
  });

  sendInvoice = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.validated!.params as IdParam;
    successResponse(res, await receivableService.sendInvoice(id, req.user?.id), "Invoice marked as sent");
  });

  cancelInvoice = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.validated!.params as IdParam;
    successResponse(res, await receivableService.cancelInvoice(id, req.user?.id), "Invoice cancelled successfully");
  });

  recordReceipt = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.validated!.params as IdParam;
    const body = req.validated!.body as RecordReceiptBody;
    createdResponse(res, await receivableService.recordReceipt(id, body, req.user?.id), "Receipt recorded successfully");
  });

  deleteReceipt = asyncHandler(async (req: Request, res: Response) => {
    const { id, receiptId } = req.validated!.params as ReceiptIdParam;
    successResponse(res, await receivableService.deleteReceipt(id, receiptId, req.user?.id), "Receipt deleted successfully");
  });

  downloadPdf = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.validated!.params as IdParam;
    const { filename, document } = await receivableService.getInvoicePdf(id);
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `inline; filename="${encodeURIComponent(filename)}"`);
    document.pipe(res);
    document.end();
  });
}

export const receivableController = new ReceivableController();
