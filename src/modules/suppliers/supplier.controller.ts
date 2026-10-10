import type { Request, Response } from "express";
import { getPartyPhotoPath } from "../../middlewares/upload.middleware";
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

  uploadPhoto = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.validated!.params as IdParam;
    const supplier = await supplierService.setPhoto(id, getPartyPhotoPath("suppliers", req.file!), req.user?.id);
    successResponse(res, supplier, "Photo updated successfully");
  });

  removePhoto = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.validated!.params as IdParam;
    const supplier = await supplierService.removePhoto(id, req.user?.id);
    successResponse(res, supplier, "Photo removed successfully");
  });

  streamPhoto = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.validated!.params as IdParam;
    const file = await supplierService.getPhotoFile(id);
    res.setHeader("Content-Type", file.contentType);
    res.setHeader("Content-Disposition", `inline; filename="${encodeURIComponent(file.filename)}"`);
    res.setHeader("Cache-Control", "private, max-age=3600");
    res.sendFile(file.absolutePath);
  });
}

export const supplierController = new SupplierController();
