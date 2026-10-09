import type { Knex } from "knex";
import {
  BillSources,
  BillStatuses,
  DEFAULT_CURRENCY,
  PayeeTypes,
} from "../../shared/constants/finance";

/**
 * dx_app's payable_bills / payable_payments, extended so a bill can be owed to
 * an employee (expense reimbursement) as well as a supplier, and with VAT.
 */
export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable("payable_bills", (table) => {
    table.increments("id").primary();
    table.string("bill_no", 50).notNullable();
    table.enum("payee_type", PayeeTypes).notNullable().defaultTo("supplier");
    table.integer("supplier_id").unsigned().nullable()
      .references("id").inTable("suppliers").onDelete("RESTRICT");
    table.integer("employee_id").unsigned().nullable()
      .references("id").inTable("employees").onDelete("RESTRICT");
    table.date("bill_date").notNullable();
    table.date("due_date").notNullable();
    table.decimal("subtotal_amount", 12, 2).notNullable();
    table.decimal("vat_rate", 5, 2).notNullable().defaultTo(0);
    table.decimal("vat_amount", 12, 2).notNullable().defaultTo(0);
    table.decimal("total_amount", 12, 2).notNullable();
    table.decimal("amount_paid", 12, 2).notNullable().defaultTo(0);
    table.string("currency", 3).notNullable().defaultTo(DEFAULT_CURRENCY);
    table.integer("category_id").unsigned().nullable()
      .references("id").inTable("categories").onDelete("SET NULL");
    table.text("description").nullable();
    table.integer("expense_id").unsigned().nullable().unique()
      .references("id").inTable("expenses").onDelete("SET NULL");
    table.enum("source", BillSources).notNullable().defaultTo("manual");
    table.string("support_file", 500).nullable();
    table.text("notes").nullable();
    table.enum("status", BillStatuses).notNullable().defaultTo("draft");
    table.timestamp("created_at").defaultTo(knex.fn.now());
    table.timestamp("updated_at").defaultTo(knex.fn.now());
    table.timestamp("deleted_at").nullable();
    table.integer("created_by").unsigned().nullable();
    table.integer("updated_by").unsigned().nullable();

    // A supplier's own bill numbers only need to be unique per supplier.
    table.unique(["supplier_id", "bill_no"]);
    table.index(["bill_no"]);
    table.index(["payee_type"]);
    table.index(["status"]);
    table.index(["bill_date"]);
    table.index(["due_date"]);
    table.index(["deleted_at"]);
    table.index(["created_at"]);
  });

  await knex.raw(`
    ALTER TABLE payable_bills ADD CONSTRAINT payable_bills_payee_check CHECK (
      (payee_type = 'supplier' AND supplier_id IS NOT NULL AND employee_id IS NULL)
      OR (payee_type = 'employee' AND employee_id IS NOT NULL AND supplier_id IS NULL)
    )
  `);

  await knex.schema.createTable("payable_payments", (table) => {
    table.increments("id").primary();
    table.integer("bill_id").unsigned().notNullable()
      .references("id").inTable("payable_bills").onDelete("CASCADE");
    table.date("payment_date").notNullable();
    table.decimal("amount", 12, 2).notNullable();
    table.integer("payment_method_id").unsigned().notNullable()
      .references("id").inTable("payment_methods").onDelete("RESTRICT");
    table.string("reference", 100).nullable();
    table.text("notes").nullable();
    table.timestamp("created_at").defaultTo(knex.fn.now());
    table.timestamp("updated_at").defaultTo(knex.fn.now());
    table.timestamp("deleted_at").nullable();
    table.integer("created_by").unsigned().nullable();
    table.integer("updated_by").unsigned().nullable();

    table.index(["payment_date"]);
    table.index(["deleted_at"]);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists("payable_payments");
  await knex.schema.dropTableIfExists("payable_bills");
}
