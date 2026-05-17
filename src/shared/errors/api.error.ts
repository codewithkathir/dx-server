import type { ErrorCode } from "./error-codes";

export interface ValidationDetail {
  field: string;
  message: string;
}

export class ApiError extends Error {
  public readonly errorCode: ErrorCode;
  public readonly statusCode: number;
  public readonly errors: ValidationDetail[];

  constructor(
    message: string,
    errorCode: ErrorCode,
    statusCode: number,
    errors: ValidationDetail[] = []
  ) {
    super(message);
    this.name = "ApiError";
    this.errorCode = errorCode;
    this.statusCode = statusCode;
    this.errors = errors;
    Object.setPrototypeOf(this, ApiError.prototype);
  }
}
