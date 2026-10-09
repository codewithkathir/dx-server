import type { Knex } from "knex";
import { DEFAULT_CURRENCY, InvoiceStatuses } from "../../shared/constants/finance";

/** dx_app's receivable_invoices / receivable_receipts, with full VAT breakdown. */
export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable("receivable_invoices", (table) => {
    table.increments("id").primary();
    table.string("invoice_no", 50).notNullable().unique();
    table.integer("customer_id").unsigned().notNullable()
      .references("id").inTable("customers").onDelete("RESTRICT");
    table.date("invoice_date").notNullable();
    table.date("due_date").notNullable();
    table.decimal("subtotal_amount", 12, 2).notNullable();
    table.decimal("vat_rate", 5, 2).notNullable().defaultTo(0);
    table.decimal("vat_amount", 12, 2).notNullable().defaultTo(0);
    table.decimal("total_amount", 12, 2).notNullable();
    table.decimal("amount_received", 12, 2).notNullable().defaultTo(0);
    table.string("currency", 3).notNullable().defaultTo(DEFAULT_CURRENCY);
    table.text("description").nullable();
    table.string("po_reference", 100).nullable();
    // Snapshot of the customer's TRN when the invoice was issued (tax invoice requirement).
    table.string("customer_trn", 50).nullable();
    table.string("support_file", 500).nullable();
    table.text("notes").nullable();
    table.enum("status", InvoiceStatuses).notNullable().defaultTo("draft");
    table.timestamp("created_at").defaultTo(knex.fn.now());
    table.timestamp("updated_at").defaultTo(knex.fn.now());
    table.timestamp("deleted_at").nullable();
    table.integer("created_by").unsigned().nullable();
    table.integer("updated_by").unsigned().nullable();

    table.index(["status"]);
    table.index(["invoice_date"]);
    table.index(["due_date"]);
    table.index(["deleted_at"]);
    table.index(["created_at"]);
  });

  await knex.schema.createTable("receivable_receipts", (table) => {
    table.increments("id").primary();
    table.integer("invoice_id").unsigned().notNullable()
      .references("id").inTable("receivable_invoices").onDelete("CASCADE");
    table.date("receipt_date").notNullable();
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

    table.index(["receipt_date"]);
    table.index(["deleted_at"]);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists("receivable_receipts");
  await knex.schema.dropTableIfExists("receivable_invoices");
}
