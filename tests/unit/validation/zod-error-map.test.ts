import { z } from "zod";
import { fieldErrorMap, fieldLabel } from "../../../src/shared/validators/zod-error-map";

const messages = (schema: z.ZodTypeAny, input: unknown): Record<string, string> => {
  const result = schema.safeParse(input, { errorMap: fieldErrorMap });
  if (result.success) return {};
  return Object.fromEntries(result.error.errors.map((e) => [e.path.join(".") || "_", e.message]));
};

describe("fieldErrorMap", () => {
  const schema = z
    .object({
      phoneNo: z.string().min(5).max(30),
      email: z.string().email(),
      companyName: z.string().min(1),
      status: z.enum(["active", "inactive"]),
      amount: z.number().positive(),
      custom: z.string().max(3, "Keep it short"),
    })
    .strict();

  it("names the field in each message", () => {
    const result = messages(schema, {
      phoneNo: "1".repeat(31),
      email: "nope",
      companyName: "",
      status: "x",
      amount: 0,
      custom: "long",
      extra: true,
    });

    expect(result.phoneNo).toBe("Phone number is too long (maximum is 30 characters)");
    expect(result.email).toBe("Email is not a valid email address");
    expect(result.companyName).toBe("Company name can't be blank");
    expect(result.status).toBe("Status must be one of: active, inactive");
    expect(result.amount).toBe("Amount must be greater than 0");
    expect(result.custom).toBe("Keep it short");
    expect(result._).toBe("Unknown field(s): extra");
  });

  it("reports missing and too-short values", () => {
    expect(messages(schema.pick({ phoneNo: true }), {}).phoneNo).toBe("Phone number can't be blank");
    expect(messages(schema.pick({ phoneNo: true }), { phoneNo: "12" }).phoneNo).toBe(
      "Phone number is too short (minimum is 5 characters)"
    );
  });

  it("builds labels from camelCase and nested paths", () => {
    expect(fieldLabel(["cityState"])).toBe("City state");
    expect(fieldLabel(["items", 0, "trn"])).toBe("TRN");
    expect(fieldLabel([])).toBe("Value");
  });
});
