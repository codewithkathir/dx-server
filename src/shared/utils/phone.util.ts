import { parsePhoneNumberFromString, type CountryCode } from "libphonenumber-js";
import { ApiError } from "../errors/api.error";
import { ErrorCodes } from "../errors/error-codes";

/**
 * A phone number is valid for a country (ISO code, e.g. "AE") when it parses as a real
 * number there, written either nationally ("050 123 4567") or with its own dialling code
 * ("+971 50 123 4567"). With no country, only a full international number can be checked.
 */
export function isValidPhoneForCountry(phone: string, countryCode: string | null | undefined): boolean {
  const code = countryCode?.trim().toUpperCase() as CountryCode | undefined;
  const parsed = parsePhoneNumberFromString(phone, code || undefined);
  if (!parsed?.isValid()) return false;
  return !code || parsed.country === code || parsed.getPossibleCountries().includes(code);
}

/**
 * Checks the phone numbers sent in a request against the country they belong to
 * (looked up from the `countries` table by the caller).
 * Fields left out (undefined) or cleared (null / "") are skipped, so older stored
 * numbers don't block unrelated edits.
 */
export function assertPhonesMatchCountry(
  country: { code: string; name: string } | null,
  phones: Record<string, { label: string; value: string | null | undefined }>
): void {
  const errors = Object.entries(phones)
    .filter(([, { value }]) => value && !isValidPhoneForCountry(value, country?.code))
    .map(([field, { label }]) => ({
      field,
      message: country
        ? `${label} isn't a valid ${country.name} number`
        : `${label} must include the country code, e.g. +971 50 123 4567`,
    }));
  if (errors.length > 0) {
    throw new ApiError(errors[0]!.message, ErrorCodes.VALIDATION_ERROR, 400, errors);
  }
}
