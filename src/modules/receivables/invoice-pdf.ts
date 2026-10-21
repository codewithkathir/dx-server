import PDFDocument from "pdfkit";
import { fromFils, toFils } from "../../shared/utils/money.util";
import { countryName } from "../../shared/utils/phone.util";
import type { InvoiceBrandingAssets } from "../invoice-branding/invoice-branding.service";
import type { InvoiceListRow } from "./receivable.types";

export interface CompanyDetails {
  name: string;
  address?: string;
  trn?: string;
  bankDetails?: string;
}

const M = 40; // page margin
const BRAND = "#1f4fd1";
const ACCENT = "#2ee59d";
const INK = "#0f1c2e";
const MUTED = "#5b6b82";
const RULE = "#dfe5ee";
const TINT = "#eef3ff";
const FOOTER_HEIGHT = 34;

const money = (value: string | number) =>
  new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(
    typeof value === "number" ? value : fromFils(toFils(value))
  );

/** "2026-10-09" → "09/10/2026" (UAE day-first format). */
const displayDate = (iso: string) => {
  const [year, month, day] = iso.split("-");
  return `${day}/${month}/${year}`;
};

/** Env values use "\n" for line breaks. */
const lines = (value?: string | null) =>
  (value ?? "").split(/\\n|\n/).map((line) => line.trim()).filter(Boolean);

const ONES = [
  "", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten",
  "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen",
];
const TENS = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

function belowThousand(n: number): string {
  const hundreds = Math.floor(n / 100);
  const rest = n % 100;
  const parts: string[] = [];
  if (hundreds) parts.push(`${ONES[hundreds]} Hundred`);
  if (rest >= 20) parts.push([TENS[Math.floor(rest / 10)], ONES[rest % 10]].filter(Boolean).join("-"));
  else if (rest) parts.push(ONES[rest]!);
  return parts.join(" ");
}

function integerToWords(n: number): string {
  if (n === 0) return "Zero";
  const scales: Array<[number, string]> = [[1e9, "Billion"], [1e6, "Million"], [1e3, "Thousand"], [1, ""]];
  const parts: string[] = [];
  for (const [size, name] of scales) {
    const chunk = Math.floor(n / size) % 1000;
    if (chunk) parts.push([belowThousand(chunk), name].filter(Boolean).join(" "));
  }
  return parts.join(" ");
}

/** 1250.5 AED → "UAE Dirhams One Thousand Two Hundred Fifty and Fils Fifty Only". */
export function amountInWords(amount: number, currency: string): string {
  const fils = Math.round(amount * 100);
  const whole = Math.floor(fils / 100);
  const cents = fils % 100;
  const [major, minor] = currency === "AED" ? ["UAE Dirhams", "Fils"] : [currency, "Cents"];
  return `${major} ${integerToWords(whole)}${cents ? ` and ${minor} ${integerToWords(cents)}` : ""} Only`;
}

/**
 * Renders an invoice as an A4 PDF with the company logo, signature and stamp from
 * Settings → Invoice branding. Titled "Tax Invoice" when the company has a TRN
 * (UAE FTA: only VAT-registered businesses issue tax invoices).
 * The caller pipes the returned document and calls `end()`.
 */
