import { Router } from "express";
import { authenticateAdmin } from "../../middlewares/admin-auth.middleware";
import { requireAdminRole } from "../../middlewares/role.middleware";
import { requirePermission } from "../../middlewares/permission.middleware";
import { validate } from "../../middlewares/validation.middleware";
import { Permissions } from "../../shared/constants/permissions";
import { receivableController } from "./receivable.controller";
import {
  createInvoiceSchema,
  idParamSchema,
  invoiceListQuerySchema,
  receiptIdParamSchema,
  recordReceiptSchema,
  updateInvoiceSchema,
} from "./receivable.validation";

const receivableRoutes = Router();

receivableRoutes.use(authenticateAdmin, requireAdminRole());

receivableRoutes.get(
  "/",
  requirePermission(Permissions.RECEIVABLE_READ),
  validate(invoiceListQuerySchema, "query"),
  receivableController.listInvoices
);

receivableRoutes.get("/summary", requirePermission(Permissions.RECEIVABLE_READ), receivableController.getSummary);

receivableRoutes.post(
  "/",
  requirePermission(Permissions.RECEIVABLE_CREATE),
  validate(createInvoiceSchema, "body"),
  receivableController.createInvoice
);

receivableRoutes.get(
  "/:id",
  requirePermission(Permissions.RECEIVABLE_READ),
  validate(idParamSchema, "params"),
  receivableController.getInvoice
);

receivableRoutes.get(
  "/:id/pdf",
  requirePermission(Permissions.RECEIVABLE_READ),
  validate(idParamSchema, "params"),
  receivableController.downloadPdf
);

receivableRoutes.put(
  "/:id",
  requirePermission(Permissions.RECEIVABLE_UPDATE),
  validate(idParamSchema, "params"),
  validate(updateInvoiceSchema, "body"),
  receivableController.updateInvoice
);

receivableRoutes.post(
  "/:id/send",
  requirePermission(Permissions.RECEIVABLE_UPDATE),
  validate(idParamSchema, "params"),
  receivableController.sendInvoice
);

receivableRoutes.post(
  "/:id/cancel",
  requirePermission(Permissions.RECEIVABLE_DELETE),
  validate(idParamSchema, "params"),
  receivableController.cancelInvoice
);

receivableRoutes.post(
  "/:id/receipts",
  requirePermission(Permissions.RECEIVABLE_RECEIVE),
  validate(idParamSchema, "params"),
  validate(recordReceiptSchema, "body"),
  receivableController.recordReceipt
);

receivableRoutes.delete(
  "/:id/receipts/:receiptId",
  requirePermission(Permissions.RECEIVABLE_RECEIVE),
  validate(receiptIdParamSchema, "params"),
  receivableController.deleteReceipt
);

export default receivableRoutes;
