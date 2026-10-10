import { z, type ZodErrorMap } from "zod";

/** Labels for field names that don't read well when split from camelCase. */
const FIELD_LABELS: Record<string, string> = {
  dob: "Date of birth",
  trn: "TRN",
  phone: "Phone number",
  phoneNo: "Phone number",
  phone1: "Phone number",
  phone2: "Second phone number",
  whatsappNo: "WhatsApp number",
  emiratesIdNo: "Emirates ID number",
  emiratesIdExpiryDate: "Emirates ID expiry date",
  passportNo: "Passport number",
  drivingLicenseNo: "Driving license number",
  billNo: "Bill number",
  invoiceNo: "Invoice number",
  poReference: "PO reference",
  vatRate: "VAT rate",
  empName: "Name",
  contactName1: "Contact name",
  subtotalAmount: "Amount",
  supplierId: "Supplier",
  customerId: "Customer",
  categoryId: "Category",
  subCategoryId: "Sub-category",
  subSubCategoryId: "Sub-sub-category",
  paymentMethodId: "Payment method",
  whom: "Paid to",
};

/** "phoneNo" → "Phone number", "cityState" → "City state". */
export function fieldLabel(path: (string | number)[]): string {
  const key = [...path].reverse().find((p): p is string => typeof p === "string");
  if (!key) return "Value";
  if (FIELD_LABELS[key]) return FIELD_LABELS[key];
  const words = key.replace(/([a-z0-9])([A-Z])/g, "$1 $2").replace(/[_-]+/g, " ").toLowerCase();
  return words.charAt(0).toUpperCase() + words.slice(1);
}

/**
 * Field-aware default messages ("Phone number can't be blank",
 * "Phone number is too long (maximum is 30 characters)"). Schemas that pass
 * their own message keep it.
 */
export const fieldErrorMap: ZodErrorMap = (issue, ctx) => {
  const label = fieldLabel(issue.path);

  switch (issue.code) {
    case z.ZodIssueCode.invalid_type:
      if (issue.received === "undefined" || issue.received === "null") {
        return { message: `${label} can't be blank` };
      }
      return { message: `${label} is invalid` };
    case z.ZodIssueCode.too_small:
      if (issue.type === "string") {
        return {
          message:
            issue.minimum === 1
              ? `${label} can't be blank`
              : `${label} is too short (minimum is ${issue.minimum} characters)`,
        };
      }
      if (issue.type === "number") {
        return { message: `${label} must be greater than ${issue.inclusive ? "or equal to " : ""}${issue.minimum}` };
      }
      if (issue.type === "array") {
        return { message: `${label} must have at least ${issue.minimum} item(s)` };
      }
      break;
    case z.ZodIssueCode.too_big:
      if (issue.type === "string") {
        return { message: `${label} is too long (maximum is ${issue.maximum} characters)` };
      }
      if (issue.type === "number") {
        return { message: `${label} must be less than ${issue.inclusive ? "or equal to " : ""}${issue.maximum}` };
      }
      break;
    case z.ZodIssueCode.invalid_string:
      if (issue.validation === "email") return { message: `${label} is not a valid email address` };
      return { message: `${label} is invalid` };
    case z.ZodIssueCode.invalid_enum_value:
      return { message: `${label} must be one of: ${issue.options.join(", ")}` };
    case z.ZodIssueCode.invalid_date:
      return { message: `${label} is not a valid date` };
    case z.ZodIssueCode.unrecognized_keys:
      return { message: `Unknown field(s): ${issue.keys.join(", ")}` };
    default:
      break;
  }
  return { message: ctx.defaultError };
};
