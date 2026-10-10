import { config } from "../../config";
import { logger } from "../../shared/logger/logger";
import {
  claimApprovedEmail,
  claimPaidEmail,
  claimRejectedEmail,
  mailService,
  type ClaimSummary,
  type MailRecipient,
} from "../../shared/mail";
import { fromFils, toFils } from "../../shared/utils/money.util";
import { employeeRepository } from "../employees/employee.repository";
import { payableRepository } from "../payables/payable.repository";
import { paymentMethodRepository } from "../payment-methods/payment-method.repository";
import { expenseRepository } from "./expense.repository";

/**
 * Emails the employee about their claim. Called after the database change has committed;
 * loading and sending happen in the background, so a mail problem never affects the request.
 */

const claimUrl = (expenseId: number) => `${config.app.frontendUrl}/app/expenses/${expenseId}`;

async function loadClaim(
  expenseId: number
): Promise<{ to: MailRecipient; claim: ClaimSummary; reviewNote: string | null } | null> {
  const expense = await expenseRepository.findById(expenseId);
  if (!expense) return null;
  const employee = await employeeRepository.findById(expense.employee_id);
  if (!employee?.email) return null;
  return {
    to: { email: employee.email, name: employee.emp_name },
    claim: {
      id: expense.id,
      amount: Number(expense.amount),
      date: String(expense.date).slice(0, 10),
      description: expense.description,
    },
    reviewNote: expense.review_note ?? null,
  };
}

function inBackground(task: () => Promise<void>, context: Record<string, unknown>): void {
  task().catch((err: unknown) => {
    logger.error({ ...context, err: err instanceof Error ? err.message : err }, "Claim email could not be prepared");
  });
}

export function notifyClaimApproved(expenseId: number): void {
  inBackground(
    async () => {
      const data = await loadClaim(expenseId);
      if (!data) return;
      const bill = await payableRepository.findByExpenseId(expenseId);
      const dueDate = bill ? String(bill.due_date).slice(0, 10) : data.claim.date;
      mailService.sendInBackground(claimApprovedEmail(data.to, data.claim, claimUrl(expenseId), dueDate, data.reviewNote));
    },
    { expenseId, event: "approved" }
  );
}

export function notifyClaimRejected(expenseId: number): void {
  inBackground(
    async () => {
      const data = await loadClaim(expenseId);
      if (!data) return;
      const reason = data.reviewNote ?? "No reason was given.";
      mailService.sendInBackground(claimRejectedEmail(data.to, data.claim, claimUrl(expenseId), reason));
    },
    { expenseId, event: "rejected" }
  );
}

/** A payment was recorded on a reimbursement bill. Supplier bills are ignored. */
export function notifyReimbursementPayment(
  billId: number,
  payment: { amount: number; date: string; paymentMethodId: number }
): void {
  inBackground(
    async () => {
      const bill = await payableRepository.findById(billId);
      if (!bill || bill.payee_type !== "employee" || !bill.expense_id) return;
      const data = await loadClaim(bill.expense_id);
      if (!data) return;
      const method = await paymentMethodRepository.findById(payment.paymentMethodId);
      const balance = fromFils(toFils(bill.total_amount) - toFils(bill.amount_paid));
      mailService.sendInBackground(
        claimPaidEmail(data.to, data.claim, claimUrl(bill.expense_id), {
          amount: payment.amount,
          date: payment.date,
          method: method?.name ?? null,
          fullyPaid: balance <= 0,
          balance,
        })
      );
    },
    { billId, event: "payment" }
  );
}
