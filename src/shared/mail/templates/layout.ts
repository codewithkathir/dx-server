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

export interface EmailBlock {
  /** Hidden preview line shown by inboxes after the subject. */
  preheader: string;
  heading: string;
  /** Paragraphs of plain text (escaped here). */
  paragraphs: string[];
  /** Optional key/value rows, e.g. Amount → AED 486.00. */
  details?: Array<[label: string, value: string]>;
  /** Optional highlighted note, e.g. the reviewer's reason. */
  note?: { label: string; text: string; tone?: "info" | "danger" };
  button?: { label: string; url: string };
  /** Small print under the button. */
  footnote?: string;
}

const BRAND = {
  blue: "#1f4fd1",
  ink: "#0f1c2e",
  muted: "#556275",
  border: "#dfe4ec",
  bg: "#f5f7fb",
  blue50: "#eaf0fe",
  dangerBg: "#fdecea",
  dangerInk: "#9f2a23",
};

/** Table-based, inline-styled HTML so it renders the same in Gmail, Outlook and Apple Mail. */
export function renderEmail(block: EmailBlock): { html: string; text: string } {
  const company = escapeHtml(config.company.name);
  const p = (text: string) =>
    `<p style="margin:0 0 14px;font-size:15px;line-height:22px;color:${BRAND.ink};">${escapeHtml(text)}</p>`;

  const details = block.details?.length
    ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:6px 0 18px;border:1px solid ${BRAND.border};border-radius:12px;border-collapse:separate;">${block.details
        .map(
          ([label, value], i) =>
            `<tr><td style="padding:11px 14px;font-size:14px;color:${BRAND.muted};${i ? `border-top:1px solid ${BRAND.border};` : ""}">${escapeHtml(label)}</td><td align="right" style="padding:11px 14px;font-size:14px;font-weight:600;color:${BRAND.ink};${i ? `border-top:1px solid ${BRAND.border};` : ""}">${escapeHtml(value)}</td></tr>`
        )
        .join("")}</table>`
    : "";

  const note = block.note
    ? `<div style="margin:6px 0 18px;padding:12px 14px;border-radius:12px;background:${block.note.tone === "danger" ? BRAND.dangerBg : BRAND.blue50};color:${block.note.tone === "danger" ? BRAND.dangerInk : "#1a43b4"};font-size:14px;line-height:20px;"><strong>${escapeHtml(block.note.label)}</strong><br>${escapeHtml(block.note.text).replace(/\n/g, "<br>")}</div>`
    : "";

  const button = block.button
    ? `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:8px 0 18px;"><tr><td style="border-radius:10px;background:${BRAND.blue};"><a href="${escapeHtml(block.button.url)}" style="display:inline-block;padding:12px 22px;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:10px;">${escapeHtml(block.button.label)}</a></td></tr></table>
       <p style="margin:0 0 14px;font-size:12px;line-height:18px;color:${BRAND.muted};">If the button doesn't work, copy this link into your browser:<br><a href="${escapeHtml(block.button.url)}" style="color:${BRAND.blue};word-break:break-all;">${escapeHtml(block.button.url)}</a></p>`
    : "";

  const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(block.heading)}</title></head>
<body style="margin:0;padding:0;background:${BRAND.bg};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(block.preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${BRAND.bg};"><tr><td align="center" style="padding:28px 16px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;">
<tr><td style="padding:0 4px 16px;font-size:18px;font-weight:700;color:${BRAND.blue};letter-spacing:-0.01em;">DX <span style="color:${BRAND.ink};font-weight:500;">Enterprise</span></td></tr>
<tr><td style="background:#ffffff;border:1px solid ${BRAND.border};border-radius:16px;padding:28px 28px 14px;">
<h1 style="margin:0 0 16px;font-size:22px;line-height:30px;font-weight:600;color:${BRAND.ink};">${escapeHtml(block.heading)}</h1>
${block.paragraphs.map(p).join("\n")}
${details}${note}${button}
${block.footnote ? `<p style="margin:0 0 14px;font-size:13px;line-height:19px;color:${BRAND.muted};">${escapeHtml(block.footnote)}</p>` : ""}
</td></tr>
<tr><td style="padding:16px 4px;font-size:12px;line-height:18px;color:${BRAND.muted};">Sent by ${company} · This is an automated message, please don't reply unless a reply address is shown.</td></tr>
</table></td></tr></table>
</body></html>`;

  const text = [
    block.heading,
    "",
    ...block.paragraphs,
    ...(block.details?.length ? ["", ...block.details.map(([label, value]) => `${label}: ${value}`)] : []),
    ...(block.note ? ["", `${block.note.label}`, block.note.text] : []),
    ...(block.button ? ["", `${block.button.label}: ${block.button.url}`] : []),
    ...(block.footnote ? ["", block.footnote] : []),
    "",
    `— ${config.company.name}`,
  ].join("\n");

  return { html, text };
}
