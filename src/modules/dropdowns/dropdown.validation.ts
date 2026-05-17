import { z } from "zod";

export const subCategoryDropdownQuerySchema = z
  .object({
    categoryId: z.coerce.number().int().positive(),
  })
  .strict();

export const subSubCategoryDropdownQuerySchema = z
  .object({
    categoryId: z.coerce.number().int().positive().optional(),
    subCategoryId: z.coerce.number().int().positive().optional(),
  })
  .strict();

export type SubCategoryDropdownQueryParams = z.infer<
  typeof subCategoryDropdownQuerySchema
>;
export type SubSubCategoryDropdownQueryParams = z.infer<
  typeof subSubCategoryDropdownQuerySchema
>;
