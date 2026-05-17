import { Router } from "express";
import { authenticateAdmin } from "../../middlewares/admin-auth.middleware";
import { requireAdminRole } from "../../middlewares/role.middleware";
import { requirePermission } from "../../middlewares/permission.middleware";
import { validate } from "../../middlewares/validation.middleware";
import { Permissions } from "../../shared/constants/permissions";
import { subCategoryController } from "./sub-category.controller";
import {
  createSubCategorySchema,
  idParamSchema,
  subCategoryListQuerySchema,
  updateSubCategorySchema,
} from "./sub-category.validation";

const subCategoryRoutes = Router();

subCategoryRoutes.use(authenticateAdmin, requireAdminRole());

subCategoryRoutes.get(
  "/",
  requirePermission(Permissions.SUB_CATEGORY_READ),
  validate(subCategoryListQuerySchema, "query"),
  subCategoryController.listSubCategories
);

subCategoryRoutes.post(
  "/",
  requirePermission(Permissions.SUB_CATEGORY_CREATE),
  validate(createSubCategorySchema, "body"),
  subCategoryController.createSubCategory
);

subCategoryRoutes.get(
  "/:id",
  requirePermission(Permissions.SUB_CATEGORY_READ),
  validate(idParamSchema, "params"),
  subCategoryController.getSubCategoryById
);

subCategoryRoutes.put(
  "/:id",
  requirePermission(Permissions.SUB_CATEGORY_UPDATE),
  validate(idParamSchema, "params"),
  validate(updateSubCategorySchema, "body"),
  subCategoryController.updateSubCategory
);

subCategoryRoutes.delete(
  "/:id",
  requirePermission(Permissions.SUB_CATEGORY_DELETE),
  validate(idParamSchema, "params"),
  subCategoryController.deleteSubCategory
);

export default subCategoryRoutes;
