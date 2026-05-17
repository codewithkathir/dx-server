import type { Request, Response } from "express";
import { asyncHandler } from "../../shared/utils/async-handler";
import {
  createdResponse,
  successResponse,
} from "../../shared/responses/response.handler";
import { authService } from "./auth.service";
import type {
  LoginBody,
  RefreshTokenBody,
  RegisterBody,
} from "./auth.validation";

class AuthController {
  register = asyncHandler(async (req: Request, res: Response) => {
    const body = req.validated!.body as RegisterBody;
    const result = await authService.register(body);
    createdResponse(res, result, "Registration successful");
  });

  login = asyncHandler(async (req: Request, res: Response) => {
    const body = req.validated!.body as LoginBody;
    const result = await authService.login(body);
    successResponse(res, result, "Login successful");
  });

  refresh = asyncHandler(async (req: Request, res: Response) => {
    const body = req.validated!.body as RefreshTokenBody;
    const tokens = await authService.refreshTokens(body);
    successResponse(res, tokens, "Token refreshed successfully");
  });

  logout = asyncHandler(async (req: Request, res: Response) => {
    const body = req.validated!.body as RefreshTokenBody;
    await authService.logout(body.refreshToken);
    successResponse(res, null, "Logout successful");
  });

  getProfile = asyncHandler(async (req: Request, res: Response) => {
    const user = await authService.getProfile(req.user!.id);
    successResponse(res, user, "Profile fetched successfully");
  });
}

export const authController = new AuthController();
