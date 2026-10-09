import type { Request, Response } from "express";
import { asyncHandler } from "../../shared/utils/async-handler";
import {
  createdResponse,
  paginationResponse,
  successResponse,
} from "../../shared/responses/response.handler";
import type { IdParam } from "../../shared/validators/common.validation";
import { customerService } from "./customer.service";
import type {
  CreateCustomerBody,
  CustomerListQueryParams,
  UpdateCustomerBody,
} from "./customer.validation";

class CustomerController {
  listCustomers = asyncHandler(async (req: Request, res: Response) => {
    const query = req.validated!.query as CustomerListQueryParams;
    const result = await customerService.listCustomers(query);
    paginationResponse(res, result.data, result.meta, "Customers fetched successfully");
  });

  listOptions = asyncHandler(async (_req: Request, res: Response) => {
    const options = await customerService.listOptions();
    successResponse(res, options, "Customer options fetched successfully");
  });

  getCustomerById = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.validated!.params as IdParam;
    const customer = await customerService.getCustomerById(id);
    successResponse(res, customer, "Customer fetched successfully");
  });

  createCustomer = asyncHandler(async (req: Request, res: Response) => {
    const body = req.validated!.body as CreateCustomerBody;
    const customer = await customerService.createCustomer(body, req.user?.id);
    createdResponse(res, customer, "Customer created successfully");
  });

  updateCustomer = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.validated!.params as IdParam;
    const body = req.validated!.body as UpdateCustomerBody;
    const customer = await customerService.updateCustomer(id, body, req.user?.id);
    successResponse(res, customer, "Customer updated successfully");
  });

  deleteCustomer = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.validated!.params as IdParam;
    await customerService.deleteCustomer(id, req.user?.id);
    successResponse(res, null, "Customer deleted successfully");
  });
}

export const customerController = new CustomerController();
