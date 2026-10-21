import { createInvoiceSchema, updateInvoiceSchema } from "../../../src/modules/receivables/receivable.validation";

const base = {
  customerId: 1,
  invoiceDate: "2026-10-22",
  dueDate: "2026-11-21",
  vatRate: 5,
  lines: [{ productId: 3, quantity: 2.5, unitPrice: 4.5 }],
};

describe("receivable.validation", () => {
  it("accepts product lines with an optional description and subject", () => {
    const result = createInvoiceSchema.safeParse({
      ...base,
      description: "October supplies",
      lines: [...base.lines, { productId: 4, quantity: "1", unitPrice: "75", description: "Delivery – Al Quoz" }],
    });
    expect(result.success).toBe(true);
  });

  it("needs at least one line", () => {
    expect(createInvoiceSchema.safeParse({ ...base, lines: [] }).success).toBe(false);
  });

  it("rejects the old single amount and bad quantities", () => {
    expect(createInvoiceSchema.safeParse({ ...base, subtotalAmount: 100 }).success).toBe(false);
    expect(createInvoiceSchema.safeParse({ ...base, lines: [{ productId: 3, quantity: 0, unitPrice: 4.5 }] }).success).toBe(false);
    expect(createInvoiceSchema.safeParse({ ...base, lines: [{ productId: 3, quantity: 1.0005, unitPrice: 4.5 }] }).success).toBe(false);
  });

  it("lets a draft update replace the lines on their own", () => {
    expect(updateInvoiceSchema.safeParse({ lines: base.lines }).success).toBe(true);
  });
});
