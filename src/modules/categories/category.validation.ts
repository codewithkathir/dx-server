import { z } from "zod";
import { CatalogStatuses } from "../../shared/constants/catalog";
import { idParamSchema } from "../../shared/validators/common.validation";

export const categoryIdParamSchema = z.object({
  categoryId: z.coerce.number().int().positive(),
});

export const createCategorySchema = z
  .object({
    name: z.string().min(1).max(200).trim(),
    description: z.string().max(2000).trim().optional().nullable(),
    status: z.enum(CatalogStatuses).optional(),
  })
  .strict();

export const updateCategorySchema = z
  .object({
    name: z.string().min(1).max(200).trim().optional(),
    description: z.union([z.string().max(2000).trim(), z.null()]).optional(),
    status: z.enum(CatalogStatuses).optional(),
  })
  .strict()
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field is required",
  });

export const categoryListQuerySchema = z
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

export type CreateCategoryBody = z.infer<typeof createCategorySchema>;
export type UpdateCategoryBody = z.infer<typeof updateCategorySchema>;
export type CategoryListQueryParams = z.infer<typeof categoryListQuerySchema>;
