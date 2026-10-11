export const BrandingImageKinds = ["logo", "signature", "stamp"] as const;
export type BrandingImageKind = (typeof BrandingImageKinds)[number];

export interface InvoiceBrandingRow {
  id: number;
  logo: string | null;
  signature: string | null;
  stamp: string | null;
  signatory_name: string | null;
  signatory_title: string | null;
  created_at: Date;
  updated_at: Date;
  updated_by: number | null;
}

export interface InvoiceBrandingPublic {
  /** Saved file paths; load them through GET /:kind (an authenticated endpoint). */
  logo: string | null;
  signature: string | null;
  stamp: string | null;
  signatoryName: string | null;
  signatoryTitle: string | null;
  updatedAt: Date;
}
