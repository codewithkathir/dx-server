import { Router } from "express";
import { authenticateAdmin } from "../../middlewares/admin-auth.middleware";
import { requireAdminRole } from "../../middlewares/role.middleware";
import { requirePermission } from "../../middlewares/permission.middleware";
import { validate } from "../../middlewares/validation.middleware";
import { Permissions } from "../../shared/constants/permissions";
import { dropdownController } from "./dropdown.controller";
import {
  subCategoryDropdownQuerySchema,
  subSubCategoryDropdownQuerySchema,
} from "./dropdown.validation";

const dropdownAdminRoutes = Router();

dropdownAdminRoutes.use(authenticateAdmin, requireAdminRole());

dropdownAdminRoutes.get(
  "/categories",
  requirePermission(Permissions.CATEGORY_READ),
  dropdownController.listCategories
);

dropdownAdminRoutes.get(
  "/sub-categories",
  requirePermission(Permissions.SUB_CATEGORY_READ),
  validate(subCategoryDropdownQuerySchema, "query"),
  dropdownController.listSubCategories
);

dropdownAdminRoutes.get(
  "/sub-sub-categories",
  requirePermission(Permissions.SUB_SUB_CATEGORY_READ),
  validate(subSubCategoryDropdownQuerySchema, "query"),
  dropdownController.listSubSubCategories
);

dropdownAdminRoutes.get(
  "/payment-methods",
  requirePermission(Permissions.PAYMENT_METHOD_READ),
  dropdownController.listPaymentMethods
);

dropdownAdminRoutes.get(
  "/whom",
  requirePermission(Permissions.EMPLOYEE_READ),
  dropdownController.listWhom
);

export default dropdownAdminRoutes;
