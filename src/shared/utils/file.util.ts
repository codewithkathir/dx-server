import fs from "fs";
import path from "path";
import { config } from "../../config";
import { ApiError } from "../errors/api.error";
import { ErrorCodes } from "../errors/error-codes";

const MIME_BY_EXT: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".pdf": "application/pdf",
  ".doc": "application/msword",
  ".docx":
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
};

export function resolveUploadAbsolutePath(relativePath: string): string {
  const uploadRoot = path.resolve(config.upload.path);
  const absolutePath = path.resolve(uploadRoot, relativePath);

  if (
    relativePath.includes("..") ||
    !absolutePath.startsWith(`${uploadRoot}${path.sep}`)
  ) {
    throw new ApiError("Invalid file path", ErrorCodes.FORBIDDEN, 403);
  }

  if (!fs.existsSync(absolutePath)) {
    throw new ApiError("File not found", ErrorCodes.NOT_FOUND, 404);
  }

  return absolutePath;
}

export function getMimeTypeFromFilename(filename: string): string {
  const ext = path.extname(filename).toLowerCase();
  return MIME_BY_EXT[ext] ?? "application/octet-stream";
}

export function isImageFilename(filename: string): boolean {
  const ext = path.extname(filename).toLowerCase();
  return [".jpg", ".jpeg", ".png", ".webp"].includes(ext);
}
