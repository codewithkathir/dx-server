import { config } from "../../../config";

/** Escape text before putting it into email HTML. */
export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export type EmailTone = "success" | "danger" | "info" | "warning";

export interface EmailBlock {
  /** Hidden preview line shown by inboxes after the subject. */
  preheader: string;
  /** Small status pill above the heading, e.g. "Approved". */
  badge?: { label: string; tone: EmailTone };
  heading: string;
  /** Paragraphs of plain text (escaped here). */
  paragraphs: string[];
  /** Optional key/value rows, e.g. Amount → AED 486.00. */
  details?: Array<[label: string, value: string]>;
  /** Optional boxed values shown in a monospace font, e.g. sign-in details. */
  credentials?: { title: string; rows: Array<[label: string, value: string]> };
  /** Optional highlighted note, e.g. the reviewer's reason. */
  note?: { label: string; text: string; tone?: EmailTone };
  button?: { label: string; url: string };
  /** Small print under the button. */
  footnote?: string;
}

const BRAND = {
  primary: "#1f4fd1",
  header: "#0f1c2e",
  ink: "#0f1c2e",
  body: "#334155",
  muted: "#64748b",
  border: "#e2e8f0",
  bg: "#f1f5f9",
  panel: "#f8fafc",
};

const TONES: Record<EmailTone, { bg: string; ink: string; bar: string }> = {
  success: { bg: "#e7f6ec", ink: "#166534", bar: "#16a34a" },
  danger: { bg: "#fdecea", ink: "#9f2a23", bar: "#dc2626" },
  info: { bg: "#eaf0fe", ink: "#1a43b4", bar: "#1f4fd1" },
  warning: { bg: "#fff6e5", ink: "#92400e", bar: "#d97706" },
};

const FONT = "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";
const MONO = "SFMono-Regular,Menlo,Consolas,'Liberation Mono',monospace";

function keyValueRows(rows: Array<[string, string]>, valueStyle: string): string {
  return rows
    .map(
      ([label, value], i) =>
        `<tr><td style="padding:12px 16px;font-size:13px;color:${BRAND.muted};${i ? `border-top:1px solid ${BRAND.border};` : ""}">${escapeHtml(label)}</td><td align="right" style="padding:12px 16px;font-size:14px;color:${BRAND.ink};${valueStyle}${i ? `border-top:1px solid ${BRAND.border};` : ""}">${escapeHtml(value)}</td></tr>`
    )
    .join("");
}

