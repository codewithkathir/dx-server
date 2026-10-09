import { Router } from "express";
import { authenticateAdmin } from "../../middlewares/admin-auth.middleware";
import { requireAdminRole } from "../../middlewares/role.middleware";
import { requirePermission } from "../../middlewares/permission.middleware";
import { validate } from "../../middlewares/validation.middleware";
import { Permissions } from "../../shared/constants/permissions";
import { supplierController } from "./supplier.controller";
import {
  createSupplierSchema,
  idParamSchema,
  supplierListQuerySchema,
  updateSupplierSchema,
} from "./supplier.validation";

const supplierRoutes = Router();

supplierRoutes.use(authenticateAdmin, requireAdminRole());

supplierRoutes.get(
  "/",
  requirePermission(Permissions.SUPPLIER_READ),
  validate(supplierListQuerySchema, "query"),
  supplierController.listSuppliers
);

supplierRoutes.get(
  "/options",
  requirePermission(Permissions.SUPPLIER_READ),
  supplierController.listOptions
);

supplierRoutes.post(
  "/",
  requirePermission(Permissions.SUPPLIER_CREATE),
  validate(createSupplierSchema, "body"),
  supplierController.createSupplier
);

supplierRoutes.get(
  "/:id",
  requirePermission(Permissions.SUPPLIER_READ),
  validate(idParamSchema, "params"),
  supplierController.getSupplierById
);

supplierRoutes.put(
  "/:id",
  requirePermission(Permissions.SUPPLIER_UPDATE),
  validate(idParamSchema, "params"),
  validate(updateSupplierSchema, "body"),
  supplierController.updateSupplier
);

supplierRoutes.delete(
  "/:id",
  requirePermission(Permissions.SUPPLIER_DELETE),
  validate(idParamSchema, "params"),
  supplierController.deleteSupplier
);

export default supplierRoutes;
