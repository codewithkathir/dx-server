import type { Knex } from "knex";

/**
 * Single-row table (id = 1) for what admins upload in Settings and the invoice PDF prints:
 * company logo, signature, stamp and the signatory's name and title.
 */
export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable("invoice_branding", (table) => {
    table.increments("id").primary();
    table.string("logo", 500).nullable();
    table.string("signature", 500).nullable();
    table.string("stamp", 500).nullable();
    table.string("signatory_name", 150).nullable();
    table.string("signatory_title", 150).nullable();
    table.timestamp("created_at").defaultTo(knex.fn.now());
    table.timestamp("updated_at").defaultTo(knex.fn.now());
    table.integer("updated_by").unsigned().nullable();
  });
  await knex("invoice_branding").insert({ id: 1 });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists("invoice_branding");
}
