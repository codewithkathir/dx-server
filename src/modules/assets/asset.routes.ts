import { Router } from "express";
import { authenticateAdmin } from "../../middlewares/admin-auth.middleware";
import { requireAdminRole } from "../../middlewares/role.middleware";
import { requirePermission } from "../../middlewares/permission.middleware";
import { validate } from "../../middlewares/validation.middleware";
import { Permissions } from "../../shared/constants/permissions";
import { assetController } from "./asset.controller";
import {
  assetListQuerySchema,
  assignAssetSchema,
  createAssetSchema,
  idParamSchema,
  returnAssetSchema,
  updateAssetSchema,
} from "./asset.validation";

const assetRoutes = Router();

assetRoutes.use(authenticateAdmin, requireAdminRole());

assetRoutes.get("/", requirePermission(Permissions.ASSET_READ), validate(assetListQuerySchema, "query"), assetController.list);
assetRoutes.get("/summary", requirePermission(Permissions.ASSET_READ), assetController.summary);
assetRoutes.post("/", requirePermission(Permissions.ASSET_CREATE), validate(createAssetSchema, "body"), assetController.create);
assetRoutes.get("/:id", requirePermission(Permissions.ASSET_READ), validate(idParamSchema, "params"), assetController.getById);
assetRoutes.put(
  "/:id",
  requirePermission(Permissions.ASSET_UPDATE),
  validate(idParamSchema, "params"),
  validate(updateAssetSchema, "body"),
  assetController.update
);
assetRoutes.delete("/:id", requirePermission(Permissions.ASSET_DELETE), validate(idParamSchema, "params"), assetController.remove);
assetRoutes.post(
  "/:id/assign",
  requirePermission(Permissions.ASSET_ASSIGN),
  validate(idParamSchema, "params"),
  validate(assignAssetSchema, "body"),
  assetController.assign
);
assetRoutes.post(
  "/:id/return",
  requirePermission(Permissions.ASSET_ASSIGN),
  validate(idParamSchema, "params"),
  validate(returnAssetSchema, "body"),
  assetController.returnAsset
);

export default assetRoutes;
