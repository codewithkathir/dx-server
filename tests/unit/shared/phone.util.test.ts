import { assertPhonesMatchCountry, isValidPhoneForCountry } from "../../../src/shared/utils/phone.util";

const UAE = { code: "AE", name: "United Arab Emirates" };

describe("phone.util", () => {
  describe("isValidPhoneForCountry", () => {
    it("accepts national and international numbers of the country", () => {
      expect(isValidPhoneForCountry("050 123 4567", "AE")).toBe(true);
      expect(isValidPhoneForCountry("+971 50 123 4567", "ae")).toBe(true);
      expect(isValidPhoneForCountry("98765 43210", "IN")).toBe(true);
    });
    it("rejects numbers from another country or too short", () => {
      expect(isValidPhoneForCountry("+91 98765 43210", "AE")).toBe(false);
      expect(isValidPhoneForCountry("12345", "AE")).toBe(false);
    });
    it("needs the country code when no country is known", () => {
      expect(isValidPhoneForCountry("+971501234567", null)).toBe(true);
      expect(isValidPhoneForCountry("0501234567", null)).toBe(false);
    });
  });

  describe("assertPhonesMatchCountry", () => {
    it("skips fields that are left out or cleared", () => {
      expect(() =>
        assertPhonesMatchCountry(UAE, {
          phoneNo: { label: "Phone number", value: undefined },
          whatsappNo: { label: "WhatsApp number", value: null },
        })
      ).not.toThrow();
    });
    it("reports each invalid field with the country's name", () => {
      expect(() =>
        assertPhonesMatchCountry(UAE, {
          phoneNo: { label: "Phone number", value: "12345" },
        })
      ).toThrow("Phone number isn't a valid United Arab Emirates number");
    });
    it("asks for the dialling code when there is no country", () => {
      expect(() =>
        assertPhonesMatchCountry(null, { phoneNo: { label: "Phone number", value: "0501234567" } })
      ).toThrow("Phone number must include the country code");
    });
  });
});
