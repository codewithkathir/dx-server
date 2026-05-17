import type { NextFunction, Request, Response } from "express";
import { ApiError } from "../shared/errors/api.error";
import { ErrorCodes } from "../shared/errors/error-codes";
import { Actors } from "../shared/constants/actors";
import { Roles } from "../shared/constants/roles";

/**
 * Restricts access to ADMIN and SUPER_ADMIN roles only.
 * Must be used after authenticateAdmin.
 */
export function requireAdminRole() {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      next(
        new ApiError("Authentication required", ErrorCodes.UNAUTHORIZED, 401)
      );
      return;
    }

    if (req.user.actor !== Actors.ADMIN) {
      next(new ApiError("Forbidden", ErrorCodes.FORBIDDEN, 403));
      return;
    }

    const allowed: string[] = [Roles.ADMIN, Roles.SUPER_ADMIN];
    if (!allowed.includes(req.user.role)) {
      next(new ApiError("Forbidden", ErrorCodes.FORBIDDEN, 403));
      return;
    }

    next();
  };
}

/**
 * Restricts access to employee portal users only.
 * Must be used after authenticateEmployee.
 */
export function requireEmployeeRole() {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      next(
        new ApiError("Authentication required", ErrorCodes.UNAUTHORIZED, 401)
      );
      return;
    }

    if (req.user.actor !== Actors.EMPLOYEE) {
      next(new ApiError("Forbidden", ErrorCodes.FORBIDDEN, 403));
      return;
    }

    if (req.user.role !== Roles.EMPLOYEE) {
      next(new ApiError("Forbidden", ErrorCodes.FORBIDDEN, 403));
      return;
    }

    next();
  };
}
