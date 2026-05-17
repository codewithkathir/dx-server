import { z } from "zod";
import { CatalogStatuses } from "../../shared/constants/catalog";
import { idParamSchema } from "../../shared/validators/common.validation";

export const createSubSubCategorySchema = z
  .object({
    categoryId: z.coerce.number().int().positive(),
    subCategoryId: z.coerce.number().int().positive(),
    name: z.string().min(1).max(200).trim(),
    description: z.string().max(2000).trim().optional().nullable(),
    status: z.enum(CatalogStatuses).optional(),
  })
  .strict();

export const updateSubSubCategorySchema = z
  .object({
    categoryId: z.coerce.number().int().positive().optional(),
    subCategoryId: z.coerce.number().int().positive().optional(),
    name: z.string().min(1).max(200).trim().optional(),
    description: z.union([z.string().max(2000).trim(), z.null()]).optional(),
    status: z.enum(CatalogStatuses).optional(),
  })
  .strict()
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field is required",
  });

export const subSubCategoryListQuerySchema = z
  .object({
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(100).default(10),
    search: z.string().optional(),
    sortBy: z.string().optional(),
    order: z.enum(["asc", "desc"]).default("desc"),
    status: z.enum(CatalogStatuses).optional(),
    categoryId: z.coerce.number().int().positive().optional(),
    subCategoryId: z.coerce.number().int().positive().optional(),
  })
  .strict();

export { idParamSchema };

export type CreateSubSubCategoryBody = z.infer<typeof createSubSubCategorySchema>;
export type UpdateSubSubCategoryBody = z.infer<typeof updateSubSubCategorySchema>;
export type SubSubCategoryListQueryParams = z.infer<
  typeof subSubCategoryListQuerySchema
>;
