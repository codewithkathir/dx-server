import type { Knex } from "knex";

/**
 * Gives every invoice raised before line items one line: its description, quantity 1,
 * priced at its subtotal, so its totals stay exactly the same. (Approved data change.)
 */
export async function up(knex: Knex): Promise<void> {
  await knex.raw(`
    INSERT INTO receivable_invoice_lines
      (invoice_id, line_no, product_id, description, unit, quantity, unit_price, amount, created_at, updated_at)
    SELECT i.id, 1, NULL, LEFT(COALESCE(NULLIF(TRIM(i.description), ''), 'Services'), 500), NULL,
           1, i.subtotal_amount, i.subtotal_amount, NOW(), NOW()
    FROM receivable_invoices i
    WHERE NOT EXISTS (SELECT 1 FROM receivable_invoice_lines l WHERE l.invoice_id = i.id)
  `);
}

export async function down(knex: Knex): Promise<void> {
  await knex("receivable_invoice_lines").whereNull("product_id").where({ line_no: 1 }).del();
}
