import type { NextFunction, Request, Response } from "express";
import { ApiError } from "../shared/errors/api.error";
import { ErrorCodes } from "../shared/errors/error-codes";
import { Actors } from "../shared/constants/actors";
import { verifyAccessToken } from "../shared/utils/jwt.util";
import { roleRepository } from "../modules/roles/role.repository";
import type { RoleName } from "../shared/constants/roles";

export async function authenticate(
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

    if (payload.actor !== Actors.USER) {
      throw new ApiError("Forbidden", ErrorCodes.FORBIDDEN, 403);
    }

    const permissions = await roleRepository.getPermissionsByRoleName(
      payload.role as RoleName
    );

    req.user = {
      id: payload.sub,
      email: payload.email,
      role: payload.role as RoleName,
      permissions,
      actor: Actors.USER,
    };

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

export function optionalAuthenticate(
  req: Request,
  _res: Response,
  next: NextFunction
): void {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith("Bearer ")) {
    next();
    return;
  }

  void authenticate(req, _res, next);
}
