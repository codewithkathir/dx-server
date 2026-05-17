import type { NextFunction, Request, Response } from "express";
import { ApiError } from "../shared/errors/api.error";
import { ErrorCodes } from "../shared/errors/error-codes";
import { Roles } from "../shared/constants/roles";

export function requirePermission(...requiredPermissions: string[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      next(
        new ApiError("Authentication required", ErrorCodes.UNAUTHORIZED, 401)
      );
      return;
    }

    if (req.user.role === Roles.SUPER_ADMIN) {
      next();
      return;
    }

    const hasPermission = requiredPermissions.every((perm) =>
      req.user!.permissions.includes(perm)
    );

    if (!hasPermission) {
      next(new ApiError("Forbidden", ErrorCodes.FORBIDDEN, 403));
      return;
    }

    next();
  };
}

export function requireRole(...allowedRoles: string[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      next(
        new ApiError("Authentication required", ErrorCodes.UNAUTHORIZED, 401)
      );
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      next(new ApiError("Forbidden", ErrorCodes.FORBIDDEN, 403));
      return;
    }

    next();
  };
}
