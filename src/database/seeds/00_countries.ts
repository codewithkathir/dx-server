import type { Knex } from "knex";
import { COUNTRIES } from "../data/countries.data";

/** Every ISO country. Idempotent: codes that already exist are left alone (names edited in the DB are kept). */
export async function seed(knex: Knex): Promise<void> {
  const taken = new Set<string>(await knex("countries").pluck("code"));
  const rows = COUNTRIES.filter((c) => !taken.has(c.code)).map((c) => ({
    code: c.code,
    name: c.name,
    dial_code: c.dialCode,
    status: "active",
    created_at: knex.fn.now(),
    updated_at: knex.fn.now(),
  }));
  if (rows.length) await knex("countries").insert(rows);
}
