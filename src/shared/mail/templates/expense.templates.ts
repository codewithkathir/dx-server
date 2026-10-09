import type { MailMessage, MailRecipient } from "../mail.types";
import { formatAed, formatDate } from "./format";
import { renderEmail } from "./layout";

export interface ClaimSummary {
  id: number;
  amount: number;
  /** Expense date, YYYY-MM-DD. */
  date: string;
  description: string | null;
}

const claimTitle = (claim: ClaimSummary) => claim.description?.split("\n")[0]?.trim() || `Claim #${claim.id}`;

const claimDetails = (claim: ClaimSummary): Array<[string, string]> => [
  ["Claim", `#${claim.id} · ${claimTitle(claim)}`],
  ["Amount", formatAed(claim.amount)],
  ["Expense date", formatDate(claim.date)],
];

export function claimApprovedEmail(
  to: MailRecipient,
  claim: ClaimSummary,
  claimUrl: string,
  dueDate: string,
  note: string | null
): MailMessage {
  return {
    to,
    tag: "claim-approved",
    subject: `Approved: ${formatAed(claim.amount)} for ${claimTitle(claim)}`,
    ...renderEmail({
      preheader: `You'll be paid back by ${formatDate(dueDate)}.`,
      heading: "Your expense claim was approved",
      paragraphs: [`Hi ${to.name ?? "there"},`, `Good news — your claim was approved. Finance will pay you back by ${formatDate(dueDate)}.`],
      details: claimDetails(claim),
      note: note ? { label: "Note from your administrator", text: note } : undefined,
      button: { label: "View claim", url: claimUrl },
    }),
  };
}

export function claimRejectedEmail(to: MailRecipient, claim: ClaimSummary, claimUrl: string, reason: string): MailMessage {
  return {
    to,
    tag: "claim-rejected",
    subject: `Not approved: ${claimTitle(claim)}`,
    ...renderEmail({
      preheader: "See the reason from your administrator.",
      heading: "Your expense claim wasn't approved",
      paragraphs: [`Hi ${to.name ?? "there"},`, "Your administrator reviewed this claim and didn't approve it."],
      details: claimDetails(claim),
      note: { label: "Reason", text: reason, tone: "danger" },
      button: { label: "View claim", url: claimUrl },
      footnote: "If you think this is a mistake, talk to your administrator.",
    }),
  };
}

export function claimPaidEmail(
  to: MailRecipient,
  claim: ClaimSummary,
  claimUrl: string,
  payment: { amount: number; date: string; method: string | null; fullyPaid: boolean; balance: number }
): MailMessage {
  const details: Array<[string, string]> = [
    ...claimDetails(claim),
    ["Paid now", formatAed(payment.amount)],
    ["Payment date", formatDate(payment.date)],
    ...(payment.method ? ([["Method", payment.method]] as Array<[string, string]>) : []),
    ...(payment.fullyPaid ? [] : ([["Still to pay", formatAed(payment.balance)]] as Array<[string, string]>)),
  ];
  return {
    to,
    tag: payment.fullyPaid ? "claim-paid" : "claim-part-paid",
    subject: payment.fullyPaid
      ? `Paid: ${formatAed(claim.amount)} for ${claimTitle(claim)}`
      : `Part payment: ${formatAed(payment.amount)} for ${claimTitle(claim)}`,
    ...renderEmail({
      preheader: payment.fullyPaid ? "Your claim has been paid back in full." : "Part of your claim has been paid back.",
      heading: payment.fullyPaid ? "You've been paid back" : "Part of your claim was paid",
      paragraphs: [
        `Hi ${to.name ?? "there"},`,
        payment.fullyPaid
          ? "Your expense claim has been paid back in full."
          : "Finance recorded a part payment on your claim. The rest will follow.",
      ],
      details,
      button: { label: "View claim", url: claimUrl },
    }),
  };
}
