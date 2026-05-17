import { Router } from "express";
import { optionalAdminProfilePhotoUpload } from "../../middlewares/upload.middleware";
import { adminAuthController } from "./admin-auth.controller";
import { authenticateAdmin } from "../../middlewares/admin-auth.middleware";
import { requireAdminRole } from "../../middlewares/role.middleware";
import { validate } from "../../middlewares/validation.middleware";
import { authRateLimiter } from "../../middlewares/rate-limit.middleware";
import {
  adminChangePasswordSchema,
  adminForgotPasswordSchema,
  adminLoginSchema,
  adminRefreshTokenSchema,
  adminResetPasswordSchema,
} from "./admin-auth.validation";

const adminAuthRoutes = Router();

adminAuthRoutes.post(
  "/login",
  authRateLimiter,
  validate(adminLoginSchema, "body"),
  adminAuthController.login
);

adminAuthRoutes.post(
  "/logout",
  validate(adminRefreshTokenSchema, "body"),
  adminAuthController.logout
);

adminAuthRoutes.post(
  "/forgot-password",
  authRateLimiter,
  validate(adminForgotPasswordSchema, "body"),
  adminAuthController.forgotPassword
);

adminAuthRoutes.post(
  "/reset-password",
  authRateLimiter,
  validate(adminResetPasswordSchema, "body"),
  adminAuthController.resetPassword
);

adminAuthRoutes.post(
  "/refresh-token",
  validate(adminRefreshTokenSchema, "body"),
  adminAuthController.refreshToken
);

adminAuthRoutes.post(
  "/change-password",
  authenticateAdmin,
  requireAdminRole(),
  validate(adminChangePasswordSchema, "body"),
  adminAuthController.changePassword
);

adminAuthRoutes.get(
  "/me/profile-photo",
  authenticateAdmin,
  requireAdminRole(),
  adminAuthController.streamProfilePhoto
);

adminAuthRoutes.post(
  "/me/profile-photo",
  authenticateAdmin,
  requireAdminRole(),
  optionalAdminProfilePhotoUpload,
  adminAuthController.uploadProfilePhoto
);

adminAuthRoutes.get(
  "/me",
  authenticateAdmin,
  requireAdminRole(),
  adminAuthController.getProfile
);

export default adminAuthRoutes;
