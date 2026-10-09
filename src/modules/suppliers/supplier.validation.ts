import { z } from "zod";
import { idParamSchema } from "../../shared/validators/common.validation";
import {
  partyFields,
  partyListQueryFields,
} from "../../shared/validators/party.validation";

export const createSupplierSchema = z.object(partyFields).strict();

export const updateSupplierSchema = z
  .object({ ...partyFields, companyName: partyFields.companyName.optional() })
  .strict()
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field is required",
  });

export const supplierListQuerySchema = z.object(partyListQueryFields).strict();

export { idParamSchema };

export type CreateSupplierBody = z.infer<typeof createSupplierSchema>;
export type UpdateSupplierBody = z.infer<typeof updateSupplierSchema>;
export type SupplierListQueryParams = z.infer<typeof supplierListQuerySchema>;
