import type { NextFunction, Request, Response } from "express";
import type { ZodSchema } from "zod";
import { ApiError } from "../shared/errors/api.error";
import { ErrorCodes } from "../shared/errors/error-codes";

type ValidationTarget = "body" | "query" | "params";

export function validate(
  schema: ZodSchema,
  target: ValidationTarget = "body"
) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req[target]);

    if (!result.success) {
      const errors = result.error.errors.map((err) => ({
        field: err.path.join(".") || target,
        message: err.message,
      }));

      next(
        new ApiError(
          "Validation failed",
          ErrorCodes.VALIDATION_ERROR,
          400,
          errors
        )
      );
      return;
    }

    if (!req.validated) {
      req.validated = {};
    }
    req.validated[target] = result.data;
    req[target] = result.data;
    next();
  };
}
