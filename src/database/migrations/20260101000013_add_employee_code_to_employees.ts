import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable("employees", (table) => {
    table.string("employee_code", 50).nullable().unique();
    table.index(["employee_code"]);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable("employees", (table) => {
    table.dropIndex(["employee_code"]);
    table.dropColumn("employee_code");
  });
}
