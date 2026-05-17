import { Router } from "express";
import { optionalEmployeeProfilePhotoUpload } from "../../middlewares/upload.middleware";
import { employeeAuthController } from "./employee-auth.controller";
import { authenticateEmployee } from "../../middlewares/employee-auth.middleware";
import { requireEmployeeRole } from "../../middlewares/role.middleware";
import { validate } from "../../middlewares/validation.middleware";
import { authRateLimiter } from "../../middlewares/rate-limit.middleware";
import {
  employeeChangePasswordSchema,
  employeeForgotPasswordSchema,
  employeeLoginSchema,
  employeeRefreshTokenSchema,
  employeeResetPasswordSchema,
} from "./employee-auth.validation";

const employeeAuthRoutes = Router();

employeeAuthRoutes.post(
  "/login",
  authRateLimiter,
  validate(employeeLoginSchema, "body"),
  employeeAuthController.login
);

employeeAuthRoutes.post(
  "/logout",
  validate(employeeRefreshTokenSchema, "body"),
  employeeAuthController.logout
);

employeeAuthRoutes.post(
  "/forgot-password",
  authRateLimiter,
  validate(employeeForgotPasswordSchema, "body"),
  employeeAuthController.forgotPassword
);

employeeAuthRoutes.post(
  "/reset-password",
  authRateLimiter,
  validate(employeeResetPasswordSchema, "body"),
  employeeAuthController.resetPassword
);

employeeAuthRoutes.post(
  "/refresh-token",
  validate(employeeRefreshTokenSchema, "body"),
  employeeAuthController.refreshToken
);

employeeAuthRoutes.post(
  "/change-password",
  authenticateEmployee,
  requireEmployeeRole(),
  validate(employeeChangePasswordSchema, "body"),
  employeeAuthController.changePassword
);

employeeAuthRoutes.get(
  "/me/profile-photo",
  authenticateEmployee,
  requireEmployeeRole(),
  employeeAuthController.streamProfilePhoto
);

employeeAuthRoutes.post(
  "/me/profile-photo",
  authenticateEmployee,
  requireEmployeeRole(),
  optionalEmployeeProfilePhotoUpload,
  employeeAuthController.uploadProfilePhoto
);

employeeAuthRoutes.get(
  "/me",
  authenticateEmployee,
  requireEmployeeRole(),
  employeeAuthController.getProfile
);

export default employeeAuthRoutes;
