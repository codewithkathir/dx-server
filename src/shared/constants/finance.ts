export const PartyStatuses = ["active", "inactive"] as const;
export type PartyStatus = (typeof PartyStatuses)[number];

export const BillStatuses = [
  "draft",
  "open",
  "partially_paid",
  "paid",
  "overdue",
  "cancelled",
] as const;
export type BillStatus = (typeof BillStatuses)[number];

export const InvoiceStatuses = [
  "draft",
  "sent",
  "partially_paid",
  "paid",
  "overdue",
  "cancelled",
] as const;
export type InvoiceStatus = (typeof InvoiceStatuses)[number];

/**
 * "overdue" exists in the enums for dx_app compatibility but is never stored:
 * it is derived from due_date and balance (see isOverdue in money.util).
 * List filters accept it as a virtual status.
 */
export const StoredBillStatuses = BillStatuses.filter((s) => s !== "overdue");
export const StoredInvoiceStatuses = InvoiceStatuses.filter((s) => s !== "overdue");

export const PayeeTypes = ["supplier", "employee"] as const;
export type PayeeType = (typeof PayeeTypes)[number];

export const BillSources = ["manual", "expense"] as const;
export type BillSource = (typeof BillSources)[number];

/** UAE VAT: standard 5%, or 0% for zero-rated / exempt supplies. */
export const VatRates = [0, 5] as const;
export type VatRate = (typeof VatRates)[number];
export const DEFAULT_VAT_RATE: VatRate = 5;

export const DEFAULT_CURRENCY = "AED";

/** Days until an approved expense reimbursement is due. */
export const EXPENSE_REIMBURSEMENT_DUE_DAYS = 14;
