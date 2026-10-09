import { config } from "../../config";
import { logger } from "../logger/logger";
import type { MailMessage } from "./mail.types";

const SENDGRID_URL = "https://api.sendgrid.com/v3/mail/send";
const SEND_TIMEOUT_MS = 10_000;

/** "rahul.k@company.ae" → "ra***@company.ae" so logs don't hold full addresses. */
function maskEmail(email: string): string {
  const [local = "", domain = ""] = email.split("@");
  return `${local.slice(0, 2)}***@${domain}`;
}

class MailService {
  /**
   * Sends through SendGrid's v3 API. Throws on failure, so use `sendInBackground`
   * from request handlers. Without SENDGRID_API_KEY the message is only logged.
   */
  async send(message: MailMessage): Promise<void> {
    const to = maskEmail(message.to.email);

    if (!config.mail.enabled) {
      logger.info({ tag: message.tag, to, subject: message.subject }, "Email not sent (mail disabled: no SENDGRID_API_KEY)");
      if (config.isDevelopment) logger.debug({ tag: message.tag, text: message.text }, "Email body (dev)");
      return;
    }

    const response = await fetch(SENDGRID_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.mail.sendgridApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        personalizations: [{ to: [{ email: message.to.email, ...(message.to.name ? { name: message.to.name } : {}) }] }],
        from: { email: config.mail.fromEmail, name: config.mail.fromName },
        ...(config.mail.replyTo ? { reply_to: { email: config.mail.replyTo } } : {}),
        subject: message.subject,
        content: [
          { type: "text/plain", value: message.text },
          { type: "text/html", value: message.html },
        ],
        categories: [message.tag],
        // Keep links exactly as written: tracked links would rewrite one-time reset URLs.
        tracking_settings: {
          click_tracking: { enable: false, enable_text: false },
          open_tracking: { enable: false },
        },
      }),
      signal: AbortSignal.timeout(SEND_TIMEOUT_MS),
    });

    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      throw new Error(`SendGrid responded ${response.status}: ${detail.slice(0, 500)}`);
    }

    logger.info({ tag: message.tag, to, messageId: response.headers.get("x-message-id") }, "Email sent");
  }

  /**
   * Fire-and-forget: never blocks or fails the request. Used for notifications and for
   * password resets, where a slow or failed send must not reveal whether the account exists.
   */
  sendInBackground(message: MailMessage): void {
    this.send(message).catch((err: unknown) => {
      logger.error(
        { tag: message.tag, to: maskEmail(message.to.email), err: err instanceof Error ? err.message : err },
        "Email failed to send"
      );
    });
  }
}

export const mailService = new MailService();
