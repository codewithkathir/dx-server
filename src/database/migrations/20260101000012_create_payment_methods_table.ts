import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable("payment_methods", (table) => {
    table.increments("id").primary();
    table.string("name", 150).notNullable();
    table.string("code", 50).nullable().unique();
    table.text("description").nullable();
    table.enum("status", ["active", "inactive"]).notNullable().defaultTo("active");
    table.integer("sort_order").notNullable().defaultTo(0);
    table.timestamp("created_at").defaultTo(knex.fn.now());
    table.timestamp("updated_at").defaultTo(knex.fn.now());
    table.timestamp("deleted_at").nullable();
    table.integer("created_by").unsigned().nullable();
    table.integer("updated_by").unsigned().nullable();

    table.index(["name"]);
    table.index(["status"]);
    table.index(["deleted_at"]);
    table.index(["sort_order"]);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists("payment_methods");
}
