import { Router } from "express";
import { roleController } from "./role.controller";
import { authenticate } from "../../middlewares/auth.middleware";
import { requirePermission } from "../../middlewares/permission.middleware";
import { Permissions } from "../../shared/constants/permissions";

const roleRoutes = Router();

roleRoutes.get(
  "/",
  authenticate,
  requirePermission(Permissions.ROLE_READ),
  roleController.listRoles
);

export default roleRoutes;
