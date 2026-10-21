import type { Knex } from "knex";

/**
 * Countries, keyed by ISO 3166-1 alpha-2 code. employees / suppliers / customers store
 * the code in their `country` column. Rows are loaded by seeds/00_countries.ts.
 */
export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable("countries", (table) => {
    table.increments("id").primary();
    table.string("code", 2).notNullable().unique();
    table.string("name", 100).notNullable();
    /** International dialling code, e.g. "+971". */
    table.string("dial_code", 10).nullable();
    table.enum("status", ["active", "inactive"]).notNullable().defaultTo("active");
    table.timestamp("created_at").defaultTo(knex.fn.now());
    table.timestamp("updated_at").defaultTo(knex.fn.now());
    table.timestamp("deleted_at").nullable();
    table.integer("created_by").unsigned().nullable();
    table.integer("updated_by").unsigned().nullable();

    table.index(["status"]);
    table.index(["deleted_at"]);
    table.index(["name"]);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists("countries");
}
