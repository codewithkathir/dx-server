import type { MailMessage, MailRecipient } from "../mail.types";
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
