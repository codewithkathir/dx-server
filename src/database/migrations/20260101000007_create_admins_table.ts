import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable("admins", (table) => {
    table.increments("id").primary();
    table.string("name", 150).notNullable();
    table.string("email", 255).notNullable().unique();
    table.string("password_hash", 255).notNullable();
    table.enum("role", ["ADMIN", "SUPER_ADMIN"]).notNullable().defaultTo("ADMIN");
    table.enum("status", ["active", "inactive"]).notNullable().defaultTo("active");
    table.string("reset_token_hash", 255).nullable();
    table.timestamp("reset_token_expiry").nullable();
    table.string("refresh_token_hash", 255).nullable();
    table.timestamp("refresh_token_expiry").nullable();
    table.timestamp("last_login_at").nullable();
    table.timestamp("created_at").defaultTo(knex.fn.now());
    table.timestamp("updated_at").defaultTo(knex.fn.now());
    table.timestamp("deleted_at").nullable();

    table.index(["email"]);
    table.index(["status"]);
    table.index(["role"]);
    table.index(["deleted_at"]);
    table.index(["reset_token_hash"]);
    table.index(["refresh_token_hash"]);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists("admins");
}
