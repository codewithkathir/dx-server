import type { Knex } from "knex";

/**
 * Products (price list) and invoice line items. An invoice's subtotal is the sum of its
 * lines; VAT stays one rate per invoice. Products are never deleted, only made inactive,
 * so the lines that use them keep their link.
 */
export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable("products", (table) => {
    table.increments("id").primary();
    table.string("code", 50).nullable().unique();
    table.string("name", 200).notNullable().unique();
    /** Unit of sale, e.g. "pcs", "kg", "hour". */
    table.string("unit", 20).notNullable().defaultTo("pcs");
    /** Price per unit, before VAT. */
    table.decimal("unit_price", 12, 2).notNullable();
    table.text("description").nullable();
    table.enum("status", ["active", "inactive"]).notNullable().defaultTo("active");
    table.timestamp("created_at").defaultTo(knex.fn.now());
    table.timestamp("updated_at").defaultTo(knex.fn.now());
    table.integer("created_by").unsigned().nullable();
    table.integer("updated_by").unsigned().nullable();

    table.index(["status"]);
    table.index(["created_at"]);
  });

  await knex.schema.createTable("receivable_invoice_lines", (table) => {
    table.increments("id").primary();
    table.integer("invoice_id").unsigned().notNullable()
      .references("id").inTable("receivable_invoices").onDelete("CASCADE");
    table.smallint("line_no").unsigned().notNullable();
    /** NULL for lines converted from invoices raised before products existed. */
    table.integer("product_id").unsigned().nullable()
      .references("id").inTable("products").onDelete("RESTRICT");
    /** Snapshot of what was sold (the product name unless overridden), as printed. */
    table.string("description", 500).notNullable();
    table.string("unit", 20).nullable();
    table.decimal("quantity", 12, 3).notNullable();
    table.decimal("unit_price", 12, 2).notNullable();
    /** quantity × unit_price, rounded to the fils. */
    table.decimal("amount", 12, 2).notNullable();
    table.timestamp("created_at").defaultTo(knex.fn.now());
    table.timestamp("updated_at").defaultTo(knex.fn.now());

    table.unique(["invoice_id", "line_no"]);
    table.index(["product_id"]);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists("receivable_invoice_lines");
  await knex.schema.dropTableIfExists("products");
}
