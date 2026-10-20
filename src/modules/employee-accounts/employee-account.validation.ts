import { z } from "zod";
import { hasAtMostTwoDecimals } from "../../shared/utils/money.util";

const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD format");
const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .nullable()
    .optional()
    .transform((v) => (v === "" ? null : v));
const positiveMoney = z
  .number()
  .positive("Enter an amount above 0")
  .max(999999999.99)
  .refine(hasAtMostTwoDecimals, "Use at most 2 decimals");

export const employeeIdParamSchema = z.object({ employeeId: z.coerce.number().int().positive() });
export const entryIdParamSchema = z.object({ entryId: z.coerce.number().int().positive() });

export const accountListQuerySchema = z
  .object({
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(100).default(10),
    search: z.string().trim().max(100).optional(),
    sortBy: z.enum(["balance", "name", "last_activity", "owed"]).default("balance"),
    order: z.enum(["asc", "desc"]).default("desc"),
    /** holding = has advance money; owed = company owes them; active = has either. */
    show: z.enum(["all", "holding", "owed", "active"]).default("all"),
  })
  .strict();

export const entryListQuerySchema = z
  .object({
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(100).default(20),
    dateFrom: dateSchema.optional(),
    dateTo: dateSchema.optional(),
    includeVoided: z
      .enum(["true", "false"])
      .default("false")
      .transform((v) => v === "true"),
  })
  .strict();

/** Giving an advance, or recording money handed back. */
export const cashEntrySchema = z
  .object({
    amount: positiveMoney,
    entryDate: dateSchema,
    paymentMethodId: z.number().int().positive(),
    reference: optionalText(100),
    notes: optionalText(2000),
  })
  .strict();

/** A correction either way; the reason is required. */
export const adjustmentSchema = z
  .object({
    amount: z
      .number()
      .min(-999999999.99)
      .max(999999999.99)
      .refine((v) => v !== 0, "Enter a non-zero amount")
      .refine(hasAtMostTwoDecimals, "Use at most 2 decimals"),
    entryDate: dateSchema,
    notes: z.string().trim().min(1, "Say why the balance is being adjusted").max(2000),
  })
  .strict();

export const voidEntrySchema = z
  .object({ reason: z.string().trim().min(1, "Say why this entry is voided").max(255) })
  .strict();

export type AccountListQueryParams = z.infer<typeof accountListQuerySchema>;
export type EntryListQueryParams = z.infer<typeof entryListQuerySchema>;
export type CashEntryBody = z.infer<typeof cashEntrySchema>;
export type AdjustmentBody = z.infer<typeof adjustmentSchema>;
export type VoidEntryBody = z.infer<typeof voidEntrySchema>;
export type EmployeeIdParam = z.infer<typeof employeeIdParamSchema>;
export type EntryIdParam = z.infer<typeof entryIdParamSchema>;
