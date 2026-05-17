import { z } from "zod";

import { idParamSchema } from "../../shared/validators/common.validation";

const dateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD format");

const expenseFieldsSchema = {
  date: dateSchema,
  amount: z.coerce.number().positive().max(999999999.99),
  whom: z.coerce.number().int().positive(),
  categoryId: z.coerce.number().int().positive(),
  subCategoryId: z.coerce.number().int().positive(),
  subSubCategoryId: z.coerce.number().int().positive().optional().nullable(),
  description: z.string().max(5000).trim().optional().nullable(),
  paymentMethodId: z.coerce.number().int().positive(),
};

export const createExpenseSchema = z.object(expenseFieldsSchema).strict();

export const updateExpenseSchema = z
  .object({
    date: dateSchema.optional(),
    amount: z.coerce.number().positive().max(999999999.99).optional(),
    whom: z.coerce.number().int().positive().optional(),
    categoryId: z.coerce.number().int().positive().optional(),
    subCategoryId: z.coerce.number().int().positive().optional(),
    subSubCategoryId: z
      .union([z.coerce.number().int().positive(), z.null()])
      .optional(),
    description: z.union([z.string().max(5000).trim(), z.null()]).optional(),
    paymentMethodId: z.coerce.number().int().positive().optional(),
  })
  .strict()
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field is required",
  });

export const expenseListQuerySchema = z
  .object({
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(100).default(10),
    search: z.string().optional(),
    sortBy: z.string().optional(),
    order: z.enum(["asc", "desc"]).default("desc"),
    categoryId: z.coerce.number().int().positive().optional(),
    dateFrom: dateSchema.optional(),
    dateTo: dateSchema.optional(),
  })
  .strict()
  .refine(
    (data) => {
      if (data.dateFrom && data.dateTo) {
        return data.dateFrom <= data.dateTo;
      }
      return true;
    },
    { message: "dateFrom must be before or equal to dateTo", path: ["dateTo"] }
  );

export { idParamSchema };

export type CreateExpenseBody = z.infer<typeof createExpenseSchema>;
export type UpdateExpenseBody = z.infer<typeof updateExpenseSchema>;
export type ExpenseListQueryParams = z.infer<typeof expenseListQuerySchema>;
