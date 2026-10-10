import type { Knex } from "knex";

const DEFAULT_PAYMENT_METHODS = [
  { name: "Cash", code: "CASH", description: "Cash payment", sort_order: 1 },
  { name: "Bank Transfer", code: "BANK_TRANSFER", description: "Direct bank transfer", sort_order: 2 },
  { name: "Credit Card", code: "CREDIT_CARD", description: "Card payments", sort_order: 3 },
];

/**
 * Employees can't submit a claim without a payment method, and the catalog seed
 * skipped them on databases where categories already existed. Add the defaults
 * only when no payment method exists yet, so admin-managed lists are left alone.
 */
export async function up(knex: Knex): Promise<void> {
  const existing = await knex("payment_methods").whereNull("deleted_at").first("id");
  if (existing) return;

  const taken = await knex("payment_methods")
    .whereIn("code", DEFAULT_PAYMENT_METHODS.map((m) => m.code))
    .pluck("code");
  const rows = DEFAULT_PAYMENT_METHODS.filter((m) => !taken.includes(m.code)).map((m) => ({
    ...m,
    status: "active",
    created_at: knex.fn.now(),
    updated_at: knex.fn.now(),
  }));
  if (rows.length) await knex("payment_methods").insert(rows);
}

export async function down(knex: Knex): Promise<void> {
  // Remove only defaults nothing references yet.
  const unused = (table: string) =>
    knex(table).whereRaw(`${table}.payment_method_id = payment_methods.id`);
  await knex("payment_methods")
    .whereIn("code", DEFAULT_PAYMENT_METHODS.map((m) => m.code))
    .whereNull("created_by")
    .whereNotExists(unused("expenses"))
    .whereNotExists(unused("payable_payments"))
    .whereNotExists(unused("receivable_receipts"))
    .del();
}
