import {
  assertPhonesMatchCountry,
  countryCodeFor,
  isValidPhoneForCountry,
} from "../../../src/shared/utils/phone.util";

describe("phone.util", () => {
  describe("countryCodeFor", () => {
    it("maps full names, short names and ISO codes", () => {
      expect(countryCodeFor("United Arab Emirates")).toBe("AE");
      expect(countryCodeFor("UAE")).toBe("AE");
      expect(countryCodeFor("in")).toBe("IN");
    });
    it("returns undefined for blank or unknown countries", () => {
      expect(countryCodeFor("")).toBeUndefined();
      expect(countryCodeFor("Narnia")).toBeUndefined();
    });
  });

  describe("isValidPhoneForCountry", () => {
    it("accepts national and international numbers of the country", () => {
      expect(isValidPhoneForCountry("050 123 4567", "United Arab Emirates")).toBe(true);
      expect(isValidPhoneForCountry("+971 50 123 4567", "United Arab Emirates")).toBe(true);
      expect(isValidPhoneForCountry("98765 43210", "India")).toBe(true);
    });
    it("rejects numbers from another country or too short", () => {
      expect(isValidPhoneForCountry("+91 98765 43210", "United Arab Emirates")).toBe(false);
      expect(isValidPhoneForCountry("12345", "United Arab Emirates")).toBe(false);
    });
    it("needs the country code when no country is known", () => {
      expect(isValidPhoneForCountry("+971501234567", null)).toBe(true);
      expect(isValidPhoneForCountry("0501234567", null)).toBe(false);
    });
  });

  describe("assertPhonesMatchCountry", () => {
    it("skips fields that are left out or cleared", () => {
      expect(() =>
        assertPhonesMatchCountry("United Arab Emirates", {
          phoneNo: { label: "Phone number", value: undefined },
          whatsappNo: { label: "WhatsApp number", value: null },
        })
      ).not.toThrow();
    });
    it("reports each invalid field", () => {
      expect(() =>
        assertPhonesMatchCountry("United Arab Emirates", {
          phoneNo: { label: "Phone number", value: "12345" },
        })
      ).toThrow("Phone number isn't a valid United Arab Emirates number");
    });
  });
});
