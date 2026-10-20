import { z } from "zod";
import { AssetCategories } from "../../shared/constants/asset";
import { ServiceTypeStatuses } from "../../shared/constants/asset-maintenance";
import { ExpenseStages } from "../../shared/constants/expense";
import { hasAtMostTwoDecimals } from "../../shared/utils/money.util";
import { idParamSchema } from "../../shared/validators/common.validation";

const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD format");
const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .nullable()
    .optional()
    .transform((v) => (v === "" ? null : v));
const money = z
  .number()
  .min(0)
  .max(999999999.99)
  .refine(hasAtMostTwoDecimals, "Use at most 2 decimals");
/** Odometers top out well below this; it guards against typos like an extra zero or two. */
const km = z.number().int().min(0).max(9999999);
const interval = z.number().int().positive().max(100000);

const listQuery = {
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(10),
  sortBy: z.string().optional(),
  order: z.enum(["asc", "desc"]).default("desc"),
};

// ── Service types ────────────────────────────────────────────────────────────

const serviceTypeFields = {
  code: z
    .string()
    .trim()
    .min(1)
    .max(30)
    .regex(/^[A-Za-z0-9_]+$/, "Use letters, numbers or underscores")
    .transform((v) => v.toUpperCase()),
  name: z.string().trim().min(1, "Name is required").max(100),
  /** Leave empty to offer the type for every asset category. */
  category: z.enum(AssetCategories).nullable().optional(),
  intervalDays: interval.nullable().optional(),
  intervalKm: interval.nullable().optional(),
  sortOrder: z.number().int().min(0).max(9999).optional(),
  status: z.enum(ServiceTypeStatuses).optional(),
};

export const createServiceTypeSchema = z.object(serviceTypeFields).strict();

export const updateServiceTypeSchema = z
  .object({
    ...serviceTypeFields,
    code: serviceTypeFields.code.optional(),
    name: serviceTypeFields.name.optional(),
  })
  .strict()
  .refine((data) => Object.keys(data).length > 0, { message: "At least one field is required" });

export const serviceTypeListQuerySchema = z
  .object({
    ...listQuery,
    limit: z.coerce.number().int().positive().max(100).default(100),
    order: z.enum(["asc", "desc"]).default("asc"),
    search: z.string().trim().max(100).optional(),
    status: z.enum(ServiceTypeStatuses).optional(),
    /** Types for this category plus the ones that apply to every category. */
    category: z.enum(AssetCategories).optional(),
  })
  .strict();

// ── Service records ──────────────────────────────────────────────────────────

const serviceRecordFields = {
  serviceTypeId: z.number().int().positive(),
  employeeId: z.number().int().positive().nullable().optional(),
  startDate: dateSchema,
  /** Leave out to use start date + the type's interval; send null for "no due date". */
  endDate: dateSchema.nullable().optional(),
  odometerKm: km.nullable().optional(),
  /** Leave out to use odometer + the type's km interval. */
  nextDueKm: km.nullable().optional(),
  cost: money.nullable().optional(),
  referenceNo: optionalText(100),
  notes: optionalText(2000),
  /** Accept an odometer lower than an earlier reading (replaced or reset odometer). */
  allowOdometerDecrease: z.boolean().optional(),
};

const datesInOrder = (d: { startDate?: string; endDate?: string | null }) =>
  !d.startDate || !d.endDate || d.endDate >= d.startDate;
const kmInOrder = (d: { odometerKm?: number | null; nextDueKm?: number | null }) =>
  d.odometerKm == null || d.nextDueKm == null || d.nextDueKm > d.odometerKm;

export const createServiceRecordSchema = z
  .object(serviceRecordFields)
  .strict()
  .refine(datesInOrder, { message: "The end date can't be before the start date", path: ["endDate"] })
  .refine(kmInOrder, { message: "Next due km must be more than the odometer reading", path: ["nextDueKm"] });

export const updateServiceRecordSchema = z
  .object({
    ...serviceRecordFields,
    serviceTypeId: serviceRecordFields.serviceTypeId.optional(),
    startDate: serviceRecordFields.startDate.optional(),
  })
  .strict()
  .refine((data) => Object.keys(data).length > 0, { message: "At least one field is required" })
  .refine(datesInOrder, { message: "The end date can't be before the start date", path: ["endDate"] })
  .refine(kmInOrder, { message: "Next due km must be more than the odometer reading", path: ["nextDueKm"] });

export const serviceRecordListQuerySchema = z
  .object({
    ...listQuery,
    serviceTypeId: z.coerce.number().int().positive().optional(),
  })
  .strict();

export const serviceRecordParamSchema = z.object({
  id: z.coerce.number().int().positive(),
  recordId: z.coerce.number().int().positive(),
});

// ── Odometer readings ────────────────────────────────────────────────────────

export const createOdometerReadingSchema = z
  .object({
    readingKm: km,
    readingDate: dateSchema,
    employeeId: z.number().int().positive().nullable().optional(),
    notes: optionalText(255),
    allowDecrease: z.boolean().optional(),
  })
  .strict();

/** Employee app: the reading is always for today's driver, so no employee or override. */
export const employeeOdometerReadingSchema = z
  .object({
    readingKm: km,
    /** Defaults to today. */
    readingDate: dateSchema.optional(),
    notes: optionalText(255),
  })
  .strict();

export const odometerReadingListQuerySchema = z.object(listQuery).strict();

export const odometerReadingParamSchema = z.object({
  id: z.coerce.number().int().positive(),
  readingId: z.coerce.number().int().positive(),
});

export const vehicleExpenseListQuerySchema = z
  .object({
    ...listQuery,
    stage: z.enum(ExpenseStages).optional(),
    dateFrom: dateSchema.optional(),
    dateTo: dateSchema.optional(),
  })
  .strict();

export const assignmentIdParamSchema = z.object({ assignmentId: z.coerce.number().int().positive() });

export { idParamSchema };

export type CreateServiceTypeBody = z.infer<typeof createServiceTypeSchema>;
export type UpdateServiceTypeBody = z.infer<typeof updateServiceTypeSchema>;
export type ServiceTypeListQueryParams = z.infer<typeof serviceTypeListQuerySchema>;
export type CreateServiceRecordBody = z.infer<typeof createServiceRecordSchema>;
export type UpdateServiceRecordBody = z.infer<typeof updateServiceRecordSchema>;
export type ServiceRecordListQueryParams = z.infer<typeof serviceRecordListQuerySchema>;
export type ServiceRecordParam = z.infer<typeof serviceRecordParamSchema>;
export type CreateOdometerReadingBody = z.infer<typeof createOdometerReadingSchema>;
export type EmployeeOdometerReadingBody = z.infer<typeof employeeOdometerReadingSchema>;
export type OdometerReadingListQueryParams = z.infer<typeof odometerReadingListQuerySchema>;
export type OdometerReadingParam = z.infer<typeof odometerReadingParamSchema>;
export type AssignmentIdParam = z.infer<typeof assignmentIdParamSchema>;
export type VehicleExpenseListQueryParams = z.infer<typeof vehicleExpenseListQuerySchema>;
