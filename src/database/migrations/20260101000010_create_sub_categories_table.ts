import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable("sub_categories", (table) => {
    table.increments("id").primary();
    table
      .integer("category_id")
      .unsigned()
      .notNullable()
      .references("id")
      .inTable("categories")
      .onDelete("RESTRICT");
    table.string("name", 200).notNullable();
    table.text("description").nullable();
    table.enum("status", ["active", "inactive"]).notNullable().defaultTo("active");
    table.timestamp("created_at").defaultTo(knex.fn.now());
    table.timestamp("updated_at").defaultTo(knex.fn.now());
    table.timestamp("deleted_at").nullable();
    table.integer("created_by").unsigned().nullable();
    table.integer("updated_by").unsigned().nullable();

    table.index(["category_id"]);
    table.index(["name"]);
    table.index(["status"]);
    table.index(["deleted_at"]);
    table.index(["created_at"]);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists("sub_categories");
}
