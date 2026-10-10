import type { Knex } from "knex";

/**
 * Composite indexes found by load testing with ~60k claims. They lead with deleted_at
 * because every query filters on it and MySQL otherwise prefers the single-column
 * deleted_at index:
 * - expenses summary totals straight from the index (no temporary table),
 * - an employee's own claim list without an index merge + sort,
 * - the admin claim list (newest first) without sorting every row for deep pages,
 * - overdue bills / invoices without a full table scan.
 */
export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable("expenses", (table) => {
    table.index(["deleted_at", "admin_status", "amount"], "expenses_status_deleted_amount_index");
    table.index(["deleted_at", "employee_id", "date"], "expenses_employee_deleted_date_index");
    // Admin claim list: newest first, deep pages read only the rows they need.
    table.index(["deleted_at", "created_at"], "expenses_deleted_created_index");
    // Redundant now (both indexes above start with deleted_at), and it tempted MySQL into a
    // slower index merge + sort for an employee's claim list.
    table.dropIndex(["deleted_at"], "expenses_deleted_at_index");
  });
  await knex.schema.alterTable("payable_bills", (table) => {
    table.index(["status", "due_date"], "payable_bills_status_due_date_index");
  });
  await knex.schema.alterTable("receivable_invoices", (table) => {
    table.index(["status", "due_date"], "receivable_invoices_status_due_date_index");
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable("receivable_invoices", (table) => {
    table.dropIndex(["status", "due_date"], "receivable_invoices_status_due_date_index");
  });
  await knex.schema.alterTable("payable_bills", (table) => {
    table.dropIndex(["status", "due_date"], "payable_bills_status_due_date_index");
  });
  await knex.schema.alterTable("expenses", (table) => {
    table.index(["deleted_at"], "expenses_deleted_at_index");
    table.dropIndex(["deleted_at", "created_at"], "expenses_deleted_created_index");
    table.dropIndex(["deleted_at", "employee_id", "date"], "expenses_employee_deleted_date_index");
    table.dropIndex(["deleted_at", "admin_status", "amount"], "expenses_status_deleted_amount_index");
  });
}