export function renderInvoicePdf(
  invoice: InvoiceListRow,
  company: CompanyDetails,
  branding: InvoiceBrandingAssets = {}
): PDFKit.PDFDocument {
  const doc = new PDFDocument({
    size: "A4",
    margins: { top: M, left: M, right: M, bottom: M + FOOTER_HEIGHT },
    bufferPages: true,
    info: { Title: `Invoice ${invoice.invoice_no}`, Author: company.name },
  });
  const pageWidth = doc.page.width;
  const W = pageWidth - M * 2;
  const right = M + W;
  const contentBottom = () => doc.page.height - M - FOOTER_HEIGHT;
  const title = company.trn ? "TAX INVOICE" : "INVOICE";
  const currency = invoice.currency;

  const label = (text: string, x: number, y: number, options: PDFKit.Mixins.TextOptions = {}) =>
    doc.font("Helvetica-Bold").fontSize(7.5).fillColor(MUTED)
      .text(text.toUpperCase(), x, y, { characterSpacing: 0.6, ...options });

  // ── Header: accent bar, logo + seller (left), title (right)
  doc.rect(0, 0, pageWidth, 6).fill(BRAND);
  doc.rect(pageWidth - 140, 0, 140, 6).fill(ACCENT);

  let leftY = M;
  if (branding.logo) {
    try {
      doc.image(branding.logo, M, leftY, { fit: [170, 56], valign: "center" });
      leftY += 64;
    } catch {
      // Unsupported or corrupt image: fall back to the text header.
    }
  }
  doc.font("Helvetica-Bold").fontSize(branding.logo ? 11 : 17).fillColor(INK)
    .text(company.name, M, leftY, { width: W * 0.55 });
  doc.font("Helvetica").fontSize(8.5).fillColor(MUTED);
  for (const line of lines(company.address)) doc.text(line, { width: W * 0.55 });
  if (company.trn) doc.text(`TRN ${company.trn}`, { width: W * 0.55 });
  const sellerBottom = doc.y;

  doc.font("Helvetica-Bold").fontSize(24).fillColor(BRAND)
    .text(title, M + W / 2, M, { width: W / 2, align: "right", characterSpacing: 1 });
  doc.font("Helvetica").fontSize(10).fillColor(MUTED)
    .text(`# ${invoice.invoice_no}`, M + W / 2, doc.y + 2, { width: W / 2, align: "right" });
  const titleBottom = doc.y;

  // ── Info strip
  let y = Math.max(sellerBottom, titleBottom) + 20;
  const info: Array<[string, string]> = [
    ["Invoice no.", invoice.invoice_no],
    ["Invoice date", displayDate(invoice.invoice_date)],
    ["Due date", displayDate(invoice.due_date)],
    invoice.po_reference ? ["PO reference", invoice.po_reference] : ["Currency", currency],
  ];
  doc.roundedRect(M, y, W, 46, 6).fill(TINT);
  const cell = W / info.length;
  info.forEach(([name, value], i) => {
    const x = M + cell * i + 14;
    label(name, x, y + 10, { width: cell - 20 });
    doc.font("Helvetica-Bold").fontSize(10).fillColor(INK).text(value, x, y + 23, { width: cell - 20, ellipsis: true, lineBreak: false });
  });
  y += 46 + 22;

  // ── Bill to (left) and amount due (right)
  const totalFils = toFils(invoice.total_amount);
  const receivedFils = toFils(invoice.amount_received);
  const balance = fromFils(totalFils - receivedFils);
  const dueBoxWidth = 200;
  const billWidth = W - dueBoxWidth - 24;

  label("Bill to", M, y);
  doc.font("Helvetica-Bold").fontSize(12).fillColor(INK).text(invoice.customer_name, M, y + 13, { width: billWidth });
  doc.font("Helvetica").fontSize(9).fillColor(MUTED);
  for (const line of lines(invoice.customer_address)) doc.text(line, { width: billWidth });
  const place = [invoice.customer_city_state, countryName(invoice.customer_country)].filter(Boolean).join(", ");
  if (place) doc.text(place, { width: billWidth });
  if (invoice.customer_email) doc.text(invoice.customer_email, { width: billWidth });
  if (invoice.customer_trn) doc.font("Helvetica-Bold").fillColor(INK).text(`TRN ${invoice.customer_trn}`, { width: billWidth });
  const billBottom = doc.y;

  const dueX = right - dueBoxWidth;
  const paid = invoice.status === "paid" || balance <= 0;
  doc.roundedRect(dueX, y, dueBoxWidth, 72, 8).fill(paid ? "#12a26b" : BRAND);
  doc.font("Helvetica-Bold").fontSize(7.5).fillColor("#ffffff").opacity(0.85)
    .text(paid ? "PAID IN FULL" : `AMOUNT DUE (${currency})`, dueX + 14, y + 12, { width: dueBoxWidth - 28, characterSpacing: 0.6 });
  doc.opacity(1).font("Helvetica-Bold").fontSize(20)
    .text(money(paid ? fromFils(totalFils) : balance), dueX + 14, y + 26, { width: dueBoxWidth - 28 });
  doc.font("Helvetica").fontSize(8).opacity(0.85)
    .text(paid ? `Total ${currency} ${money(invoice.total_amount)}` : `Due by ${displayDate(invoice.due_date)}`, dueX + 14, y + 52, {
      width: dueBoxWidth - 28,
    });
  doc.opacity(1);
  y = Math.max(billBottom, y + 72) + 26;

  // ── Line table
  const col = { no: 28, vat: 64, amount: 110 };
  const descX = M + col.no;
  const descWidth = W - col.no - col.vat - col.amount;
  const vatX = descX + descWidth;
  const amountX = vatX + col.vat;
  const vatRate = Number(invoice.vat_rate);

  doc.roundedRect(M, y, W, 26, 5).fill(INK);
  doc.font("Helvetica-Bold").fontSize(8).fillColor("#ffffff");
  doc.text("#", M + 10, y + 9, { width: col.no - 10 });
  doc.text("DESCRIPTION", descX + 4, y + 9, { width: descWidth - 8, characterSpacing: 0.5 });
  doc.text("VAT", vatX, y + 9, { width: col.vat - 8, align: "right", characterSpacing: 0.5 });
  doc.text(`AMOUNT (${currency})`, amountX, y + 9, { width: col.amount - 10, align: "right", characterSpacing: 0.5 });
  y += 26;

  const description = invoice.description?.trim() || "Services";
  doc.font("Helvetica").fontSize(10);
  const rowHeight = Math.max(doc.heightOfString(description, { width: descWidth - 8 }), 12) + 20;
  doc.fillColor(MUTED).text("1", M + 10, y + 10, { width: col.no - 10 });
  doc.fillColor(INK).text(description, descX + 4, y + 10, { width: descWidth - 8 });
  doc.fillColor(MUTED).text(`${vatRate}%`, vatX, y + 10, { width: col.vat - 8, align: "right" });
  doc.font("Helvetica-Bold").fillColor(INK).text(money(invoice.subtotal_amount), amountX, y + 10, { width: col.amount - 10, align: "right" });
  y += rowHeight;
  doc.moveTo(M, y).lineTo(right, y).lineWidth(1).strokeColor(RULE).stroke();
  y += 18;

  // ── Totals (right) beside amount in words + notes (left)
  const totalsWidth = 230;
  const totalsX = right - totalsWidth;
  const leftWidth = W - totalsWidth - 30;
  const sectionTop = y;

  const totals: Array<[string, string, "row" | "total" | "balance"]> = [
    ["Subtotal (excl. VAT)", money(invoice.subtotal_amount), "row"],
    [`VAT ${vatRate}%${vatRate === 0 ? " (zero-rated)" : ""}`, money(invoice.vat_amount), "row"],
    [`Total (${currency})`, money(invoice.total_amount), "total"],
  ];
  if (receivedFils > 0) {
    totals.push(["Amount received", `– ${money(invoice.amount_received)}`, "row"]);
    totals.push([`Balance due (${currency})`, money(balance), "balance"]);
  }
  for (const [name, value, kind] of totals) {
    if (kind === "row") {
      doc.font("Helvetica").fontSize(9.5).fillColor(MUTED).text(name, totalsX + 10, y, { width: 130 });
      doc.fillColor(INK).text(value, totalsX + 130, y, { width: totalsWidth - 140, align: "right" });
      y += 18;
    } else {
      y += 2;
      doc.roundedRect(totalsX, y - 6, totalsWidth, 26, 5).fill(kind === "total" ? TINT : INK);
      const color = kind === "total" ? BRAND : "#ffffff";
      doc.font("Helvetica-Bold").fontSize(10.5).fillColor(color).text(name, totalsX + 10, y + 1, { width: 130 });
      doc.text(value, totalsX + 130, y + 1, { width: totalsWidth - 140, align: "right" });
      y += 28;
    }
  }
  const totalsBottom = y;

  let leftY2 = sectionTop;
  label("Amount in words", M, leftY2);
  doc.font("Helvetica-Oblique").fontSize(9.5).fillColor(INK)
    .text(amountInWords(fromFils(totalFils), currency), M, leftY2 + 12, { width: leftWidth });
  leftY2 = doc.y + 14;
  if (invoice.notes) {
    label("Notes", M, leftY2);
    doc.font("Helvetica").fontSize(9).fillColor(INK).text(invoice.notes, M, leftY2 + 12, { width: leftWidth });
    leftY2 = doc.y + 14;
  }

  // ── Payment details (left) and signature block (right)
  const bank = lines(company.bankDetails);
  const signWidth = 210;
  const blockHeight = 150;
  y = Math.max(leftY2, totalsBottom) + 24;
  if (y + blockHeight > contentBottom()) {
    doc.addPage();
    y = M;
  }

  if (bank.length > 0) {
    const bankWidth = W - signWidth - 30;
    doc.font("Helvetica").fontSize(9);
    const bankHeight = bank.reduce((h, line) => h + doc.heightOfString(line, { width: bankWidth - 28 }), 0) + 34;
    doc.roundedRect(M, y, bankWidth, bankHeight, 6).lineWidth(1).strokeColor(RULE).stroke();
    doc.rect(M, y + 6, 3, bankHeight - 12).fill(BRAND);
    label("Payment details", M + 14, y + 12);
    doc.font("Helvetica").fontSize(9).fillColor(INK).text(bank.join("\n"), M + 14, y + 25, { width: bankWidth - 28 });
  }

  const signX = right - signWidth;
  doc.font("Helvetica-Bold").fontSize(9).fillColor(INK)
    .text(`For ${company.name}`, signX, y, { width: signWidth, align: "center" });
  const imageTop = y + 16;
  const lineY = imageTop + 80;
  if (branding.stamp) {
    try {
      doc.save().opacity(0.9);
      doc.image(branding.stamp, signX + signWidth - 96, imageTop - 4, { fit: [88, 88], align: "center", valign: "center" });
      doc.restore();
    } catch {
      doc.restore();
    }
  }
  if (branding.signature) {
    try {
      doc.image(branding.signature, signX + 10, imageTop + 6, { fit: [signWidth - 70, 66], align: "center", valign: "bottom" });
    } catch {
      // Unsupported image: leave the space for a wet signature.
    }
  }
  doc.moveTo(signX, lineY).lineTo(right, lineY).lineWidth(0.8).strokeColor(INK).stroke();
  let signY = lineY + 6;
  if (branding.signatoryName) {
    doc.font("Helvetica-Bold").fontSize(9.5).fillColor(INK).text(branding.signatoryName, signX, signY, { width: signWidth, align: "center" });
    signY = doc.y + 1;
  }
  if (branding.signatoryTitle) {
    doc.font("Helvetica").fontSize(8.5).fillColor(MUTED).text(branding.signatoryTitle, signX, signY, { width: signWidth, align: "center" });
    signY = doc.y + 1;
  }
  doc.font("Helvetica").fontSize(7.5).fillColor(MUTED)
    .text("AUTHORISED SIGNATORY", signX, signY, { width: signWidth, align: "center", characterSpacing: 0.6 });

  // ── Every page: watermark for documents that aren't live, and the footer
  const { start, count } = doc.bufferedPageRange();
  for (let i = start; i < start + count; i++) {
    doc.switchToPage(i);
    const bottomMargin = doc.page.margins.bottom;
    doc.page.margins.bottom = 0; // writing inside the footer area must not add a page

    if (invoice.status === "draft" || invoice.status === "cancelled") {
      doc.save()
        .rotate(-30, { origin: [pageWidth / 2, doc.page.height / 2] })
        .font("Helvetica-Bold").fontSize(90).fillColor("#e00000").opacity(0.1)
        .text(invoice.status.toUpperCase(), 0, doc.page.height / 2 - 45, { width: pageWidth, align: "center", lineBreak: false })
        .restore();
    }

    const footerY = doc.page.height - M - 14;
    doc.moveTo(M, footerY - 8).lineTo(right, footerY - 8).lineWidth(0.6).strokeColor(RULE).stroke();
    doc.font("Helvetica").fontSize(7.5).fillColor(MUTED)
      .text("This is a computer-generated invoice. All amounts are in " + currency + ".", M, footerY, { width: W * 0.7, lineBreak: false })
      .text(`Page ${i - start + 1} of ${count}`, M + W * 0.7, footerY, { width: W * 0.3, align: "right", lineBreak: false });
    doc.page.margins.bottom = bottomMargin;
  }

  return doc;
}
