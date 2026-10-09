import type { Knex } from "knex";
import { EXPENSE_REIMBURSEMENT_DUE_DAYS } from "../../shared/constants/finance";
import {
  DocumentSequences,
  nextDocumentNumber,
} from "../../shared/utils/document-number.util";
import { addDaysIso } from "../../shared/utils/money.util";

/**
 * Creates the reimbursement bill owed to an employee for an approved expense.
 * Knex-only (no app config) so the approval flow, the backfill migration and
 * seeds can all share it. Must run inside a transaction.
 */
export interface ExpenseForBill {
  id: number;
  employee_id: number;
  amount: string;
  category_id: number | null;
  description: string | null;
}

export async function createBillForExpense(
  trx: Knex.Transaction,
  expense: ExpenseForBill,
  options: { billDate: string; createdBy?: number | null; notes?: string | null }
): Promise<number> {
  const billNo = await nextDocumentNumber(
    trx,
    DocumentSequences.EXPENSE_BILL,
    Number(options.billDate.slice(0, 4))
  );

  const [id] = await trx("payable_bills").insert({
    bill_no: billNo,
    payee_type: "employee",
    supplier_id: null,
    employee_id: expense.employee_id,
    bill_date: options.billDate,
    due_date: addDaysIso(options.billDate, EXPENSE_REIMBURSEMENT_DUE_DAYS),
    subtotal_amount: expense.amount,
    vat_rate: 0,
    vat_amount: 0,
    total_amount: expense.amount,
    amount_paid: 0,
    category_id: expense.category_id,
    description: expense.description?.trim() || `Expense #${expense.id} reimbursement`,
    expense_id: expense.id,
    source: "expense",
    notes: options.notes ?? null,
    status: "open",
    created_by: options.createdBy ?? null,
    updated_by: options.createdBy ?? null,
    created_at: trx.fn.now(),
    updated_at: trx.fn.now(),
  });
  return id as number;
}

export interface ReimbursementSyncResult {
  billsCreated: number;
  paymentsCreated: number;
  rejectedSynced: number;
}

/**
 * Brings expenses decided under the old status-only flow into Payables:
 * - admin "rejected"                 → employee_status "rejected"
 * - approved, or admin "paid"        → reimbursement bill (if missing), employee_status "approved"
 * - admin "paid"                     → plus one full payment, so the bill is "paid"
 * Idempotent: expenses that already have a bill are skipped.
 * `paymentDateFor` picks the date of the backfilled payment.
 */
export async function syncExpenseReimbursements(
  trx: Knex.Transaction,
  paymentDateFor: (expense: { date: string; updated_at: Date }, billDate: string) => string,
  reference = "Backfilled"
): Promise<ReimbursementSyncResult> {
  const result: ReimbursementSyncResult = { billsCreated: 0, paymentsCreated: 0, rejectedSynced: 0 };

  result.rejectedSynced = await trx("expenses")
    .whereNull("deleted_at")
    .where({ admin_status: "rejected" })
    .whereNot({ employee_status: "rejected" })
    .update({ employee_status: "rejected" });

  const expenses = (await trx("expenses as x")
    .leftJoin("payable_bills as b", (join) => {
      join.on("b.expense_id", "x.id").andOnNull("b.deleted_at");
    })
    .whereNull("x.deleted_at")
    .whereNull("b.id")
    .where((q) => {
      void q.where("x.employee_status", "approved").orWhere("x.admin_status", "paid");
    })
    .whereNot("x.admin_status", "rejected")
    .orderBy("x.date", "asc")
    .orderBy("x.id", "asc")
    .select("x.*")) as Array<ExpenseForBill & {
      date: string;
      admin_status: string;
      payment_method_id: number;
      updated_at: Date;
    }>;

  for (const expense of expenses) {
    const billId = await createBillForExpense(trx, expense, {
      billDate: expense.date,
      notes: `${reference} from expense status`,
    });
    result.billsCreated += 1;

    if (expense.admin_status === "paid") {
      await trx("payable_payments").insert({
        bill_id: billId,
        payment_date: paymentDateFor(expense, expense.date),
        amount: expense.amount,
        payment_method_id: expense.payment_method_id,
        reference,
        notes: null,
        created_at: trx.fn.now(),
        updated_at: trx.fn.now(),
      });
      await trx("payable_bills")
        .where({ id: billId })
        .update({ amount_paid: expense.amount, status: "paid" });
      result.paymentsCreated += 1;
    }

    await trx("expenses")
      .where({ id: expense.id })
      .update({ employee_status: "approved" });
  }

  return result;
}
