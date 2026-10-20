import type { Knex } from "knex";
import { AccountEntryTypes } from "../../shared/constants/employee-account";

/**
 * Employee advance balance: money given to an employee is drawn down by their
 * approved claims; only what the balance can't cover is reimbursed via Payables.
 */
export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable("employee_account_entries", (table) => {
    table.increments("id").primary();
    table.integer("employee_id").unsigned().notNullable().references("id").inTable("employees").onDelete("RESTRICT");
    table.date("entry_date").notNullable();
    table.enum("type", AccountEntryTypes).notNullable();
    /** Signed: + advance, − expense/return, ± adjustment. */
    table.decimal("amount", 12, 2).notNullable();
    /** The claim an "expense" entry settled; one live entry per claim (enforced in the service). */
    table.integer("expense_id").unsigned().nullable().references("id").inTable("expenses").onDelete("RESTRICT");
    table.integer("payment_method_id").unsigned().nullable().references("id").inTable("payment_methods").onDelete("RESTRICT");
    table.string("reference", 100).nullable();
    table.text("notes").nullable();
    table.integer("created_by").unsigned().nullable();
    table.timestamp("created_at").defaultTo(knex.fn.now());
    /** Mistakes are voided, never deleted, so the statement always reconciles. */
    table.timestamp("voided_at").nullable();
    table.integer("voided_by").unsigned().nullable();
    table.string("void_reason", 255).nullable();

    table.index(["employee_id", "voided_at", "entry_date"]);
    table.index(["expense_id"]);
  });

  await knex.schema.alterTable("expenses", (table) => {
    /** Part of an approved claim covered by the employee's advance. */
    table.decimal("advance_amount", 12, 2).notNullable().defaultTo(0);
    /** Part reimbursed through Payables; NULL until approved. */
    table.decimal("reimbursable_amount", 12, 2).nullable();
  });

  // Claims approved before this feature were reimbursed in full.
  await knex("expenses")
    .where("employee_status", "approved")
    .orWhere("admin_status", "paid")
    .update({ reimbursable_amount: knex.ref("amount") });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable("expenses", (table) => {
    table.dropColumn("advance_amount");
    table.dropColumn("reimbursable_amount");
  });
  await knex.schema.dropTableIfExists("employee_account_entries");
}
