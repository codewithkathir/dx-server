/**
 * Money helpers. All arithmetic is done in integer fils (1 AED = 100 fils) so
 * floating-point errors can't creep into balances. The database stores
 * DECIMAL(12,2); mysql2 returns those as strings like "250.50".
 */

export type Fils = number;

const MONEY_PATTERN = /^-?\d+(\.\d{1,2})?$/;

/** Parse a DECIMAL string or a number with at most 2 decimals into fils. */
export function toFils(value: string | number): Fils {
  if (typeof value === "number") {
    const fils = Math.round(value * 100);
    if (!Number.isFinite(value) || Math.abs(value * 100 - fils) > 1e-6) {
      throw new Error(`Invalid money amount: ${value}`);
    }
    return fils;
  }
  const text = value.trim();
  if (!MONEY_PATTERN.test(text)) {
    throw new Error(`Invalid money amount: ${value}`);
  }
  const negative = text.startsWith("-");
  const [whole = "0", fraction = ""] = text.replace("-", "").split(".");
  const fils = Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
  return negative ? -fils : fils;
}

/** Fils → number with 2 decimals (for JSON responses and DB writes). */
export function fromFils(fils: Fils): number {
  return fils / 100;
}

/** Fils → "1234.50" (exact string for DECIMAL columns). */
export function filsToDecimalString(fils: Fils): string {
  const sign = fils < 0 ? "-" : "";
  const abs = Math.abs(fils);
  return `${sign}${Math.floor(abs / 100)}.${String(abs % 100).padStart(2, "0")}`;
}

/** True when a number has at most 2 decimal places (for validation). */
export function hasAtMostTwoDecimals(value: number): boolean {
  return Number.isFinite(value) && Math.abs(value * 100 - Math.round(value * 100)) < 1e-6;
}

/** VAT on a subtotal, rounded half-up to the nearest fils. `ratePercent` e.g. 5. */
export function calculateVat(subtotal: Fils, ratePercent: number): Fils {
  return Math.round((subtotal * ratePercent) / 100);
}

export interface DocumentTotals {
  subtotal: Fils;
  vat: Fils;
  total: Fils;
}

export function calculateTotals(subtotal: Fils, ratePercent: number): DocumentTotals {
  const vat = calculateVat(subtotal, ratePercent);
  return { subtotal, vat, total: subtotal + vat };
}

export type SettlementStatus = "draft" | "open" | "sent" | "partially_paid" | "paid" | "cancelled";

/**
 * Status after a settlement change. Drafts and cancelled documents keep their
 * status; otherwise it follows how much of the total has been settled.
 * `unpaidStatus` is "open" for bills and "sent" for invoices.
 */
export function deriveSettlementStatus(
  current: SettlementStatus,
  total: Fils,
  settled: Fils,
  unpaidStatus: "open" | "sent"
): SettlementStatus {
  if (current === "cancelled" || current === "draft") return current;
  if (settled <= 0) return unpaidStatus;
  if (settled < total) return "partially_paid";
  return "paid";
}

/** Today's date as YYYY-MM-DD in the server's local timezone (not UTC). */
export function todayIso(now: Date = new Date()): string {
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
}

/** Add days to a YYYY-MM-DD date, returning YYYY-MM-DD. */
export function addDaysIso(date: string, days: number): string {
  const [year, month, day] = date.split("-").map(Number) as [number, number, number];
  const result = new Date(Date.UTC(year, month - 1, day + days));
  return result.toISOString().slice(0, 10);
}

/** Overdue = past its due date with money still outstanding. */
export function isOverdue(
  status: SettlementStatus,
  dueDate: string,
  balance: Fils,
  today: string = todayIso()
): boolean {
  if (status === "draft" || status === "cancelled") return false;
  return balance > 0 && dueDate < today;
}
