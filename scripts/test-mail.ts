/**
 * Checks the mail setup: logs in to SMTP and, if an address is given, sends a test email.
 *   APP_ENV=dev npx tsx scripts/test-mail.ts             # login check only
 *   APP_ENV=dev npx tsx scripts/test-mail.ts me@x.com    # also send a test email
 */
import { config } from "../src/config";
import { mailService } from "../src/shared/mail";

async function main(): Promise<void> {
  const to = process.argv[2];
  console.log(`Provider: ${config.mail.provider ?? "none"} · from ${config.mail.fromEmail ?? "-"}`);
  if (config.mail.provider === "smtp") {
    await mailService.verify();
    console.log(`SMTP login OK (${config.mail.smtp.host}:${config.mail.smtp.port})`);
  }
  if (to) {
    await mailService.send({
      to: { email: to },
      subject: "DX test email",
      text: "This is a test email from DX. Mail is set up correctly.",
      html: "<p>This is a test email from <strong>DX</strong>. Mail is set up correctly.</p>",
      tag: "test-mail",
    });
    console.log(`Test email sent to ${to}`);
  }
  process.exit(0);
}

main().catch((err: unknown) => {
  console.error("Mail check failed:", err instanceof Error ? err.message : err);
  process.exit(1);
});
