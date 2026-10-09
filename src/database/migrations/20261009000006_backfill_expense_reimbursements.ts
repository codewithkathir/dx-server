import type { Knex } from "knex";
import { syncExpenseReimbursements } from "../../modules/payables/expense-bill.helper";
import { todayIso } from "../../shared/utils/money.util";

/**
 * Expenses approved or paid before Payables existed get their reimbursement
 * bill (and, for paid ones, a payment). The payment is dated when the expense
 * was last updated — the closest record of when it was marked paid — kept
 * between the expense date and today.
 */
export async function up(knex: Knex): Promise<void> {
  const today = todayIso();
  await knex.transaction(async (trx) => {
    await syncExpenseReimbursements(trx, (expense, billDate) => {
      const marked = todayIso(new Date(expense.updated_at));
      if (marked < billDate) return billDate;
      return marked > today ? today : marked;
    });
  });
}

export async function down(knex: Knex): Promise<void> {
  // Remove only what the backfill created; expense statuses are left as they are.
  const bills = knex("payable_bills").where({ notes: "Backfilled from expense status" }).select("id");
  await knex("payable_payments").whereIn("bill_id", bills).del();
  await knex("payable_bills").where({ notes: "Backfilled from expense status" }).del();
}
