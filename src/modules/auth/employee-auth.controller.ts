import type { Request, Response } from "express";
import { getEmployeeProfilePhotoPath } from "../../middlewares/upload.middleware";
import { asyncHandler } from "../../shared/utils/async-handler";
import { ApiError } from "../../shared/errors/api.error";
import { ErrorCodes } from "../../shared/errors/error-codes";
import { successResponse } from "../../shared/responses/response.handler";
import { employeeAuthService } from "./employee-auth.service";
import type {
  EmployeeChangePasswordBody,
  EmployeeForgotPasswordBody,
  EmployeeLoginBody,
  EmployeeRefreshTokenBody,
  EmployeeResetPasswordBody,
} from "./employee-auth.validation";

class EmployeeAuthController {
  login = asyncHandler(async (req: Request, res: Response) => {
    const body = req.validated!.body as EmployeeLoginBody;
    const result = await employeeAuthService.login(body);
    successResponse(res, result, "Employee login successful");
  });

  logout = asyncHandler(async (req: Request, res: Response) => {
    const body = req.validated!.body as EmployeeRefreshTokenBody;
    await employeeAuthService.logout(body.refreshToken);
    successResponse(res, null, "Logout successful");
  });

  forgotPassword = asyncHandler(async (req: Request, res: Response) => {
    const body = req.validated!.body as EmployeeForgotPasswordBody;
    await employeeAuthService.forgotPassword(body);
    successResponse(
      res,
      null,
      "If an account exists for this email, a reset link has been sent"
    );
  });

  resetPassword = asyncHandler(async (req: Request, res: Response) => {
    const body = req.validated!.body as EmployeeResetPasswordBody;
    await employeeAuthService.resetPassword(body);
    successResponse(res, null, "Password reset successful");
  });

  changePassword = asyncHandler(async (req: Request, res: Response) => {
    const body = req.validated!.body as EmployeeChangePasswordBody;
    await employeeAuthService.changePassword(req.user!.id, body);
    successResponse(res, null, "Password changed successfully");
  });

  refreshToken = asyncHandler(async (req: Request, res: Response) => {
    const body = req.validated!.body as EmployeeRefreshTokenBody;
    const tokens = await employeeAuthService.refreshTokens(body);
    successResponse(res, tokens, "Token refreshed successfully");
  });

  getProfile = asyncHandler(async (req: Request, res: Response) => {
    const employee = await employeeAuthService.getProfile(req.user!.id);
    successResponse(res, employee, "Profile fetched successfully");
  });

  streamProfilePhoto = asyncHandler(async (req: Request, res: Response) => {
    const file = await employeeAuthService.getProfilePhotoFile(req.user!.id);
    res.setHeader("Content-Type", file.contentType);
    res.setHeader(
      "Content-Disposition",
      `inline; filename="${encodeURIComponent(file.filename)}"`
    );
    res.sendFile(file.absolutePath);
  });

  uploadProfilePhoto = asyncHandler(async (req: Request, res: Response) => {
    const photoPath = getEmployeeProfilePhotoPath(req.file);
    if (!photoPath) {
      throw new ApiError(
        "Profile photo is required",
        ErrorCodes.VALIDATION_ERROR,
        400
      );
    }
    const employee = await employeeAuthService.updateProfilePhoto(
      req.user!.id,
      photoPath
    );
    successResponse(res, employee, "Profile photo updated successfully");
  });
}

export const employeeAuthController = new EmployeeAuthController();
