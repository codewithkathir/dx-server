import { Router } from "express";
import { authenticateAdmin } from "../../middlewares/admin-auth.middleware";
import { requireAdminRole } from "../../middlewares/role.middleware";
import { requirePermission } from "../../middlewares/permission.middleware";
import { validate } from "../../middlewares/validation.middleware";
import { Permissions } from "../../shared/constants/permissions";
import { paymentMethodController } from "./payment-method.controller";
import {
  createPaymentMethodSchema,
  idParamSchema,
  paymentMethodListQuerySchema,
  updatePaymentMethodSchema,
} from "./payment-method.validation";

const paymentMethodRoutes = Router();

paymentMethodRoutes.use(authenticateAdmin, requireAdminRole());

paymentMethodRoutes.get(
  "/",
  requirePermission(Permissions.PAYMENT_METHOD_READ),
  validate(paymentMethodListQuerySchema, "query"),
  paymentMethodController.listPaymentMethods
);

paymentMethodRoutes.post(
  "/",
  requirePermission(Permissions.PAYMENT_METHOD_CREATE),
  validate(createPaymentMethodSchema, "body"),
  paymentMethodController.createPaymentMethod
);

paymentMethodRoutes.get(
  "/:id",
  requirePermission(Permissions.PAYMENT_METHOD_READ),
  validate(idParamSchema, "params"),
  paymentMethodController.getPaymentMethodById
);

paymentMethodRoutes.put(
  "/:id",
  requirePermission(Permissions.PAYMENT_METHOD_UPDATE),
  validate(idParamSchema, "params"),
  validate(updatePaymentMethodSchema, "body"),
  paymentMethodController.updatePaymentMethod
);

paymentMethodRoutes.delete(
  "/:id",
  requirePermission(Permissions.PAYMENT_METHOD_DELETE),
  validate(idParamSchema, "params"),
  paymentMethodController.deletePaymentMethod
);

export default paymentMethodRoutes;
