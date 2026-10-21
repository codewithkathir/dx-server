import { z } from "zod";
import { CatalogStatuses } from "../../shared/constants/catalog";
import { idParamSchema } from "../../shared/validators/common.validation";
import { moneySchema } from "../payables/payable.validation";

const optionalText = (max: number) => z.union([z.string().max(max).trim(), z.null()]).optional();

export const createProductSchema = z
  .object({
    code: z.union([z.string().min(1).max(50).trim(), z.null()]).optional(),
    name: z.string().min(1).max(200).trim(),
    unit: z.string().min(1).max(20).trim().default("pcs"),
    unitPrice: moneySchema,
    description: optionalText(2000),
    status: z.enum(CatalogStatuses).optional(),
  })
  .strict();

export const updateProductSchema = z
  .object({
    code: z.union([z.string().min(1).max(50).trim(), z.null()]).optional(),
    name: z.string().min(1).max(200).trim().optional(),
    unit: z.string().min(1).max(20).trim().optional(),
    unitPrice: moneySchema.optional(),
    description: optionalText(2000),
    status: z.enum(CatalogStatuses).optional(),
  })
  .strict()
  .refine((data) => Object.keys(data).length > 0, { message: "At least one field is required" });

export const productListQuerySchema = z
  .object({
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(100).default(10),
    search: z.string().max(200).optional(),
    sortBy: z.string().optional(),
    order: z.enum(["asc", "desc"]).default("desc"),
    status: z.enum(CatalogStatuses).optional(),
  })
  .strict();

export { idParamSchema };

export type CreateProductBody = z.infer<typeof createProductSchema>;
export type UpdateProductBody = z.infer<typeof updateProductSchema>;
export type ProductListQueryParams = z.infer<typeof productListQuerySchema>;
