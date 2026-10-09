import { z } from "zod";
import {
  BillStatuses,
  PayeeTypes,
  VatRates,
} from "../../shared/constants/finance";
import { hasAtMostTwoDecimals } from "../../shared/utils/money.util";
import { idParamSchema } from "../../shared/validators/common.validation";

const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD");

/** Positive AED amount with at most 2 decimals, within DECIMAL(12,2). */
export const moneySchema = z.coerce
  .number()
  .positive()
  .max(9_999_999_999.99)
  .refine(hasAtMostTwoDecimals, "Amount can have at most 2 decimal places");

const vatRateSchema = z.coerce
  .number()
  .refine((rate) => (VatRates as readonly number[]).includes(rate), "VAT rate must be 0 or 5");

const optionalText = (max: number) =>
  z.union([z.string().max(max).trim(), z.null()]).optional();

const billFields = {
  supplierId: z.coerce.number().int().positive(),
  billNo: z.string().min(1).max(50).trim(),
  billDate: dateSchema,
  dueDate: dateSchema,
  subtotalAmount: moneySchema,
  vatRate: vatRateSchema,
  categoryId: z.union([z.coerce.number().int().positive(), z.null()]).optional(),
  description: optionalText(2000),
  notes: optionalText(2000),
};

const dueAfterBill = (data: { billDate?: string; dueDate?: string }) =>
  !data.billDate || !data.dueDate || data.dueDate >= data.billDate;
const dueAfterBillMessage = {
  message: "Due date can't be before the bill date",
  path: ["dueDate"],
};

/** Manual bills are always owed to a supplier; employee bills come from approved expenses. */
export const createBillSchema = z
  .object({
    ...billFields,
    /** Save as a draft, or issue straight away (open). */
    status: z.enum(["draft", "open"]).default("open"),
  })
  .strict()
  .refine(dueAfterBill, dueAfterBillMessage);

export const updateBillSchema = z
  .object({
    supplierId: billFields.supplierId.optional(),
    billNo: billFields.billNo.optional(),
    billDate: dateSchema.optional(),
    dueDate: dateSchema.optional(),
    subtotalAmount: moneySchema.optional(),
    vatRate: vatRateSchema.optional(),
    categoryId: billFields.categoryId,
    description: billFields.description,
    notes: billFields.notes,
  })
  .strict()
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field is required",
  })
  .refine(dueAfterBill, dueAfterBillMessage);

export const billListQuerySchema = z
  .object({
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(100).default(10),
    search: z.string().max(200).optional(),
    sortBy: z.string().optional(),
    order: z.enum(["asc", "desc"]).default("desc"),
    /** "overdue" is virtual: open or partially paid and past the due date. */
    status: z.enum(BillStatuses).optional(),
    payeeType: z.enum(PayeeTypes).optional(),
    supplierId: z.coerce.number().int().positive().optional(),
    employeeId: z.coerce.number().int().positive().optional(),
    dateFrom: dateSchema.optional(),
    dateTo: dateSchema.optional(),
    /** Due-date window, e.g. "due this week". */
    dueFrom: dateSchema.optional(),
    dueTo: dateSchema.optional(),
  })
  .strict();

export const recordPaymentSchema = z
  .object({
    paymentDate: dateSchema,
    amount: moneySchema,
    paymentMethodId: z.coerce.number().int().positive(),
    reference: optionalText(100),
    notes: optionalText(2000),
  })
  .strict();

export const paymentIdParamSchema = z.object({
  id: z.coerce.number().int().positive(),
  paymentId: z.coerce.number().int().positive(),
});

export { idParamSchema };

export type CreateBillBody = z.infer<typeof createBillSchema>;
export type UpdateBillBody = z.infer<typeof updateBillSchema>;
export type BillListQueryParams = z.infer<typeof billListQuerySchema>;
export type RecordPaymentBody = z.infer<typeof recordPaymentSchema>;
export type PaymentIdParam = z.infer<typeof paymentIdParamSchema>;
