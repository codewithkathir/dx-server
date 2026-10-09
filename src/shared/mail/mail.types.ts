export interface MailRecipient {
  email: string;
  name?: string | null;
}

/** A rendered email, ready to send. Always carries both an HTML and a plain-text body. */
export interface MailMessage {
  to: MailRecipient;
  subject: string;
  html: string;
  text: string;
  /** Short label for logs, e.g. "password-reset". Never put tokens or links here. */
  tag: string;
}
