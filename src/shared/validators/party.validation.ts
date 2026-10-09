import { z } from "zod";
import { PartyStatuses } from "../constants/finance";
import { emailSchema } from "./common.validation";

const optionalText = (max: number) =>
  z.union([z.string().max(max).trim(), z.null()]).optional();
const optionalPhone = z.union([z.string().min(5).max(30).trim(), z.null()]).optional();

/** Contact fields shared by suppliers and customers (dx_app design). */
export const partyFields = {
  companyName: z.string().min(1).max(200).trim(),
  contactName1: optionalText(150),
  contactName2: optionalText(150),
  companyAddress: optionalText(1000),
  cityState: optionalText(150),
  country: optionalText(100),
  phone1: optionalPhone,
  phone2: optionalPhone,
  email: z.union([emailSchema, z.null()]).optional(),
  whatsappNo: optionalPhone,
  status: z.enum(PartyStatuses).optional(),
  comments: optionalText(2000),
};

export const partyListQueryFields = {
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(10),
  search: z.string().optional(),
  sortBy: z.string().optional(),
  order: z.enum(["asc", "desc"]).default("desc"),
  status: z.enum(PartyStatuses).optional(),
};

/** Maps camelCase party input to snake_case columns (only keys that are present). */
export function partyInputToRow(input: Record<string, unknown>): Record<string, unknown> {
  const map: Record<string, string> = {
    companyName: "company_name",
    contactName1: "contact_name_1",
    contactName2: "contact_name_2",
    companyAddress: "company_address",
    cityState: "city_state",
    country: "country",
    phone1: "phone_1",
    phone2: "phone_2",
    email: "email",
    whatsappNo: "whatsapp_no",
    status: "status",
    comments: "comments",
  };
  const row: Record<string, unknown> = {};
  for (const [key, column] of Object.entries(map)) {
    if (input[key] !== undefined) row[column] = input[key];
  }
  return row;
}
