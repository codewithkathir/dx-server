import type { MailMessage, MailRecipient } from "../mail.types";
import { config } from "../../../config";
import { renderEmail } from "./layout";

/** One-time link to choose a new password. */
export function passwordResetEmail(to: MailRecipient, resetUrl: string, validForMinutes: number): MailMessage {
  const validFor = validForMinutes % 60 === 0 ? `${validForMinutes / 60} hour${validForMinutes === 60 ? "" : "s"}` : `${validForMinutes} minutes`;
  return {
    to,
    tag: "password-reset",
    subject: "Reset your DX password",
    ...renderEmail({
      preheader: `Use this link within ${validFor} to choose a new password.`,
      badge: { label: "Security", tone: "info" },
      heading: "Reset your password",
      paragraphs: [
        `Hi ${to.name ?? "there"},`,
        "We received a request to reset the password for your DX account. Choose a new password with the button below.",
      ],
      button: { label: "Choose a new password", url: resetUrl },
      footnote: `This link works once and expires in ${validFor}. If you didn't ask for a reset, you can ignore this email — your password stays the same.`,
    }),
  };
}

/** Security notice after the password was changed or reset. */
export function passwordChangedEmail(to: MailRecipient, loginUrl: string): MailMessage {
  return {
    to,
    tag: "password-changed",
    subject: "Your DX password was changed",
    ...renderEmail({
      preheader: "If this wasn't you, reset your password now.",
      badge: { label: "Security alert", tone: "warning" },
      heading: "Your password was changed",
      paragraphs: [
        `Hi ${to.name ?? "there"},`,
        "The password for your DX account was just changed. If you did this, there's nothing else to do.",
        "If you didn't change it, reset your password straight away and tell your administrator.",
      ],
      button: { label: "Go to sign in", url: loginUrl },
    }),
  };
}

/** Sent when an administrator creates an employee account: how to sign in for the first time. */
export function employeeWelcomeEmail(
  to: MailRecipient,
  password: string,
  loginUrl: string
): MailMessage {
  return {
    to,
    tag: "employee-welcome",
    sensitive: true,
    subject: `Welcome to ${config.company.name}: your account is ready`,
    ...renderEmail({
      preheader: "Your sign-in details for the expense and assets app.",
      badge: { label: "New account", tone: "info" },
      heading: "Your account is ready",
      paragraphs: [
        `Hi ${to.name ?? "there"},`,
        `An account has been created for you on ${config.company.name}. Use it to submit expense claims, track reimbursements and confirm the assets assigned to you.`,
      ],
      credentials: {
        title: "Your sign-in details",
        rows: [
          ["Email", to.email],
          ["Temporary password", password],
        ],
      },
      note: {
        label: "Change your password",
        text: "After you sign in for the first time, go to Profile → Change password and choose a password only you know.",
        tone: "warning",
      },
      button: { label: "Sign in", url: loginUrl },
      footnote: "Keep these details private. If you weren't expecting this email, tell your administrator.",
    }),
  };
}
