import { z } from "zod";
import { InvoiceStatuses, VatRates } from "../../shared/constants/finance";
import { idParamSchema } from "../../shared/validators/common.validation";
import { moneySchema } from "../payables/payable.validation";

const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD");
const vatRateSchema = z.coerce
  .number()
  .refine((rate) => (VatRates as readonly number[]).includes(rate), "VAT rate must be 0 or 5");
const optionalText = (max: number) => z.union([z.string().max(max).trim(), z.null()]).optional();

const dueAfterInvoice = (data: { invoiceDate?: string; dueDate?: string }) =>
  !data.invoiceDate || !data.dueDate || data.dueDate >= data.invoiceDate;
const dueAfterInvoiceMessage = {
  message: "Due date can't be before the invoice date",
  path: ["dueDate"],
};

export const createInvoiceSchema = z
  .object({
    customerId: z.coerce.number().int().positive(),
    invoiceDate: dateSchema,
    dueDate: dateSchema,
    subtotalAmount: moneySchema,
    vatRate: vatRateSchema,
    description: z.string().min(1).max(2000).trim(),
    poReference: optionalText(100),
    notes: optionalText(2000),
    /** Keep as a draft, or mark as sent to the customer straight away. */
    status: z.enum(["draft", "sent"]).default("draft"),
  })
  .strict()
  .refine(dueAfterInvoice, dueAfterInvoiceMessage);

export const updateInvoiceSchema = z
  .object({
    customerId: z.coerce.number().int().positive().optional(),
    invoiceDate: dateSchema.optional(),
    dueDate: dateSchema.optional(),
    subtotalAmount: moneySchema.optional(),
    vatRate: vatRateSchema.optional(),
    description: z.string().min(1).max(2000).trim().optional(),
    poReference: optionalText(100),
    notes: optionalText(2000),
  })
  .strict()
  .refine((data) => Object.keys(data).length > 0, { message: "At least one field is required" })
  .refine(dueAfterInvoice, dueAfterInvoiceMessage);

export const invoiceListQuerySchema = z
  .object({
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(100).default(10),
    search: z.string().max(200).optional(),
    sortBy: z.string().optional(),
    order: z.enum(["asc", "desc"]).default("desc"),
    /** "overdue" is virtual: sent or partially paid and past the due date. */
    status: z.enum(InvoiceStatuses).optional(),
    customerId: z.coerce.number().int().positive().optional(),
    dateFrom: dateSchema.optional(),
    dateTo: dateSchema.optional(),
  })
  .strict();

export const recordReceiptSchema = z
  .object({
    receiptDate: dateSchema,
    amount: moneySchema,
    paymentMethodId: z.coerce.number().int().positive(),
    reference: optionalText(100),
    notes: optionalText(2000),
  })
  .strict();

export const receiptIdParamSchema = z.object({
  id: z.coerce.number().int().positive(),
  receiptId: z.coerce.number().int().positive(),
});

export { idParamSchema };

export type CreateInvoiceBody = z.infer<typeof createInvoiceSchema>;
export type UpdateInvoiceBody = z.infer<typeof updateInvoiceSchema>;
export type InvoiceListQueryParams = z.infer<typeof invoiceListQuerySchema>;
export type RecordReceiptBody = z.infer<typeof recordReceiptSchema>;
export type ReceiptIdParam = z.infer<typeof receiptIdParamSchema>;
