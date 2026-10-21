jest.mock("../../../../src/modules/countries/country.repository");

import { countryService } from "../../../../src/modules/countries/country.service";
import { countryRepository } from "../../../../src/modules/countries/country.repository";
import type { CountryRow } from "../../../../src/modules/countries/country.types";

const mockedRepo = countryRepository as jest.Mocked<typeof countryRepository>;

function countryRow(overrides: Partial<CountryRow> = {}): CountryRow {
  return {
    id: 1,
    code: "AE",
    name: "United Arab Emirates",
    dial_code: "+971",
    status: "active",
    created_at: new Date(),
    updated_at: new Date(),
    deleted_at: null,
    ...overrides,
  };
}

const phone = (value: string | null | undefined) => ({ phoneNo: { label: "Phone number", value } });

describe("CountryService", () => {
  beforeEach(() => jest.clearAllMocks());

  describe("listActive", () => {
    it("maps rows to dropdown options", async () => {
      mockedRepo.findActive.mockResolvedValue([countryRow()]);
      await expect(countryService.listActive()).resolves.toEqual([
        { code: "AE", name: "United Arab Emirates", dialCode: "+971" },
      ]);
    });
  });

  describe("assertCountryAndPhones", () => {
    it("accepts an active country and a matching phone", async () => {
      mockedRepo.findByCode.mockResolvedValue(countryRow());
      await expect(countryService.assertCountryAndPhones("AE", null, phone("050 123 4567"))).resolves.toBeUndefined();
    });

    it("rejects a code that isn't in the table or is inactive", async () => {
      mockedRepo.findByCode.mockResolvedValue(undefined);
      await expect(countryService.assertCountryAndPhones("ZZ", null, {})).rejects.toThrow("Select a valid country");
      mockedRepo.findByCode.mockResolvedValue(countryRow({ status: "inactive" }));
      await expect(countryService.assertCountryAndPhones("AE", null, {})).rejects.toThrow("Select a valid country");
    });

    it("checks phones against the stored country when the country isn't changed", async () => {
      mockedRepo.findByCode.mockResolvedValue(countryRow({ code: "IN", name: "India" }));
      await expect(countryService.assertCountryAndPhones(undefined, "IN", phone("12345"))).rejects.toThrow(
        "Phone number isn't a valid India number"
      );
    });

    it("needs an international number when the country is cleared", async () => {
      await expect(countryService.assertCountryAndPhones(null, "AE", phone("0501234567"))).rejects.toThrow(
        "must include the country code"
      );
      expect(mockedRepo.findByCode).not.toHaveBeenCalled();
    });
  });
});
