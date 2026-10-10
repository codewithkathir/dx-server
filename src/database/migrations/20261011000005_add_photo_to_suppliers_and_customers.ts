import type { Knex } from "knex";

const TABLES = ["suppliers", "customers"] as const;

/** One optional picture (logo or photo) per supplier and customer, stored under uploads/. */
export async function up(knex: Knex): Promise<void> {
  for (const table of TABLES) {
    await knex.schema.alterTable(table, (t) => {
      t.string("photo", 500).nullable().after("comments");
    });
  }
}

export async function down(knex: Knex): Promise<void> {
  for (const table of TABLES) {
    await knex.schema.alterTable(table, (t) => {
      t.dropColumn("photo");
    });
  }
}
