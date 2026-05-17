import { z } from "zod";

export const idParamSchema = z.object({
  id: z.coerce.number().int().positive(),
});

export const paginationQuerySchema = z
  .object({
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(100).default(10),
    search: z.string().optional(),
    sortBy: z.string().optional(),
    order: z.enum(["asc", "desc"]).default("desc"),
    status: z.string().optional(),
    startDate: z.string().datetime().optional(),
    endDate: z.string().datetime().optional(),
  })
  .strict();

export const emailSchema = z.string().email().toLowerCase().trim();

export const passwordSchema = z.string().min(8).max(128);

export type PaginationQuery = z.infer<typeof paginationQuerySchema>;
export type IdParam = z.infer<typeof idParamSchema>;
