import type { Knex } from "knex";

/** Countries are never deleted, only made inactive (hidden from the dropdown, kept for stored codes). */
export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable("countries", (table) => {
    table.dropIndex(["deleted_at"]);
    table.dropColumn("deleted_at");
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable("countries", (table) => {
    table.timestamp("deleted_at").nullable();
    table.index(["deleted_at"]);
  });
}
