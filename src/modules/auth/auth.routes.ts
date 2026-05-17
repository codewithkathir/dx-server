import { Router } from "express";
import { authController } from "./auth.controller";
import adminAuthRoutes from "./admin-auth.routes";
import employeeAuthRoutes from "./employee-auth.routes";
import { authenticate } from "../../middlewares/auth.middleware";
import { validate } from "../../middlewares/validation.middleware";
import { authRateLimiter } from "../../middlewares/rate-limit.middleware";
import {
  loginSchema,
  refreshTokenSchema,
  registerSchema,
} from "./auth.validation";

const authRoutes = Router();

authRoutes.use("/admin", adminAuthRoutes);
authRoutes.use("/employee", employeeAuthRoutes);

authRoutes.post(
  "/register",
  authRateLimiter,
  validate(registerSchema, "body"),
  authController.register
);

authRoutes.post(
  "/login",
  authRateLimiter,
  validate(loginSchema, "body"),
  authController.login
);

authRoutes.post(
  "/refresh",
  validate(refreshTokenSchema, "body"),
  authController.refresh
);

authRoutes.post(
  "/logout",
  authenticate,
  validate(refreshTokenSchema, "body"),
  authController.logout
);

authRoutes.get("/me", authenticate, authController.getProfile);

export default authRoutes;
