import { z } from "zod";
import {
  AssetCategories,
  AssetConditions,
  AssetStatuses,
  UnassignedAssetStatuses,
} from "../../shared/constants/asset";
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

const assetFields = {
  /** Leave out to get the next automatic number (AST-YYYY-NNNN). */
  assetNo: z
    .string()
    .trim()
    .min(1)
    .max(50)
    .regex(/^[A-Za-z0-9._/-]+$/, "Use letters, numbers, dots, dashes or slashes")
    .optional(),
  name: z.string().trim().min(1, "Name is required").max(150),
  category: z.enum(AssetCategories).default("other"),
  brand: optionalText(100),
  model: optionalText(100),
  serialNo: optionalText(100),
  purchaseDate: dateSchema.nullable().optional(),
  purchaseCost: money.nullable().optional(),
  warrantyExpiry: dateSchema.nullable().optional(),
  condition: z.enum(AssetConditions).default("good"),
  status: z.enum(UnassignedAssetStatuses).default("available"),
  notes: optionalText(2000),
};

export const createAssetSchema = z.object(assetFields).strict();

export const updateAssetSchema = z
  .object({
    assetNo: assetFields.assetNo,
    name: assetFields.name.optional(),
    category: z.enum(AssetCategories).optional(),
    brand: assetFields.brand,
    model: assetFields.model,
    serialNo: assetFields.serialNo,
    purchaseDate: assetFields.purchaseDate,
    purchaseCost: assetFields.purchaseCost,
    warrantyExpiry: assetFields.warrantyExpiry,
    condition: z.enum(AssetConditions).optional(),
    status: z.enum(UnassignedAssetStatuses).optional(),
    notes: assetFields.notes,
  })
  .strict()
  .refine((data) => Object.keys(data).length > 0, { message: "At least one field is required" });

export const assetListQuerySchema = z
  .object({
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(100).default(10),
    search: z.string().trim().max(100).optional(),
    sortBy: z.string().optional(),
    order: z.enum(["asc", "desc"]).default("desc"),
    status: z.enum(AssetStatuses).optional(),
    category: z.enum(AssetCategories).optional(),
    employeeId: z.coerce.number().int().positive().optional(),
  })
  .strict();

export const assignAssetSchema = z
  .object({
    employeeId: z.number().int().positive(),
    assignedDate: dateSchema,
    expectedReturnDate: dateSchema.nullable().optional(),
    /** Defaults to the asset's current condition. */
    condition: z.enum(AssetConditions).optional(),
    notes: optionalText(2000),
  })
  .strict()
  .refine((d) => !d.expectedReturnDate || d.expectedReturnDate >= d.assignedDate, {
    message: "Expected return can't be before the assigned date",
    path: ["expectedReturnDate"],
  });

export const returnAssetSchema = z
  .object({
    returnedDate: dateSchema,
    condition: z.enum(AssetConditions),
    nextStatus: z.enum(UnassignedAssetStatuses).default("available"),
    notes: optionalText(2000),
  })
  .strict();

export const assignmentIdParamSchema = z.object({ assignmentId: z.coerce.number().int().positive() });

export { idParamSchema };

export type CreateAssetBody = z.infer<typeof createAssetSchema>;
export type UpdateAssetBody = z.infer<typeof updateAssetSchema>;
export type AssetListQueryParams = z.infer<typeof assetListQuerySchema>;
export type AssignAssetBody = z.infer<typeof assignAssetSchema>;
export type ReturnAssetBody = z.infer<typeof returnAssetSchema>;
export type AssignmentIdParam = z.infer<typeof assignmentIdParamSchema>;
