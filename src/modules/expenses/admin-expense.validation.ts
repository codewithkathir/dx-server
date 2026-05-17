import { z } from "zod";

import { AdminExpenseStatuses } from "../../shared/constants/expense";
import { idParamSchema } from "../../shared/validators/common.validation";

const dateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD format");

export const adminExpenseListQuerySchema = z
  .object({
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(100).default(10),
    search: z.string().optional(),
    sortBy: z.string().optional(),
    order: z.enum(["asc", "desc"]).default("desc"),
    employeeId: z.coerce.number().int().positive().optional(),
    status: z.enum(AdminExpenseStatuses).optional(),
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

export const adminExpenseSummaryQuerySchema = z
  .object({
    employeeId: z.coerce.number().int().positive().optional(),
    status: z.enum(AdminExpenseStatuses).optional(),
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

export const updateAdminExpenseStatusSchema = z
  .object({
    adminStatus: z.enum(AdminExpenseStatuses),
  })
  .strict();

export { idParamSchema };

export type AdminExpenseListQueryParams = z.infer<
  typeof adminExpenseListQuerySchema
>;
export type AdminExpenseSummaryQueryParams = z.infer<
  typeof adminExpenseSummaryQuerySchema
>;
export type UpdateAdminExpenseStatusBody = z.infer<
  typeof updateAdminExpenseStatusSchema
>;
