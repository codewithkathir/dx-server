import { amountInWords } from "../../../src/modules/receivables/invoice-pdf";

describe("amountInWords", () => {
  it("spells dirhams and fils", () => {
    expect(amountInWords(13125.5, "AED")).toBe(
      "UAE Dirhams Thirteen Thousand One Hundred Twenty-Five and Fils Fifty Only"
    );
  });
  it("omits fils for whole amounts", () => {
    expect(amountInWords(1000000, "AED")).toBe("UAE Dirhams One Million Only");
  });
  it("handles zero and other currencies", () => {
    expect(amountInWords(0, "AED")).toBe("UAE Dirhams Zero Only");
    expect(amountInWords(19.05, "USD")).toBe("USD Nineteen and Cents Five Only");
  });
});
