import { Router } from "express";
import { authenticateAdmin } from "../../middlewares/admin-auth.middleware";
import { requireAdminRole } from "../../middlewares/role.middleware";
import { requirePermission } from "../../middlewares/permission.middleware";
import { validate } from "../../middlewares/validation.middleware";
import { Permissions } from "../../shared/constants/permissions";
import { subSubCategoryController } from "./sub-sub-category.controller";
import {
  createSubSubCategorySchema,
  idParamSchema,
  subSubCategoryListQuerySchema,
  updateSubSubCategorySchema,
} from "./sub-sub-category.validation";

const subSubCategoryRoutes = Router();

subSubCategoryRoutes.use(authenticateAdmin, requireAdminRole());

subSubCategoryRoutes.get(
  "/",
  requirePermission(Permissions.SUB_SUB_CATEGORY_READ),
  validate(subSubCategoryListQuerySchema, "query"),
  subSubCategoryController.listSubSubCategories
);

subSubCategoryRoutes.post(
  "/",
  requirePermission(Permissions.SUB_SUB_CATEGORY_CREATE),
  validate(createSubSubCategorySchema, "body"),
  subSubCategoryController.createSubSubCategory
);

subSubCategoryRoutes.get(
  "/:id",
  requirePermission(Permissions.SUB_SUB_CATEGORY_READ),
  validate(idParamSchema, "params"),
  subSubCategoryController.getSubSubCategoryById
);

subSubCategoryRoutes.put(
  "/:id",
  requirePermission(Permissions.SUB_SUB_CATEGORY_UPDATE),
  validate(idParamSchema, "params"),
  validate(updateSubSubCategorySchema, "body"),
  subSubCategoryController.updateSubSubCategory
);

subSubCategoryRoutes.delete(
  "/:id",
  requirePermission(Permissions.SUB_SUB_CATEGORY_DELETE),
  validate(idParamSchema, "params"),
  subSubCategoryController.deleteSubSubCategory
);

export default subSubCategoryRoutes;