/** Table-based, inline-styled HTML so it renders the same in Gmail, Outlook and Apple Mail. */
export function renderEmail(block: EmailBlock): { html: string; text: string } {
  const company = escapeHtml(config.company.name);
  const address = config.company.address?.replace(/\\n/g, "\n").trim();
  const replyTo = config.mail.replyTo;

  const p = (text: string) =>
    `<p style="margin:0 0 14px;font-size:15px;line-height:24px;color:${BRAND.body};">${escapeHtml(text)}</p>`;

  const badge = block.badge
    ? `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 14px;"><tr><td style="padding:4px 10px;border-radius:999px;background:${TONES[block.badge.tone].bg};font-size:12px;font-weight:600;letter-spacing:0.04em;text-transform:uppercase;color:${TONES[block.badge.tone].ink};">${escapeHtml(block.badge.label)}</td></tr></table>`
    : "";

  const details = block.details?.length
    ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:8px 0 22px;border:1px solid ${BRAND.border};border-radius:10px;border-collapse:separate;background:${BRAND.panel};">${keyValueRows(block.details, "font-weight:600;")}</table>`
    : "";

  const credentials = block.credentials
    ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:8px 0 22px;border:1px solid ${BRAND.border};border-left:4px solid ${BRAND.primary};border-radius:10px;border-collapse:separate;">
<tr><td colspan="2" style="padding:12px 16px 4px;font-size:12px;font-weight:600;letter-spacing:0.04em;text-transform:uppercase;color:${BRAND.muted};">${escapeHtml(block.credentials.title)}</td></tr>
${keyValueRows(block.credentials.rows, `font-family:${MONO};font-weight:600;`)}</table>`
    : "";

  const noteTone = TONES[block.note?.tone ?? "info"];
  const note = block.note
    ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:8px 0 22px;"><tr><td style="padding:14px 16px;border-left:4px solid ${noteTone.bar};border-radius:8px;background:${noteTone.bg};font-size:14px;line-height:21px;color:${noteTone.ink};"><strong>${escapeHtml(block.note.label)}</strong><br>${escapeHtml(block.note.text).replace(/\n/g, "<br>")}</td></tr></table>`
    : "";

  const button = block.button
    ? `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:6px 0 22px;"><tr><td style="border-radius:8px;background:${BRAND.primary};"><a href="${escapeHtml(block.button.url)}" style="display:inline-block;padding:13px 26px;font-family:${FONT};font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:8px;">${escapeHtml(block.button.label)}</a></td></tr></table>`
    : "";

  const linkFallback = block.button
    ? `<p style="margin:0;font-size:12px;line-height:18px;color:${BRAND.muted};">If the button doesn't work, copy this link into your browser:<br><a href="${escapeHtml(block.button.url)}" style="color:${BRAND.primary};word-break:break-all;">${escapeHtml(block.button.url)}</a></p>`
    : "";

  const footnote = block.footnote
    ? `<p style="margin:0 0 14px;font-size:13px;line-height:20px;color:${BRAND.muted};">${escapeHtml(block.footnote)}</p>`
    : "";

  const small = block.footnote || block.button
    ? `<tr><td style="padding:0 32px 28px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td style="border-top:1px solid ${BRAND.border};padding-top:18px;">${footnote}${linkFallback}</td></tr></table></td></tr>`
    : "";

  const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"><meta name="supported-color-schemes" content="light"><title>${escapeHtml(block.heading)}</title></head>
<body style="margin:0;padding:0;background:${BRAND.bg};font-family:${FONT};-webkit-font-smoothing:antialiased;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(block.preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${BRAND.bg};"><tr><td align="center" style="padding:32px 12px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border:1px solid ${BRAND.border};border-radius:12px;border-collapse:separate;overflow:hidden;">
<tr><td style="background:${BRAND.header};padding:20px 32px;border-radius:12px 12px 0 0;font-size:18px;font-weight:700;letter-spacing:0.01em;color:#ffffff;">${company}</td></tr>
<tr><td style="height:4px;line-height:4px;font-size:0;background:${block.badge ? TONES[block.badge.tone].bar : BRAND.primary};">&nbsp;</td></tr>
<tr><td style="padding:32px 32px 10px;">
${badge}<h1 style="margin:0 0 18px;font-size:22px;line-height:30px;font-weight:700;color:${BRAND.ink};">${escapeHtml(block.heading)}</h1>
${block.paragraphs.map(p).join("\n")}
${details}${credentials}${note}${button}
</td></tr>
${small}
</table>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;"><tr><td align="center" style="padding:20px 24px;font-size:12px;line-height:18px;color:${BRAND.muted};">
<strong style="color:${BRAND.body};">${company}</strong>${address ? `<br>${escapeHtml(address).replace(/\n/g, "<br>")}` : ""}<br>
This is an automated message. ${replyTo ? `For help, reply to this email or write to <a href="mailto:${escapeHtml(replyTo)}" style="color:${BRAND.muted};">${escapeHtml(replyTo)}</a>.` : "Please don't reply to this email; contact your administrator instead."}
</td></tr></table>
</td></tr></table>
</body></html>`;

  const text = [
    config.company.name.toUpperCase(),
    "",
    ...(block.badge ? [`[${block.badge.label}]`] : []),
    block.heading,
    "",
    ...block.paragraphs.flatMap((paragraph) => [paragraph, ""]),
    ...(block.details?.length ? [...block.details.map(([label, value]) => `${label}: ${value}`), ""] : []),
    ...(block.credentials ? [block.credentials.title, ...block.credentials.rows.map(([label, value]) => `${label}: ${value}`), ""] : []),
    ...(block.note ? [block.note.label, block.note.text, ""] : []),
    ...(block.button ? [`${block.button.label}: ${block.button.url}`, ""] : []),
    ...(block.footnote ? [block.footnote, ""] : []),
    "—",
    config.company.name,
    ...(address ? [address] : []),
    "This is an automated message.",
  ].join("\n");

  return { html, text };
}
