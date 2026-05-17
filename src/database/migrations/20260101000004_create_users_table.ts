import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable("users", (table) => {
    table.increments("id").primary();
    table.string("name", 150).notNullable();
    table.string("email", 255).notNullable().unique();
    table.string("password_hash", 255).notNullable();
    table
      .integer("role_id")
      .unsigned()
      .notNullable()
      .references("id")
      .inTable("roles");
    table.enum("status", ["active", "inactive", "pending"]).defaultTo("pending");
    table.boolean("email_verified").defaultTo(false);
    table.timestamp("created_at").defaultTo(knex.fn.now());
    table.timestamp("updated_at").defaultTo(knex.fn.now());
    table.timestamp("deleted_at").nullable();
    table.integer("created_by").unsigned().nullable();
    table.integer("updated_by").unsigned().nullable();
    table.index(["email"]);
    table.index(["role_id"]);
    table.index(["status"]);
    table.index(["created_at"]);
    table.index(["deleted_at"]);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists("users");
}
