import type { Response } from "express";

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface SuccessResponse<T> {
  success: true;
  message: string;
  data: T;
  meta?: PaginationMeta;
}

export interface ErrorResponseBody {
  success: false;
  message: string;
  errorCode: string;
  errors: Array<{ field: string; message: string }>;
}

export function successResponse<T>(
  res: Response,
  data: T,
  message = "Operation successful",
  statusCode = 200,
  meta?: PaginationMeta
): Response {
  const body: SuccessResponse<T> = {
    success: true,
    message,
    data,
    ...(meta ? { meta } : {}),
  };
  return res.status(statusCode).json(body);
}

export function paginationResponse<T>(
  res: Response,
  data: T[],
  meta: PaginationMeta,
  message = "Data fetched successfully"
): Response {
  return successResponse(res, data, message, 200, meta);
}

export function createdResponse<T>(
  res: Response,
  data: T,
  message = "Created successfully"
): Response {
  return successResponse(res, data, message, 201);
}
