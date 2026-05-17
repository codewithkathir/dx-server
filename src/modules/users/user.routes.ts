import { Router } from "express";
import { userController } from "./user.controller";
import { authenticate } from "../../middlewares/auth.middleware";
import { requirePermission } from "../../middlewares/permission.middleware";
import { validate } from "../../middlewares/validation.middleware";
import { Permissions } from "../../shared/constants/permissions";
import {
  createUserSchema,
  idParamSchema,
  paginationQuerySchema,
  updateUserSchema,
} from "./user.validation";

const userRoutes = Router();

userRoutes.use(authenticate);

userRoutes.get(
  "/",
  requirePermission(Permissions.USER_READ),
  validate(paginationQuerySchema, "query"),
  userController.listUsers
);

userRoutes.get(
  "/:id",
  requirePermission(Permissions.USER_READ),
  validate(idParamSchema, "params"),
  userController.getUserById
);

userRoutes.post(
  "/",
  requirePermission(Permissions.USER_CREATE),
  validate(createUserSchema, "body"),
  userController.createUser
);

userRoutes.patch(
  "/:id",
  requirePermission(Permissions.USER_UPDATE),
  validate(idParamSchema, "params"),
  validate(updateUserSchema, "body"),
  userController.updateUser
);

userRoutes.delete(
  "/:id",
  requirePermission(Permissions.USER_DELETE),
  validate(idParamSchema, "params"),
  userController.deleteUser
);

export default userRoutes;
