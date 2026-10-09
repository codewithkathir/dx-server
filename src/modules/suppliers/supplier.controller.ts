import type { Request, Response } from "express";
import { asyncHandler } from "../../shared/utils/async-handler";
import {
  createdResponse,
  paginationResponse,
  successResponse,
} from "../../shared/responses/response.handler";
import type { IdParam } from "../../shared/validators/common.validation";
import { supplierService } from "./supplier.service";
import type {
  CreateSupplierBody,
  SupplierListQueryParams,
  UpdateSupplierBody,
} from "./supplier.validation";

class SupplierController {
  listSuppliers = asyncHandler(async (req: Request, res: Response) => {
    const query = req.validated!.query as SupplierListQueryParams;
    const result = await supplierService.listSuppliers(query);
    paginationResponse(res, result.data, result.meta, "Suppliers fetched successfully");
  });

  listOptions = asyncHandler(async (_req: Request, res: Response) => {
    const options = await supplierService.listOptions();
    successResponse(res, options, "Supplier options fetched successfully");
  });

  getSupplierById = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.validated!.params as IdParam;
    const supplier = await supplierService.getSupplierById(id);
    successResponse(res, supplier, "Supplier fetched successfully");
  });

  createSupplier = asyncHandler(async (req: Request, res: Response) => {
    const body = req.validated!.body as CreateSupplierBody;
    const supplier = await supplierService.createSupplier(body, req.user?.id);
    createdResponse(res, supplier, "Supplier created successfully");
  });

  updateSupplier = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.validated!.params as IdParam;
    const body = req.validated!.body as UpdateSupplierBody;
    const supplier = await supplierService.updateSupplier(id, body, req.user?.id);
    successResponse(res, supplier, "Supplier updated successfully");
  });

  deleteSupplier = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.validated!.params as IdParam;
    await supplierService.deleteSupplier(id, req.user?.id);
    successResponse(res, null, "Supplier deleted successfully");
  });
}

export const supplierController = new SupplierController();
