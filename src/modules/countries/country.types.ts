export interface CountryRow {
  id: number;
  code: string;
  name: string;
  dial_code: string | null;
  status: "active" | "inactive";
  created_at: Date;
  updated_at: Date;
  deleted_at: Date | null;
}

export interface CountryOption {
  code: string;
  name: string;
  dialCode: string | null;
}

/** A phone number field checked against the record's country. */
export type PhoneFields = Record<string, { label: string; value: string | null | undefined }>;
