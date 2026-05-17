import type { NextFunction, Request, Response } from "express";
import { ApiError } from "../shared/errors/api.error";
import { ErrorCodes } from "../shared/errors/error-codes";
import { Actors } from "../shared/constants/actors";
import { verifyAccessToken } from "../shared/utils/jwt.util";
import { adminAuthService } from "../modules/auth/admin-auth.service";

/**
 * Validates JWT and loads admin into req.user (with role permissions).
 */
export async function authenticateAdmin(
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader?.startsWith("Bearer ")) {
      throw new ApiError(
        "Authentication required",
        ErrorCodes.UNAUTHORIZED,
        401
      );
    }

    const token = authHeader.slice(7);
    const payload = verifyAccessToken(token);

    if (payload.actor !== Actors.ADMIN) {
      throw new ApiError("Forbidden", ErrorCodes.FORBIDDEN, 403);
    }

    req.user = await adminAuthService.resolveAuthUser(payload.sub);

    next();
  } catch (error) {
    if (error instanceof ApiError) {
      next(error);
      return;
    }
    next(
      new ApiError("Invalid or expired token", ErrorCodes.TOKEN_EXPIRED, 401)
    );
  }
}
