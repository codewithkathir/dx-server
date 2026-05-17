import type { Request, Response } from "express";
import { asyncHandler } from "../../shared/utils/async-handler";
import {
  createdResponse,
  paginationResponse,
  successResponse,
} from "../../shared/responses/response.handler";
import type { IdParam } from "../../shared/validators/common.validation";
import { paymentMethodService } from "./payment-method.service";
import type {
  CreatePaymentMethodBody,
  PaymentMethodListQueryParams,
  UpdatePaymentMethodBody,
} from "./payment-method.validation";

class PaymentMethodController {
  listPaymentMethods = asyncHandler(async (req: Request, res: Response) => {
    const query = req.validated!.query as PaymentMethodListQueryParams;
    const result = await paymentMethodService.listPaymentMethods(query);
    paginationResponse(
      res,
      result.data,
      result.meta,
      "Payment methods fetched successfully"
    );
  });

  getPaymentMethodById = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.validated!.params as IdParam;
    const item = await paymentMethodService.getPaymentMethodById(id);
    successResponse(res, item, "Payment method fetched successfully");
  });

  createPaymentMethod = asyncHandler(async (req: Request, res: Response) => {
    const body = req.validated!.body as CreatePaymentMethodBody;
    const item = await paymentMethodService.createPaymentMethod(
      body,
      req.user?.id
    );
    createdResponse(res, item, "Payment method created successfully");
  });

  updatePaymentMethod = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.validated!.params as IdParam;
    const body = req.validated!.body as UpdatePaymentMethodBody;
    const item = await paymentMethodService.updatePaymentMethod(
      id,
      body,
      req.user?.id
    );
    successResponse(res, item, "Payment method updated successfully");
  });

  deletePaymentMethod = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.validated!.params as IdParam;
    await paymentMethodService.deletePaymentMethod(id, req.user?.id);
    successResponse(res, null, "Payment method deleted successfully");
  });
}

export const paymentMethodController = new PaymentMethodController();
