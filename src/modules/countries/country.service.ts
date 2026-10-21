import { ApiError } from "../../shared/errors/api.error";
import { ErrorCodes } from "../../shared/errors/error-codes";
import { assertPhonesMatchCountry } from "../../shared/utils/phone.util";
import { countryRepository } from "./country.repository";
import type { CountryOption, PhoneFields } from "./country.types";

class CountryService {
  async listActive(): Promise<CountryOption[]> {
    const rows = await countryRepository.findActive();
    return rows.map((r) => ({ code: r.code, name: r.name, dialCode: r.dial_code }));
  }

  /**
   * Validates a record's country and phone numbers together.
   * `input` is the country sent in the request (undefined = not changed, null/"" = cleared);
   * a new value must be an active country in the `countries` table. `stored` is the
   * record's current country, used for the phone check when the country isn't changed.
   */
  async assertCountryAndPhones(
    input: string | null | undefined,
    stored: string | null | undefined,
    phones: PhoneFields
  ): Promise<void> {
    let country: { code: string; name: string } | null = null;
    if (input) {
      const row = await countryRepository.findByCode(input);
      if (!row || row.status !== "active") {
        const message = "Select a valid country";
        throw new ApiError(message, ErrorCodes.VALIDATION_ERROR, 400, [{ field: "country", message }]);
      }
      country = row;
    } else if (input === undefined && stored) {
      const row = await countryRepository.findByCode(stored);
      country = { code: stored, name: row?.name ?? stored };
    }
    assertPhonesMatchCountry(country, phones);
  }
}

export const countryService = new CountryService();
