import type { Request, Response } from "express";
import { getBillAttachmentPath } from "../../middlewares/upload.middleware";
import { asyncHandler } from "../../shared/utils/async-handler";
import {
  createdResponse,
  paginationResponse,
  successResponse,
} from "../../shared/responses/response.handler";
import type { IdParam } from "../../shared/validators/common.validation";
import { payableService } from "./payable.service";
import type {
  BillListQueryParams,
  CreateBillBody,
  PaymentIdParam,
  RecordPaymentBody,
  UpdateBillBody,
} from "./payable.validation";

class PayableController {
  listBills = asyncHandler(async (req: Request, res: Response) => {
    const query = req.validated!.query as BillListQueryParams;
    const result = await payableService.listBills(query);
    paginationResponse(res, result.data, result.meta, "Bills fetched successfully");
  });

  getSummary = asyncHandler(async (_req: Request, res: Response) => {
    const summary = await payableService.getSummary();
    successResponse(res, summary, "Payables summary fetched successfully");
  });

  getBill = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.validated!.params as IdParam;
    successResponse(res, await payableService.getBill(id), "Bill fetched successfully");
  });

  createBill = asyncHandler(async (req: Request, res: Response) => {
    const body = req.validated!.body as CreateBillBody;
    createdResponse(res, await payableService.createBill(body, req.user?.id), "Bill created successfully");
  });

  updateBill = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.validated!.params as IdParam;
    const body = req.validated!.body as UpdateBillBody;
    successResponse(res, await payableService.updateBill(id, body, req.user?.id), "Bill updated successfully");
  });

  streamAttachment = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.validated!.params as IdParam;
    const file = await payableService.getAttachmentFile(id);
    res.setHeader("Content-Type", file.contentType);
    res.setHeader("Content-Disposition", `inline; filename="${encodeURIComponent(file.filename)}"`);
    res.sendFile(file.absolutePath);
  });

  uploadAttachment = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.validated!.params as IdParam;
    const filePath = getBillAttachmentPath(req.file) as string;
    successResponse(res, await payableService.setAttachment(id, filePath, req.user?.id), "Attachment uploaded successfully");
  });

  removeAttachment = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.validated!.params as IdParam;
    successResponse(res, await payableService.removeAttachment(id, req.user?.id), "Attachment removed successfully");
  });

  issueBill = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.validated!.params as IdParam;
    successResponse(res, await payableService.issueBill(id, req.user?.id), "Bill issued successfully");
  });

  cancelBill = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.validated!.params as IdParam;
    successResponse(res, await payableService.cancelBill(id, req.user?.id), "Bill cancelled successfully");
  });

  deleteBill = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.validated!.params as IdParam;
    await payableService.deleteBill(id, req.user?.id);
    successResponse(res, null, "Bill deleted successfully");
  });

  recordPayment = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.validated!.params as IdParam;
    const body = req.validated!.body as RecordPaymentBody;
    createdResponse(res, await payableService.recordPayment(id, body, req.user?.id), "Payment recorded successfully");
  });

  deletePayment = asyncHandler(async (req: Request, res: Response) => {
    const { id, paymentId } = req.validated!.params as PaymentIdParam;
    successResponse(res, await payableService.deletePayment(id, paymentId, req.user?.id), "Payment deleted successfully");
  });
}

export const payableController = new PayableController();
