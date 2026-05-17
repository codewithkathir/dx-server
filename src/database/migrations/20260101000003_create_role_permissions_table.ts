import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable("role_permissions", (table) => {
    table.increments("id").primary();
    table
      .integer("role_id")
      .unsigned()
      .notNullable()
      .references("id")
      .inTable("roles")
      .onDelete("CASCADE");
    table
      .integer("permission_id")
      .unsigned()
      .notNullable()
      .references("id")
      .inTable("permissions")
      .onDelete("CASCADE");
    table.timestamp("created_at").defaultTo(knex.fn.now());
    table.timestamp("updated_at").defaultTo(knex.fn.now());
    table.timestamp("deleted_at").nullable();
    table.integer("created_by").unsigned().nullable();
    table.integer("updated_by").unsigned().nullable();
    table.unique(["role_id", "permission_id"]);
    table.index(["role_id"]);
    table.index(["permission_id"]);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists("role_permissions");
}
