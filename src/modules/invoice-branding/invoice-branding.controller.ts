import type { Request, Response } from "express";
import { getBrandingImagePath } from "../../middlewares/upload.middleware";
import { successResponse } from "../../shared/responses/response.handler";
import { asyncHandler } from "../../shared/utils/async-handler";
import { invoiceBrandingService } from "./invoice-branding.service";
import type { BrandingImageParam, UpdateBrandingBody } from "./invoice-branding.validation";

class InvoiceBrandingController {
  get = asyncHandler(async (_req: Request, res: Response) => {
    successResponse(res, await invoiceBrandingService.get(), "Invoice branding fetched successfully");
  });

  update = asyncHandler(async (req: Request, res: Response) => {
    const body = req.validated!.body as UpdateBrandingBody;
    successResponse(res, await invoiceBrandingService.update(body, req.user?.id), "Invoice branding updated successfully");
  });

  uploadImage = asyncHandler(async (req: Request, res: Response) => {
    const { kind } = req.validated!.params as BrandingImageParam;
    const branding = await invoiceBrandingService.setImage(kind, getBrandingImagePath(req.file!), req.user?.id);
    successResponse(res, branding, "Image updated successfully");
  });

  removeImage = asyncHandler(async (req: Request, res: Response) => {
    const { kind } = req.validated!.params as BrandingImageParam;
    successResponse(res, await invoiceBrandingService.removeImage(kind, req.user?.id), "Image removed successfully");
  });

  streamImage = asyncHandler(async (req: Request, res: Response) => {
    const { kind } = req.validated!.params as BrandingImageParam;
    const file = await invoiceBrandingService.getImageFile(kind);
    res.setHeader("Content-Type", file.contentType);
    res.setHeader("Content-Disposition", `inline; filename="${encodeURIComponent(file.filename)}"`);
    res.setHeader("Cache-Control", "private, max-age=3600");
    res.sendFile(file.absolutePath);
  });
}

export const invoiceBrandingController = new InvoiceBrandingController();
