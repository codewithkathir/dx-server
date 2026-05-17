import type { NextFunction, Request, Response } from "express";
import { ApiError } from "../shared/errors/api.error";
import { ErrorCodes } from "../shared/errors/error-codes";
import { logger } from "../shared/logger/logger";
import { config } from "../config";

export function notFoundHandler(
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  res.status(404).json({
    success: false,
    message: "Route not found",
    errorCode: ErrorCodes.NOT_FOUND,
    errors: [],
  });
}

export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  if (err instanceof ApiError) {
    logger.warn(
      {
        errorCode: err.errorCode,
        statusCode: err.statusCode,
        path: req.path,
        method: req.method,
        userId: req.user?.id,
      },
      err.message
    );

    res.status(err.statusCode).json({
      success: false,
      message: err.message,
      errorCode: err.errorCode,
      errors: err.errors,
    });
    return;
  }

  const isDbError =
    "code" in err &&
    typeof (err as { code?: string }).code === "string" &&
    (err as { code: string }).code.startsWith("ER_");

  logger.error(
    {
      err,
      path: req.path,
      method: req.method,
      userId: req.user?.id,
    },
    isDbError ? "Database error" : "Unhandled error"
  );

  const message = config.isProduction
    ? "Internal server error"
    : err.message;

  res.status(500).json({
    success: false,
    message,
    errorCode: isDbError ? ErrorCodes.DATABASE_ERROR : ErrorCodes.INTERNAL_ERROR,
    errors: [],
  });
}
