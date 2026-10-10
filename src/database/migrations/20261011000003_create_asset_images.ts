import type { Knex } from "knex";

/** Photos of an asset (condition, serial plate, accessories). Files live under uploads/images/assets. */
export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable("asset_images", (table) => {
    table.increments("id").primary();
    table
      .integer("asset_id")
      .unsigned()
      .notNullable()
      .references("id")
      .inTable("assets")
      .onDelete("CASCADE");
    table.string("file_path", 255).notNullable();
    table.string("original_name", 255).nullable();
    table.string("mime_type", 50).notNullable();
    table.integer("size_bytes").unsigned().notNullable();
    table.integer("created_by").unsigned().nullable();
    table.timestamp("created_at").notNullable().defaultTo(knex.fn.now());
    table.index(["asset_id"]);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists("asset_images");
}
