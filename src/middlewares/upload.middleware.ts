import fs from "fs";
import path from "path";
import type { NextFunction, Request, Response } from "express";
import multer, { type FileFilterCallback } from "multer";
import { config } from "../config";
import { ApiError } from "../shared/errors/api.error";
import { ErrorCodes } from "../shared/errors/error-codes";

const PROFILE_IMAGE_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);

const EXPENSE_UPLOAD_DIR = path.join(
  config.upload.path,
  "documents",
  "expenses"
);

function ensureUploadDir(): void {
  if (!fs.existsSync(EXPENSE_UPLOAD_DIR)) {
    fs.mkdirSync(EXPENSE_UPLOAD_DIR, { recursive: true });
  }
}

function buildUniqueFilename(originalName: string): string {
  const ext = path.extname(originalName).toLowerCase() || "";
  const random = Math.random().toString(36).slice(2, 10);
  return `expense_${Date.now()}_${random}${ext}`;
}

const expenseStorage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    ensureUploadDir();
    cb(null, EXPENSE_UPLOAD_DIR);
  },
  filename: (_req, file, cb) => {
    cb(null, buildUniqueFilename(file.originalname));
  },
});

function expenseFileFilter(
  _req: Request,
  file: Express.Multer.File,
  cb: FileFilterCallback
): void {
  if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
    cb(
      new ApiError(
        "Unsupported file type",
        ErrorCodes.VALIDATION_ERROR,
        400
      ) as unknown as Error
    );
    return;
  }
  cb(null, true);
}

const expenseUpload = multer({
  storage: expenseStorage,
  limits: { fileSize: config.upload.maxFileSize },
  fileFilter: expenseFileFilter,
});

export const uploadExpenseSupportFile = expenseUpload.single("supportFile");

export function optionalExpenseSupportFileUpload(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const contentType = req.headers["content-type"] ?? "";
  if (!contentType.includes("multipart/form-data")) {
    next();
    return;
  }
  uploadExpenseSupportFile(req, res, (err) => {
    if (err) {
      handleUploadError(err, req, res, next);
      return;
    }
    next();
  });
}

export function handleUploadError(
  err: unknown,
  _req: Request,
  _res: Response,
  next: NextFunction
): void {
  if (err instanceof multer.MulterError) {
    if (err.code === "LIMIT_FILE_SIZE") {
      next(
        new ApiError(
          "File size exceeds the allowed limit",
          ErrorCodes.VALIDATION_ERROR,
          400
        )
      );
      return;
    }
    next(
      new ApiError(err.message, ErrorCodes.VALIDATION_ERROR, 400)
    );
    return;
  }
  next(err);
}

export function getExpenseSupportFilePath(
  file?: Express.Multer.File
): string | null {
  if (!file) {
    return null;
  }
  return path.posix.join(
    "documents",
    "expenses",
    file.filename
  );
}

const EMPLOYEE_PROFILE_DIR = path.join(
  config.upload.path,
  "images",
  "employees"
);

const PROFILE_MAX_BYTES = 2 * 1024 * 1024;

function ensureEmployeeProfileDir(): void {
  if (!fs.existsSync(EMPLOYEE_PROFILE_DIR)) {
    fs.mkdirSync(EMPLOYEE_PROFILE_DIR, { recursive: true });
  }
}

function buildProfileFilename(originalName: string): string {
  const ext = path.extname(originalName).toLowerCase() || ".jpg";
  const random = Math.random().toString(36).slice(2, 10);
  return `employee_${Date.now()}_${random}${ext}`;
}

const employeeProfileStorage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    ensureEmployeeProfileDir();
    cb(null, EMPLOYEE_PROFILE_DIR);
  },
  filename: (_req, file, cb) => {
    cb(null, buildProfileFilename(file.originalname));
  },
});

function employeeProfileFileFilter(
  _req: Request,
  file: Express.Multer.File,
  cb: FileFilterCallback
): void {
  if (!PROFILE_IMAGE_MIME_TYPES.has(file.mimetype)) {
    cb(
      new ApiError(
        "Profile photo must be JPEG, PNG, or WebP",
        ErrorCodes.VALIDATION_ERROR,
        400
      ) as unknown as Error
    );
    return;
  }
  cb(null, true);
}

const employeeProfileUpload = multer({
  storage: employeeProfileStorage,
  limits: { fileSize: PROFILE_MAX_BYTES },
  fileFilter: employeeProfileFileFilter,
});

export const uploadEmployeeProfilePhoto =
  employeeProfileUpload.single("profilePhoto");

export function optionalEmployeeProfilePhotoUpload(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const contentType = req.headers["content-type"] ?? "";
  if (!contentType.includes("multipart/form-data")) {
    next();
    return;
  }
  uploadEmployeeProfilePhoto(req, res, (err) => {
    if (err) {
      handleUploadError(err, req, res, next);
      return;
    }
    next();
  });
}

export function getEmployeeProfilePhotoPath(
  file?: Express.Multer.File
): string | null {
  if (!file) {
    return null;
  }
  return path.posix.join("images", "employees", file.filename);
}

const ADMIN_PROFILE_DIR = path.join(config.upload.path, "images", "admins");

function ensureAdminProfileDir(): void {
  if (!fs.existsSync(ADMIN_PROFILE_DIR)) {
    fs.mkdirSync(ADMIN_PROFILE_DIR, { recursive: true });
  }
}

function buildAdminProfileFilename(originalName: string): string {
  const ext = path.extname(originalName).toLowerCase() || ".jpg";
  const random = Math.random().toString(36).slice(2, 10);
  return `admin_${Date.now()}_${random}${ext}`;
}

const adminProfileStorage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    ensureAdminProfileDir();
    cb(null, ADMIN_PROFILE_DIR);
  },
  filename: (_req, file, cb) => {
    cb(null, buildAdminProfileFilename(file.originalname));
  },
});

const adminProfileUpload = multer({
  storage: adminProfileStorage,
  limits: { fileSize: PROFILE_MAX_BYTES },
  fileFilter: employeeProfileFileFilter,
});

export const uploadAdminProfilePhoto = adminProfileUpload.single("profilePhoto");

export function optionalAdminProfilePhotoUpload(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const contentType = req.headers["content-type"] ?? "";
  if (!contentType.includes("multipart/form-data")) {
    next();
    return;
  }
  uploadAdminProfilePhoto(req, res, (err) => {
    if (err) {
      handleUploadError(err, req, res, next);
      return;
    }
    next();
  });
}

export function getAdminProfilePhotoPath(
  file?: Express.Multer.File
): string | null {
  if (!file) {
    return null;
  }
  return path.posix.join("images", "admins", file.filename);
}
