import type { Knex } from "knex";

import { EmployeeExpenseStatuses } from "../../shared/constants/expense";

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable("expenses", (table) => {
    table.increments("id").primary();
    table
      .integer("employee_id")
      .unsigned()
      .notNullable()
      .references("id")
      .inTable("employees")
      .onDelete("RESTRICT");
    table.date("date").notNullable();
    table.decimal("amount", 12, 2).notNullable();
    table
      .integer("whom")
      .unsigned()
      .notNullable()
      .references("id")
      .inTable("employees")
      .onDelete("RESTRICT");
    table
      .integer("category_id")
      .unsigned()
      .notNullable()
      .references("id")
      .inTable("categories")
      .onDelete("RESTRICT");
    table
      .integer("sub_category_id")
      .unsigned()
      .notNullable()
      .references("id")
      .inTable("sub_categories")
      .onDelete("RESTRICT");
    table
      .integer("sub_sub_category_id")
      .unsigned()
      .nullable()
      .references("id")
      .inTable("sub_sub_categories")
      .onDelete("SET NULL");
    table.text("description").nullable();
    table
      .integer("payment_method_id")
      .unsigned()
      .notNullable()
      .references("id")
      .inTable("payment_methods")
      .onDelete("RESTRICT");
    table.string("support_file", 500).nullable();
    table
      .enum("employee_status", EmployeeExpenseStatuses)
      .notNullable()
      .defaultTo("pending");
    table.timestamp("created_at").defaultTo(knex.fn.now());
    table.timestamp("updated_at").defaultTo(knex.fn.now());
    table.timestamp("deleted_at").nullable();

    table.index(["employee_id"]);
    table.index(["date"]);
    table.index(["category_id"]);
    table.index(["sub_category_id"]);
    table.index(["payment_method_id"]);
    table.index(["employee_status"]);
    table.index(["deleted_at"]);
    table.index(["created_at"]);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists("expenses");
}
