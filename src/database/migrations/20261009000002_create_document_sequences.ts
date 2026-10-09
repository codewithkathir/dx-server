import type { Knex } from "knex";

/** Gap-free yearly document numbers, e.g. INV-2026-0001 (see document-number.util). */
export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable("document_sequences", (table) => {
    table.increments("id").primary();
    table.string("name", 20).notNullable();
    table.integer("year").unsigned().notNullable();
    table.integer("last_value").unsigned().notNullable().defaultTo(0);
    table.unique(["name", "year"]);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists("document_sequences");
}
