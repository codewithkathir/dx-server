import { z } from "zod";
import { CatalogStatuses } from "../../shared/constants/catalog";
import { idParamSchema } from "../../shared/validators/common.validation";

export const createPaymentMethodSchema = z
  .object({
    name: z.string().min(1).max(150).trim(),
    code: z.string().min(1).max(50).trim().optional().nullable(),
    description: z.string().max(2000).trim().optional().nullable(),
    status: z.enum(CatalogStatuses).optional(),
    sortOrder: z.coerce.number().int().min(0).max(9999).optional(),
  })
  .strict();

export const updatePaymentMethodSchema = z
  .object({
    name: z.string().min(1).max(150).trim().optional(),
    code: z.union([z.string().min(1).max(50).trim(), z.null()]).optional(),
    description: z.union([z.string().max(2000).trim(), z.null()]).optional(),
    status: z.enum(CatalogStatuses).optional(),
    sortOrder: z.coerce.number().int().min(0).max(9999).optional(),
  })
  .strict()
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field is required",
  });

export const paymentMethodListQuerySchema = z
  .object({
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(100).default(10),
    search: z.string().optional(),
    sortBy: z.string().optional(),
    order: z.enum(["asc", "desc"]).default("desc"),
    status: z.enum(CatalogStatuses).optional(),
  })
  .strict();

export { idParamSchema };

export type CreatePaymentMethodBody = z.infer<typeof createPaymentMethodSchema>;
export type UpdatePaymentMethodBody = z.infer<typeof updatePaymentMethodSchema>;
export type PaymentMethodListQueryParams = z.infer<
  typeof paymentMethodListQuerySchema
>;
