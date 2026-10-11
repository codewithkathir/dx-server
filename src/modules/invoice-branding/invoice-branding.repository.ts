import { db } from "../../database/knex";
import type { BrandingImageKind, InvoiceBrandingRow } from "./invoice-branding.types";

const TABLE = "invoice_branding";
/** The table holds a single row. */
const ROW_ID = 1;

class InvoiceBrandingRepository {
  async get(): Promise<InvoiceBrandingRow> {
    const row = (await db(TABLE).where({ id: ROW_ID }).first()) as InvoiceBrandingRow | undefined;
    if (row) return row;
    await db(TABLE).insert({ id: ROW_ID });
    return (await db(TABLE).where({ id: ROW_ID }).first()) as InvoiceBrandingRow;
  }

  async update(
    data: Partial<Pick<InvoiceBrandingRow, BrandingImageKind | "signatory_name" | "signatory_title">>,
    updatedBy?: number
  ): Promise<void> {
    await this.get();
    await db(TABLE)
      .where({ id: ROW_ID })
      .update({ ...data, updated_at: db.fn.now(), updated_by: updatedBy ?? null });
  }
}

export const invoiceBrandingRepository = new InvoiceBrandingRepository();
