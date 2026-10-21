import { countries } from "countries-list";
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

/** ISO 3166-1 alpha-2 code, as served by the country API ("ae" → "AE"). */
export const countryCodeSchema = z
  .string()
  .trim()
  .toUpperCase()
  .refine((code) => Object.hasOwn(countries, code), { message: "Must be a valid ISO country code, e.g. AE" });

export const passwordSchema = z.string().min(8).max(128);

export type PaginationQuery = z.infer<typeof paginationQuerySchema>;
export type IdParam = z.infer<typeof idParamSchema>;
