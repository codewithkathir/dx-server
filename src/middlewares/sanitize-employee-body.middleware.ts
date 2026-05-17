import type { NextFunction, Request, Response } from "express";

/** Multer may leave `profilePhoto` on req.body; file is handled via req.file only. */
export function sanitizeEmployeeBody(
  req: Request,
  _res: Response,
  next: NextFunction
): void {
  if (req.body && typeof req.body === "object") {
    delete (req.body as Record<string, unknown>).profilePhoto;
  }
  next();
}
