import { countries, getCountryCode, type TCountryCode } from "countries-list";
import { parsePhoneNumberFromString, type CountryCode } from "libphonenumber-js";
import { ApiError } from "../errors/api.error";
import { ErrorCodes } from "../errors/error-codes";

/** Short names already stored before the country dropdown existed. */
const COUNTRY_ALIASES: Record<string, CountryCode> = {
  uae: "AE",
  "u.a.e": "AE",
  "u.a.e.": "AE",
  ksa: "SA",
  uk: "GB",
  usa: "US",
};

/** Display name for a stored ISO code ("AE" → "United Arab Emirates"); unknown values pass through. */
export function countryName(country: string | null | undefined): string | null {
  const value = country?.trim();
  if (!value) return null;
  return countries[value.toUpperCase() as TCountryCode]?.name ?? value;
}

/** ISO code for a stored country name ("United Arab Emirates", "UAE", "AE"), if known. */
export function countryCodeFor(country: string | null | undefined): CountryCode | undefined {
  const name = country?.trim();
  if (!name) return undefined;
  const alias = COUNTRY_ALIASES[name.toLowerCase()];
  if (alias) return alias;
  if (/^[A-Za-z]{2}$/.test(name)) return name.toUpperCase() as CountryCode;
  const code = getCountryCode(name);
  return code ? (code as CountryCode) : undefined;
}

/**
 * A phone number is valid for a country when it parses as a real number there,
 * written either nationally ("050 123 4567") or with its own dialling code ("+971 50 123 4567").
 * With no known country, only a full international number can be checked.
 */
export function isValidPhoneForCountry(phone: string, country: string | null | undefined): boolean {
  const code = countryCodeFor(country);
  const parsed = parsePhoneNumberFromString(phone, code);
  if (!parsed?.isValid()) return false;
  return !code || parsed.country === code || parsed.getPossibleCountries().includes(code);
}

/**
 * Checks the phone numbers sent in a request against the country they belong to.
 * Fields left out (undefined) or cleared (null / "") are skipped, so older stored
 * numbers don't block unrelated edits.
 */
export function assertPhonesMatchCountry(
  country: string | null | undefined,
  phones: Record<string, { label: string; value: string | null | undefined }>
): void {
  const errors = Object.entries(phones)
    .filter(([, { value }]) => value && !isValidPhoneForCountry(value, country))
    .map(([field, { label }]) => ({
      field,
      message: country?.trim()
        ? `${label} isn't a valid ${countryName(country)} number`
        : `${label} must include the country code, e.g. +971 50 123 4567`,
    }));
  if (errors.length > 0) {
    throw new ApiError(errors[0]!.message, ErrorCodes.VALIDATION_ERROR, 400, errors);
  }
}
