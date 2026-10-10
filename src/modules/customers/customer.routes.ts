import { Router } from "express";
import { authenticateAdmin } from "../../middlewares/admin-auth.middleware";
import { requireAdminRole } from "../../middlewares/role.middleware";
import { requirePermission } from "../../middlewares/permission.middleware";
import { uploadPartyPhoto } from "../../middlewares/upload.middleware";
import { validate } from "../../middlewares/validation.middleware";
import { Permissions } from "../../shared/constants/permissions";
import { customerController } from "./customer.controller";
import {
  createCustomerSchema,
  idParamSchema,
  customerListQuerySchema,
  updateCustomerSchema,
} from "./customer.validation";

const customerRoutes = Router();

customerRoutes.use(authenticateAdmin, requireAdminRole());

customerRoutes.get(
  "/",
  requirePermission(Permissions.CUSTOMER_READ),
  validate(customerListQuerySchema, "query"),
  customerController.listCustomers
);

customerRoutes.get(
  "/options",
  requirePermission(Permissions.CUSTOMER_READ),
  customerController.listOptions
);

customerRoutes.post(
  "/",
  requirePermission(Permissions.CUSTOMER_CREATE),
  validate(createCustomerSchema, "body"),
  customerController.createCustomer
);

customerRoutes.get(
  "/:id",
  requirePermission(Permissions.CUSTOMER_READ),
  validate(idParamSchema, "params"),
  customerController.getCustomerById
);

customerRoutes.put(
  "/:id",
  requirePermission(Permissions.CUSTOMER_UPDATE),
  validate(idParamSchema, "params"),
  validate(updateCustomerSchema, "body"),
  customerController.updateCustomer
);

customerRoutes.delete(
  "/:id",
  requirePermission(Permissions.CUSTOMER_DELETE),
  validate(idParamSchema, "params"),
  customerController.deleteCustomer
);

customerRoutes.get(
  "/:id/photo",
  requirePermission(Permissions.CUSTOMER_READ),
  validate(idParamSchema, "params"),
  customerController.streamPhoto
);

customerRoutes.put(
  "/:id/photo",
  requirePermission(Permissions.CUSTOMER_UPDATE),
  validate(idParamSchema, "params"),
  uploadPartyPhoto("customers"),
  customerController.uploadPhoto
);

customerRoutes.delete(
  "/:id/photo",
  requirePermission(Permissions.CUSTOMER_UPDATE),
  validate(idParamSchema, "params"),
  customerController.removePhoto
);

export default customerRoutes;
