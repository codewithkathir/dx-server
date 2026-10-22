import nodemailer, { type Transporter } from "nodemailer";
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
  private transporter: Transporter | null = null;

  /** One pooled SMTP connection, created on first use. Port 465 is SSL; others upgrade with STARTTLS. */
  private smtp(): Transporter {
    if (!this.transporter) {
      const { host, port, user, pass } = config.mail.smtp;
      this.transporter = nodemailer.createTransport({
        host,
        port,
        secure: port === 465,
        requireTLS: port !== 465,
        auth: { user, pass },
        pool: true,
        connectionTimeout: SEND_TIMEOUT_MS,
        greetingTimeout: SEND_TIMEOUT_MS,
        socketTimeout: SEND_TIMEOUT_MS * 3,
      });
    }
    return this.transporter;
  }

  /** Checks the SMTP login without sending anything (used by scripts/test-mail.ts). */
  async verify(): Promise<void> {
    if (config.mail.provider !== "smtp") throw new Error("SMTP is not configured (SMTP_HOST is empty)");
    await this.smtp().verify();
  }

  /**
   * Sends through SMTP (e.g. Zoho Mail) when SMTP_HOST is set, otherwise SendGrid's v3 API.
   * Throws on failure, so use `sendInBackground` from request handlers.
   * With no provider configured the message is only logged.
   */
  async send(message: MailMessage): Promise<void> {
    const to = maskEmail(message.to.email);

    if (!config.mail.enabled) {
      logger.info({ tag: message.tag, to, subject: message.subject }, "Email not sent (mail disabled: no SMTP_HOST or SENDGRID_API_KEY)");
      if (config.isDevelopment && !message.sensitive) logger.debug({ tag: message.tag, text: message.text }, "Email body (dev)");
      return;
    }

    if (config.mail.provider === "smtp") {
      const info = await this.smtp().sendMail({
        from: { name: config.mail.fromName ?? "", address: config.mail.fromEmail! },
        to: message.to.name ? { name: message.to.name, address: message.to.email } : message.to.email,
        ...(config.mail.replyTo ? { replyTo: config.mail.replyTo } : {}),
        subject: message.subject,
        text: message.text,
        html: message.html,
        headers: { "X-DX-Tag": message.tag },
      });
      logger.info({ tag: message.tag, to, messageId: info.messageId }, "Email sent");
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
