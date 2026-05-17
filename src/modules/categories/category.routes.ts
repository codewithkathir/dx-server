import { Router } from "express";
import { authenticateAdmin } from "../../middlewares/admin-auth.middleware";
import { requireAdminRole } from "../../middlewares/role.middleware";
import { requirePermission } from "../../middlewares/permission.middleware";
import { validate } from "../../middlewares/validation.middleware";
import { Permissions } from "../../shared/constants/permissions";
import { categoryController } from "./category.controller";
import { subCategoryController } from "../sub-categories/sub-category.controller";
import {
  categoryIdParamSchema,
  categoryListQuerySchema,
  createCategorySchema,
  idParamSchema,
  updateCategorySchema,
} from "./category.validation";

const categoryRoutes = Router();

categoryRoutes.use(authenticateAdmin, requireAdminRole());

categoryRoutes.get(
  "/",
  requirePermission(Permissions.CATEGORY_READ),
  validate(categoryListQuerySchema, "query"),
  categoryController.listCategories
);

categoryRoutes.post(
  "/",
  requirePermission(Permissions.CATEGORY_CREATE),
  validate(createCategorySchema, "body"),
  categoryController.createCategory
);

categoryRoutes.get(
  "/:categoryId/sub-categories",
  requirePermission(Permissions.SUB_CATEGORY_READ),
  validate(categoryIdParamSchema, "params"),
  validate(categoryListQuerySchema, "query"),
  subCategoryController.listByCategoryId
);

categoryRoutes.get(
  "/:id",
  requirePermission(Permissions.CATEGORY_READ),
  validate(idParamSchema, "params"),
  categoryController.getCategoryById
);

categoryRoutes.put(
  "/:id",
  requirePermission(Permissions.CATEGORY_UPDATE),
  validate(idParamSchema, "params"),
  validate(updateCategorySchema, "body"),
  categoryController.updateCategory
);

categoryRoutes.delete(
  "/:id",
  requirePermission(Permissions.CATEGORY_DELETE),
  validate(idParamSchema, "params"),
  categoryController.deleteCategory
);

export default categoryRoutes;
