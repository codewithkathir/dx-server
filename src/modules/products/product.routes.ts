import { Router } from "express";
import { authenticateAdmin } from "../../middlewares/admin-auth.middleware";
import { requireAdminRole } from "../../middlewares/role.middleware";
import { requirePermission } from "../../middlewares/permission.middleware";
import { validate } from "../../middlewares/validation.middleware";
import { Permissions } from "../../shared/constants/permissions";
import { productController } from "./product.controller";
import {
  createProductSchema,
  idParamSchema,
  productListQuerySchema,
  updateProductSchema,
} from "./product.validation";

/** No DELETE: products are made inactive instead, so invoice lines keep their link. */
const productRoutes = Router();

productRoutes.use(authenticateAdmin, requireAdminRole());

productRoutes.get(
  "/",
  requirePermission(Permissions.PRODUCT_READ),
  validate(productListQuerySchema, "query"),
  productController.listProducts
);
productRoutes.post(
  "/",
  requirePermission(Permissions.PRODUCT_CREATE),
  validate(createProductSchema, "body"),
  productController.createProduct
);
productRoutes.get(
  "/:id",
  requirePermission(Permissions.PRODUCT_READ),
  validate(idParamSchema, "params"),
  productController.getProductById
);
productRoutes.put(
  "/:id",
  requirePermission(Permissions.PRODUCT_UPDATE),
  validate(idParamSchema, "params"),
  validate(updateProductSchema, "body"),
  productController.updateProduct
);

export default productRoutes;
