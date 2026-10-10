import type { MailMessage } from "../../../src/shared/mail/mail.types";

type MailModule = typeof import("../../../src/shared/mail");

/** Load the mail module with the given env, so config.mail reflects it. */
function loadMail(env: Record<string, string | undefined>): MailModule {
  const saved = { ...process.env };
  Object.assign(process.env, env);
  for (const [key, value] of Object.entries(env)) if (value === undefined) delete process.env[key];
  let mod!: MailModule;
  jest.isolateModules(() => {
    mod = require("../../../src/shared/mail");
  });
  process.env = saved;
  return mod;
}

const okResponse = { ok: true, status: 202, headers: { get: () => "msg-123" }, text: async () => "" };

describe("email templates", () => {
  const mail = loadMail({ SENDGRID_API_KEY: undefined });

  it("puts the reset link in both the HTML and text bodies", () => {
    const url = "https://app.example.com/reset-password?token=abc123";
    const message = mail.passwordResetEmail({ email: "a@b.com", name: "Aisha" }, url, 60);
    expect(message.subject).toBe("Reset your DX password");
    expect(message.html).toContain(url);
    expect(message.text).toContain(url);
    expect(message.text).toContain("expires in 1 hour");
  });

  it("escapes user-provided text in HTML", () => {
    const message = mail.claimRejectedEmail(
      { email: "a@b.com", name: "<script>x</script>" },
      { id: 7, amount: 486, date: "2026-10-07", description: "Lunch <b>team</b>" },
      "https://app.example.com/app/expenses/7",
      "Missing receipt & date"
    );
    expect(message.html).not.toContain("<script>");
    expect(message.html).toContain("&lt;script&gt;");
    expect(message.html).toContain("Missing receipt &amp; date");
    expect(message.subject).toBe("Not approved: Lunch <b>team</b>");
  });

  it("formats amounts and dates like the app", () => {
    const message = mail.claimApprovedEmail(
      { email: "a@b.com", name: "Rahul" },
      { id: 3, amount: 1234.5, date: "2026-10-07", description: null },
      "https://app.example.com/app/expenses/3",
      "2026-10-21",
      null
    );
    expect(message.subject).toBe("Approved: AED 1,234.50 for Claim #3");
    expect(message.text).toContain("Expense date: 07 Oct 2026");
    expect(message.text).toContain("by 21 Oct 2026");
  });

  it("marks part payments with the remaining balance", () => {
    const message = mail.claimPaidEmail(
      { email: "a@b.com" },
      { id: 4, amount: 100, date: "2026-10-01", description: "Taxi" },
      "https://app.example.com/app/expenses/4",
      { amount: 40, date: "2026-10-05", method: "Bank Transfer", fullyPaid: false, balance: 60 }
    );
    expect(message.tag).toBe("claim-part-paid");
    expect(message.text).toContain("Still to pay: AED 60.00");
  });
});

describe("mailService", () => {
  const message: MailMessage = { to: { email: "rahul@company.ae", name: "Rahul" }, subject: "Hi", html: "<p>Hi</p>", text: "Hi", tag: "test" };
  const realFetch = global.fetch;
  afterEach(() => {
    global.fetch = realFetch;
  });

  it("only logs when no SendGrid key is set", async () => {
    const fetchMock = jest.fn();
    global.fetch = fetchMock as unknown as typeof fetch;
    const { mailService } = loadMail({ SENDGRID_API_KEY: undefined });
    await mailService.send(message);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("posts to SendGrid with tracking off when configured", async () => {
    const fetchMock = jest.fn().mockResolvedValue(okResponse);
    global.fetch = fetchMock as unknown as typeof fetch;
    const { mailService } = loadMail({
      SENDGRID_API_KEY: "SG.test-key",
      MAIL_FROM_EMAIL: "no-reply@dx.test",
      MAIL_FROM_NAME: "DX Enterprise",
    });
    await mailService.send(message);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://api.sendgrid.com/v3/mail/send");
    expect(init.headers.Authorization).toBe("Bearer SG.test-key");
    const body = JSON.parse(init.body);
    expect(body.from).toEqual({ email: "no-reply@dx.test", name: "DX Enterprise" });
    expect(body.personalizations[0].to[0]).toEqual({ email: "rahul@company.ae", name: "Rahul" });
    expect(body.tracking_settings.click_tracking.enable).toBe(false);
    expect(body.content.map((c: { type: string }) => c.type)).toEqual(["text/plain", "text/html"]);
  });

  it("throws on a SendGrid error, but sendInBackground never does", async () => {
    const fetchMock = jest.fn().mockResolvedValue({ ok: false, status: 403, headers: { get: () => null }, text: async () => "forbidden" });
    global.fetch = fetchMock as unknown as typeof fetch;
    const { mailService } = loadMail({ SENDGRID_API_KEY: "SG.test-key", MAIL_FROM_EMAIL: "no-reply@dx.test" });
    await expect(mailService.send(message)).rejects.toThrow("SendGrid responded 403");
    expect(() => mailService.sendInBackground(message)).not.toThrow();
    await new Promise((resolve) => setImmediate(resolve));
  });
});
