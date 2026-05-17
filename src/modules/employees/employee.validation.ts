import { z } from "zod";
import {
  emailSchema,
  idParamSchema,
  passwordSchema,
} from "../../shared/validators/common.validation";
import { EmployeeStatuses } from "./employee.types";

const dateStringSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD");

const optionalDateStringSchema = dateStringSchema.optional().nullable();

const phoneSchema = z.string().min(5).max(30).trim();
const shortTextSchema = z.string().min(1).max(200).trim();
const idDocSchema = z.string().min(1).max(50).trim();

const employeeCoreFields = {
  empName: z.string().min(2).max(150).trim(),
  companyName: shortTextSchema,
  dob: dateStringSchema,
  homeAddress: z.string().min(1).max(500).trim(),
  cityState: z.string().min(1).max(150).trim(),
  country: z.string().min(1).max(100).trim(),
  phoneNo: phoneSchema,
  whatsappNo: phoneSchema.optional(),
  emiratesIdNo: idDocSchema,
  emiratesIdExpiryDate: dateStringSchema,
  visaExpiryDate: dateStringSchema,
  passportNo: idDocSchema,
  passportExpiryDate: dateStringSchema,
  drivingLicenseNo: idDocSchema.optional(),
  drivingLicenseExpiryDate: optionalDateStringSchema,
  email: emailSchema,
  status: z.enum(EmployeeStatuses).optional(),
  comments: z.string().max(2000).trim().optional(),
  role: z.string().min(1).max(50).trim().optional(),
};

export const createEmployeeSchema = z
  .object({
    ...employeeCoreFields,
    password: passwordSchema,
  })
  .strict();

export const updateEmployeeSchema = z
  .object({
    empName: employeeCoreFields.empName.optional(),
    companyName: employeeCoreFields.companyName.optional(),
    dob: dateStringSchema.optional(),
    homeAddress: employeeCoreFields.homeAddress.optional(),
    cityState: employeeCoreFields.cityState.optional(),
    country: employeeCoreFields.country.optional(),
    phoneNo: phoneSchema.optional(),
    whatsappNo: z.union([phoneSchema, z.null()]).optional(),
    emiratesIdNo: idDocSchema.optional(),
    emiratesIdExpiryDate: dateStringSchema.optional(),
    visaExpiryDate: dateStringSchema.optional(),
    passportNo: idDocSchema.optional(),
    passportExpiryDate: dateStringSchema.optional(),
    drivingLicenseNo: z.union([idDocSchema, z.null()]).optional(),
    drivingLicenseExpiryDate: optionalDateStringSchema,
    email: emailSchema.optional(),
    password: passwordSchema.optional(),
    status: z.enum(EmployeeStatuses).optional(),
    comments: z.union([z.string().max(2000).trim(), z.null()]).optional(),
    role: employeeCoreFields.role.optional(),
  })
  .strict()
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field is required",
  });

export const employeeListQuerySchema = z
  .object({
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(100).default(10),
    search: z.string().optional(),
    sortBy: z.string().optional(),
    order: z.enum(["asc", "desc"]).default("desc"),
    status: z.enum(EmployeeStatuses).optional(),
    country: z.string().max(100).optional(),
    cityState: z.string().max(150).optional(),
    companyName: z.string().max(200).optional(),
    createdAtFrom: z.string().optional(),
    createdAtTo: z.string().optional(),
    visaExpiry: dateStringSchema.optional(),
    passportExpiry: dateStringSchema.optional(),
  })
  .strict();

export const employeeExportQuerySchema = employeeListQuerySchema
  .omit({ page: true, limit: true })
  .extend({
    format: z.enum(["csv", "json"]).default("csv"),
  });

export const bulkDeleteSchema = z
  .object({
    ids: z.array(z.coerce.number().int().positive()).min(1).max(500),
  })
  .strict();

export const bulkStatusSchema = z
  .object({
    ids: z.array(z.coerce.number().int().positive()).min(1).max(500),
    status: z.enum(EmployeeStatuses),
  })
  .strict();

export const bulkCreateSchema = z
  .object({
    employees: z.array(createEmployeeSchema).min(1).max(100),
  })
  .strict();

export { idParamSchema };

export type CreateEmployeeBody = z.infer<typeof createEmployeeSchema>;
export type UpdateEmployeeBody = z.infer<typeof updateEmployeeSchema>;
export type EmployeeListQueryParams = z.infer<typeof employeeListQuerySchema>;
export type EmployeeExportQueryParams = z.infer<typeof employeeExportQuerySchema>;
export type BulkDeleteBody = z.infer<typeof bulkDeleteSchema>;
export type BulkStatusBody = z.infer<typeof bulkStatusSchema>;
export type BulkCreateBody = z.infer<typeof bulkCreateSchema>;
