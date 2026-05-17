import type { Knex } from "knex";

import { AdminExpenseStatuses } from "../../shared/constants/expense";

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable("expenses", (table) => {
    table
      .enum("admin_status", AdminExpenseStatuses)
      .notNullable()
      .defaultTo("pending")
      .after("employee_status");
    table.index(["admin_status"]);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable("expenses", (table) => {
    table.dropIndex(["admin_status"]);
    table.dropColumn("admin_status");
  });
}
