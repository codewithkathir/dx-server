import type { Knex } from "knex";

const TABLES = ["employees", "suppliers", "customers"] as const;

/** Short names typed before the country dropdown, mapped to the names it uses. */
const ALIASES: Record<string, string[]> = {
  "United Arab Emirates": ["uae", "u.a.e", "u.a.e."],
  "Saudi Arabia": ["ksa"],
  "United Kingdom": ["uk"],
  "United States": ["usa"],
};

export async function up(knex: Knex): Promise<void> {
  for (const table of TABLES) {
    for (const [name, aliases] of Object.entries(ALIASES)) {
      await knex(table)
        .whereRaw(`LOWER(TRIM(country)) IN (${aliases.map(() => "?").join(", ")})`, aliases)
        .update({ country: name });
    }
  }
}

export async function down(): Promise<void> {
  // The original spellings aren't kept; full names stay valid.
}
