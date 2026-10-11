import { Router } from "express";
import { authenticateAdmin } from "../../middlewares/admin-auth.middleware";
import { requirePermission } from "../../middlewares/permission.middleware";
import { requireAdminRole } from "../../middlewares/role.middleware";
import { uploadBrandingImage } from "../../middlewares/upload.middleware";
import { validate } from "../../middlewares/validation.middleware";
import { Permissions } from "../../shared/constants/permissions";
import { invoiceBrandingController } from "./invoice-branding.controller";
import { brandingImageParamSchema, updateBrandingSchema } from "./invoice-branding.validation";

/** Logo, signature and stamp printed on invoice PDFs; managed by whoever manages invoices. */
const invoiceBrandingRoutes = Router();

invoiceBrandingRoutes.use(authenticateAdmin, requireAdminRole());

invoiceBrandingRoutes.get(
  "/",
  requirePermission(Permissions.RECEIVABLE_READ),
  invoiceBrandingController.get
);

invoiceBrandingRoutes.put(
  "/",
  requirePermission(Permissions.RECEIVABLE_UPDATE),
  validate(updateBrandingSchema, "body"),
  invoiceBrandingController.update
);

invoiceBrandingRoutes.get(
  "/:kind",
  requirePermission(Permissions.RECEIVABLE_READ),
  validate(brandingImageParamSchema, "params"),
  invoiceBrandingController.streamImage
);

invoiceBrandingRoutes.put(
  "/:kind",
  requirePermission(Permissions.RECEIVABLE_UPDATE),
  validate(brandingImageParamSchema, "params"),
  uploadBrandingImage,
  invoiceBrandingController.uploadImage
);

invoiceBrandingRoutes.delete(
  "/:kind",
  requirePermission(Permissions.RECEIVABLE_UPDATE),
  validate(brandingImageParamSchema, "params"),
  invoiceBrandingController.removeImage
);

export default invoiceBrandingRoutes;
