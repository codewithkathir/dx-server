import { z } from "zod";
import { idParamSchema } from "../../shared/validators/common.validation";
import { moneySchema } from "../payables/payable.validation";
import {
  partyFields,
  partyListQueryFields,
} from "../../shared/validators/party.validation";

/** UAE Tax Registration Number: 15 digits. */
const trnSchema = z.string().trim().regex(/^\d{15}$/, "TRN must be 15 digits");

const customerFields = {
  ...partyFields,
  trn: z.union([trnSchema, z.null()]).optional(),
  creditLimit: z.union([moneySchema, z.null()]).optional(),
  paymentTerms: z.union([z.string().max(100).trim(), z.null()]).optional(),
};

export const createCustomerSchema = z.object(customerFields).strict();

export const updateCustomerSchema = z
  .object({ ...customerFields, companyName: partyFields.companyName.optional() })
  .strict()
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field is required",
  });

export const customerListQuerySchema = z.object(partyListQueryFields).strict();

export { idParamSchema };

export type CreateCustomerBody = z.infer<typeof createCustomerSchema>;
export type UpdateCustomerBody = z.infer<typeof updateCustomerSchema>;
export type CustomerListQueryParams = z.infer<typeof customerListQuerySchema>;
