import type { Request, Response } from "express";
import { getAdminProfilePhotoPath } from "../../middlewares/upload.middleware";
import { ApiError } from "../../shared/errors/api.error";
import { ErrorCodes } from "../../shared/errors/error-codes";
import { asyncHandler } from "../../shared/utils/async-handler";
import { successResponse } from "../../shared/responses/response.handler";
import { adminAuthService } from "./admin-auth.service";
import type {
  AdminChangePasswordBody,
  AdminForgotPasswordBody,
  AdminLoginBody,
  AdminRefreshTokenBody,
  AdminResetPasswordBody,
} from "./admin-auth.validation";

class AdminAuthController {
  login = asyncHandler(async (req: Request, res: Response) => {
    const body = req.validated!.body as AdminLoginBody;
    const result = await adminAuthService.login(body);
    successResponse(res, result, "Admin login successful");
  });

  logout = asyncHandler(async (req: Request, res: Response) => {
    const body = req.validated!.body as AdminRefreshTokenBody;
    await adminAuthService.logout(body.refreshToken);
    successResponse(res, null, "Logout successful");
  });

  forgotPassword = asyncHandler(async (req: Request, res: Response) => {
    const body = req.validated!.body as AdminForgotPasswordBody;
    await adminAuthService.forgotPassword(body);
    successResponse(
      res,
      null,
      "If an account exists for this email, a reset link has been sent"
    );
  });

  resetPassword = asyncHandler(async (req: Request, res: Response) => {
    const body = req.validated!.body as AdminResetPasswordBody;
    await adminAuthService.resetPassword(body);
    successResponse(res, null, "Password reset successful");
  });

  changePassword = asyncHandler(async (req: Request, res: Response) => {
    const body = req.validated!.body as AdminChangePasswordBody;
    await adminAuthService.changePassword(req.user!.id, body);
    successResponse(res, null, "Password changed successfully");
  });

  refreshToken = asyncHandler(async (req: Request, res: Response) => {
    const body = req.validated!.body as AdminRefreshTokenBody;
    const tokens = await adminAuthService.refreshTokens(body);
    successResponse(res, tokens, "Token refreshed successfully");
  });

  getProfile = asyncHandler(async (req: Request, res: Response) => {
    const admin = await adminAuthService.getProfile(req.user!.id);
    successResponse(res, admin, "Profile fetched successfully");
  });

  streamProfilePhoto = asyncHandler(async (req: Request, res: Response) => {
    const file = await adminAuthService.getProfilePhotoFile(req.user!.id);
    res.setHeader("Content-Type", file.contentType);
    res.setHeader(
      "Content-Disposition",
      `inline; filename="${encodeURIComponent(file.filename)}"`
    );
    res.sendFile(file.absolutePath);
  });

  uploadProfilePhoto = asyncHandler(async (req: Request, res: Response) => {
    const path = getAdminProfilePhotoPath(req.file);
    if (!path) {
      throw new ApiError(
        "Profile photo is required",
        ErrorCodes.VALIDATION_ERROR,
        400
      );
    }
    const admin = await adminAuthService.updateProfilePhoto(req.user!.id, path);
    successResponse(res, admin, "Profile photo updated successfully");
  });
}

export const adminAuthController = new AdminAuthController();
