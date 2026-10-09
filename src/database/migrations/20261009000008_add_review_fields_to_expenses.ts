import type { Knex } from "knex";

/** Admin's note to the employee when a claim is approved or rejected, and who/when. */
export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable("expenses", (table) => {
    table.text("review_note").nullable().after("admin_status");
    table.timestamp("reviewed_at").nullable().after("review_note");
    table.integer("reviewed_by").unsigned().nullable().after("reviewed_at");
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable("expenses", (table) => {
    table.dropColumn("reviewed_by");
    table.dropColumn("reviewed_at");
    table.dropColumn("review_note");
  });
}
