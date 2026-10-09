import { Router } from "express";
import { authenticateAdmin } from "../../middlewares/admin-auth.middleware";
import { requireAdminRole } from "../../middlewares/role.middleware";
import { requirePermission } from "../../middlewares/permission.middleware";
import { validate } from "../../middlewares/validation.middleware";
import { Permissions } from "../../shared/constants/permissions";
import { payableController } from "./payable.controller";
import {
  billListQuerySchema,
  createBillSchema,
  idParamSchema,
  paymentIdParamSchema,
  recordPaymentSchema,
  updateBillSchema,
} from "./payable.validation";

const payableRoutes = Router();

payableRoutes.use(authenticateAdmin, requireAdminRole());

payableRoutes.get(
  "/",
  requirePermission(Permissions.PAYABLE_READ),
  validate(billListQuerySchema, "query"),
  payableController.listBills
);

payableRoutes.get("/summary", requirePermission(Permissions.PAYABLE_READ), payableController.getSummary);

payableRoutes.post(
  "/",
  requirePermission(Permissions.PAYABLE_CREATE),
  validate(createBillSchema, "body"),
  payableController.createBill
);

payableRoutes.get(
  "/:id",
  requirePermission(Permissions.PAYABLE_READ),
  validate(idParamSchema, "params"),
  payableController.getBill
);

payableRoutes.put(
  "/:id",
  requirePermission(Permissions.PAYABLE_UPDATE),
  validate(idParamSchema, "params"),
  validate(updateBillSchema, "body"),
  payableController.updateBill
);

payableRoutes.post(
  "/:id/issue",
  requirePermission(Permissions.PAYABLE_UPDATE),
  validate(idParamSchema, "params"),
  payableController.issueBill
);

payableRoutes.post(
  "/:id/cancel",
  requirePermission(Permissions.PAYABLE_UPDATE),
  validate(idParamSchema, "params"),
  payableController.cancelBill
);

payableRoutes.delete(
  "/:id",
  requirePermission(Permissions.PAYABLE_DELETE),
  validate(idParamSchema, "params"),
  payableController.deleteBill
);

payableRoutes.post(
  "/:id/payments",
  requirePermission(Permissions.PAYABLE_PAY),
  validate(idParamSchema, "params"),
  validate(recordPaymentSchema, "body"),
  payableController.recordPayment
);

payableRoutes.delete(
  "/:id/payments/:paymentId",
  requirePermission(Permissions.PAYABLE_PAY),
  validate(paymentIdParamSchema, "params"),
  payableController.deletePayment
);

export default payableRoutes;
