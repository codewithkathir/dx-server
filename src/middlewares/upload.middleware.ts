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

/** Extension used on disk, chosen from the checked type (never from the uploaded file name). */
const MIME_EXTENSIONS: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "application/pdf": ".pdf",
  "application/msword": ".doc",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": ".docx",
};

function extensionFor(mimetype: string): string {
  return MIME_EXTENSIONS[mimetype] ?? ".bin";
}

/** First bytes ("magic numbers") each allowed type must start with. */
function matchesSignature(mimetype: string, head: Buffer): boolean {
  const starts = (...bytes: number[]) => bytes.every((b, i) => head[i] === b);
  switch (mimetype) {
    case "image/jpeg":
      return starts(0xff, 0xd8, 0xff);
    case "image/png":
      return starts(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a);
    case "image/webp":
      return head.toString("ascii", 0, 4) === "RIFF" && head.toString("ascii", 8, 12) === "WEBP";
    case "application/pdf":
      return head.toString("ascii", 0, 5) === "%PDF-";
    case "application/msword":
      return starts(0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1);
    case "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
      return starts(0x50, 0x4b, 0x03, 0x04);
    default:
      return false;
  }
}

/**
 * The browser's declared type can't be trusted, so check the saved file's bytes.
 * A mismatch (e.g. an HTML page renamed to .png) is deleted and rejected.
 */
async function assertUploadedFileIsGenuine(file: Express.Multer.File | undefined): Promise<void> {
  if (!file) return;
  const handle = await fs.promises.open(file.path, "r");
  const head = Buffer.alloc(12);
  try {
    await handle.read(head, 0, head.length, 0);
  } finally {
    await handle.close();
  }
  if (!matchesSignature(file.mimetype, head)) {
    await fs.promises.unlink(file.path).catch(() => undefined);
    throw new ApiError("File content doesn't match its type", ErrorCodes.VALIDATION_ERROR, 400, [
      { field: file.fieldname, message: "File content doesn't match its type" },
    ]);
  }
}

/** Runs a multer middleware, then verifies the saved file's contents. */
function withVerifiedFile(
  run: (req: Request, res: Response, cb: (err?: unknown) => void) => void,
  req: Request,
  res: Response,
  next: NextFunction,
  afterVerify: () => void = next
): void {
  run(req, res, (err) => {
    if (err) {
      handleUploadError(err, req, res, next);
      return;
    }
    assertUploadedFileIsGenuine(req.file).then(afterVerify, next);
  });
}

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

function buildUniqueFilename(mimetype: string): string {
  const ext = extensionFor(mimetype);
  const random = Math.random().toString(36).slice(2, 10);
  return `expense_${Date.now()}_${random}${ext}`;
}

const expenseStorage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    ensureUploadDir();
    cb(null, EXPENSE_UPLOAD_DIR);
  },
  filename: (_req, file, cb) => {
    cb(null, buildUniqueFilename(file.mimetype));
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
  withVerifiedFile(uploadExpenseSupportFile, req, res, next);
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

const BILL_UPLOAD_DIR = path.join(config.upload.path, "documents", "bills");

const billStorage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    if (!fs.existsSync(BILL_UPLOAD_DIR)) {
      fs.mkdirSync(BILL_UPLOAD_DIR, { recursive: true });
    }
    cb(null, BILL_UPLOAD_DIR);
  },
  filename: (_req, file, cb) => {
    const random = Math.random().toString(36).slice(2, 10);
    cb(null, `bill_${Date.now()}_${random}${extensionFor(file.mimetype)}`);
  },
});

const billUpload = multer({
  storage: billStorage,
  limits: { fileSize: config.upload.maxFileSize },
  fileFilter: expenseFileFilter,
});

/** Required single `attachment` file for a payable bill (same types as expense receipts). */
export function uploadBillAttachment(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  withVerifiedFile(billUpload.single("attachment"), req, res, next, () => {
    if (!req.file) {
      next(
        new ApiError("Attachment can't be blank", ErrorCodes.VALIDATION_ERROR, 400, [
          { field: "attachment", message: "Attachment can't be blank" },
        ])
      );
      return;
    }
    next();
  });
}

export function getBillAttachmentPath(file?: Express.Multer.File): string | null {
  if (!file) {
    return null;
  }
  return path.posix.join("documents", "bills", file.filename);
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

function buildProfileFilename(mimetype: string): string {
  const ext = extensionFor(mimetype);
  const random = Math.random().toString(36).slice(2, 10);
  return `employee_${Date.now()}_${random}${ext}`;
}

const employeeProfileStorage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    ensureEmployeeProfileDir();
    cb(null, EMPLOYEE_PROFILE_DIR);
  },
  filename: (_req, file, cb) => {
    cb(null, buildProfileFilename(file.mimetype));
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
  withVerifiedFile(uploadEmployeeProfilePhoto, req, res, next);
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

function buildAdminProfileFilename(mimetype: string): string {
  const ext = extensionFor(mimetype);
  const random = Math.random().toString(36).slice(2, 10);
  return `admin_${Date.now()}_${random}${ext}`;
}

const adminProfileStorage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    ensureAdminProfileDir();
    cb(null, ADMIN_PROFILE_DIR);
  },
  filename: (_req, file, cb) => {
    cb(null, buildAdminProfileFilename(file.mimetype));
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
  withVerifiedFile(uploadAdminProfilePhoto, req, res, next);
}

export function getAdminProfilePhotoPath(
  file?: Express.Multer.File
): string | null {
  if (!file) {
    return null;
  }
  return path.posix.join("images", "admins", file.filename);
}
