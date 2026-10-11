import fs from "fs";
import { ApiError } from "../../shared/errors/api.error";
import { ErrorCodes } from "../../shared/errors/error-codes";
import { logger } from "../../shared/logger/logger";
import {
  getMimeTypeFromFilename,
  removeUploadFile,
  resolveUploadAbsolutePath,
} from "../../shared/utils/file.util";
import { invoiceBrandingRepository } from "./invoice-branding.repository";
import type {
  BrandingImageKind,
  InvoiceBrandingPublic,
  InvoiceBrandingRow,
} from "./invoice-branding.types";
import type { UpdateBrandingBody } from "./invoice-branding.validation";

/** What the invoice PDF prints: image bytes (missing files are skipped) and the signatory. */
export interface InvoiceBrandingAssets {
  logo?: Buffer;
  signature?: Buffer;
  stamp?: Buffer;
  signatoryName?: string;
  signatoryTitle?: string;
}

class InvoiceBrandingService {
  toPublic(row: InvoiceBrandingRow): InvoiceBrandingPublic {
    return {
      logo: row.logo,
      signature: row.signature,
      stamp: row.stamp,
      signatoryName: row.signatory_name,
      signatoryTitle: row.signatory_title,
      updatedAt: row.updated_at,
    };
  }

  async get(): Promise<InvoiceBrandingPublic> {
    return this.toPublic(await invoiceBrandingRepository.get());
  }

  async update(input: UpdateBrandingBody, updatedBy?: number): Promise<InvoiceBrandingPublic> {
    await invoiceBrandingRepository.update(
      {
        ...(input.signatoryName !== undefined && { signatory_name: input.signatoryName }),
        ...(input.signatoryTitle !== undefined && { signatory_title: input.signatoryTitle }),
      },
      updatedBy
    );
    return this.get();
  }

  /** Replaces one image; the old file (or the new one, on failure) is removed. */
  async setImage(kind: BrandingImageKind, filePath: string, updatedBy?: number): Promise<InvoiceBrandingPublic> {
    let previous: string | null;
    try {
      previous = (await invoiceBrandingRepository.get())[kind];
      await invoiceBrandingRepository.update({ [kind]: filePath }, updatedBy);
    } catch (error) {
      await removeUploadFile(filePath);
      throw error;
    }
    if (previous) await removeUploadFile(previous);
    logger.info({ kind, updatedBy }, "Invoice branding image updated");
    return this.get();
  }

  async removeImage(kind: BrandingImageKind, updatedBy?: number): Promise<InvoiceBrandingPublic> {
    const previous = (await invoiceBrandingRepository.get())[kind];
    if (previous) {
      await invoiceBrandingRepository.update({ [kind]: null }, updatedBy);
      await removeUploadFile(previous);
    }
    return this.get();
  }

  async getImageFile(kind: BrandingImageKind): Promise<{ absolutePath: string; contentType: string; filename: string }> {
    const path = (await invoiceBrandingRepository.get())[kind];
    if (!path) throw new ApiError("Image not found", ErrorCodes.NOT_FOUND, 404);
    const filename = path.split("/").pop() ?? `${kind}.png`;
    return {
      absolutePath: resolveUploadAbsolutePath(path),
      contentType: getMimeTypeFromFilename(filename),
      filename,
    };
  }

  /** Loads everything the PDF needs. A missing or unreadable file is left out, never fatal. */
  async getAssets(): Promise<InvoiceBrandingAssets> {
    const row = await invoiceBrandingRepository.get();
    const read = async (path: string | null): Promise<Buffer | undefined> => {
      if (!path) return undefined;
      try {
        return await fs.promises.readFile(resolveUploadAbsolutePath(path));
      } catch (error) {
        logger.warn({ path, err: error }, "Invoice branding image missing");
        return undefined;
      }
    };
    const [logo, signature, stamp] = await Promise.all([read(row.logo), read(row.signature), read(row.stamp)]);
    return {
      logo,
      signature,
      stamp,
      signatoryName: row.signatory_name ?? undefined,
      signatoryTitle: row.signatory_title ?? undefined,
    };
  }
}

export const invoiceBrandingService = new InvoiceBrandingService();
