import type { Knex } from "knex";
import { countries, getCountryCode, type TCountryCode } from "countries-list";

/**
 * Country details now come from our country API, keyed by ISO 3166-1 alpha-2 code,
 * so employees / suppliers / customers store the code ("AE") instead of the name.
 * Existing names are converted before the column is narrowed.
 */
const TABLES = [
  { table: "employees", nullable: false },
  { table: "suppliers", nullable: true },
  { table: "customers", nullable: true },
] as const;

/** Short names typed before the country dropdown. */
const ALIASES: Record<string, string> = { uae: "AE", "u.a.e": "AE", "u.a.e.": "AE", ksa: "SA", uk: "GB", usa: "US" };

function toCode(value: string): string | undefined {
  const name = value.trim();
  if (ALIASES[name.toLowerCase()]) return ALIASES[name.toLowerCase()];
  if (/^[A-Za-z]{2}$/.test(name) && countries[name.toUpperCase() as TCountryCode]) return name.toUpperCase();
  return getCountryCode(name) || undefined;
}

export async function up(knex: Knex): Promise<void> {
  for (const { table, nullable } of TABLES) {
    const rows: { country: string | null }[] = await knex(table).distinct("country").whereNotNull("country");
    const unknown: string[] = [];
    for (const { country } of rows) {
      if (country === null) continue;
      if (!country.trim()) {
        if (nullable) await knex(table).where({ country }).update({ country: null });
        else unknown.push(country);
        continue;
      }
      const code = toCode(country);
      if (code) await knex(table).where({ country }).update({ country: code });
      else unknown.push(country);
    }
    if (unknown.length > 0) {
      throw new Error(`${table}.country has values with no ISO code: ${unknown.map((c) => JSON.stringify(c)).join(", ")}`);
    }

    await knex.schema.alterTable(table, (t) => {
      const column = t.string("country", 2);
      (nullable ? column.nullable() : column.notNullable()).comment("ISO 3166-1 alpha-2 code").alter();
    });
  }
}

export async function down(knex: Knex): Promise<void> {
  for (const { table, nullable } of TABLES) {
    await knex.schema.alterTable(table, (t) => {
      const column = t.string("country", 100);
      (nullable ? column.nullable() : column.notNullable()).comment("").alter();
    });
    const rows: { country: string }[] = await knex(table).distinct("country").whereNotNull("country");
    for (const { country } of rows) {
      const name = countries[country as TCountryCode]?.name;
      if (name) await knex(table).where({ country }).update({ country: name });
    }
  }
}
