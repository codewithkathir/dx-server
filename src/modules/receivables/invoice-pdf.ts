import PDFDocument from "pdfkit";
import { fromFils, toFils } from "../../shared/utils/money.util";
import type { InvoiceBrandingAssets } from "../invoice-branding/invoice-branding.service";
import type { InvoiceLineRow, InvoiceListRow } from "./receivable.types";

export interface CompanyDetails {
  name: string;
  address?: string;
  trn?: string;
  bankDetails?: string;
}

const M = 42; // page margin
const BRAND = "#1f4fd1";
const INK = "#111827";
const BODY = "#374151";
const MUTED = "#6b7280";
const RULE = "#e5e7eb";
const TINT = "#eef3fd";
const ZEBRA = "#f9fafb";
const PAID = "#0f8a5f";
const FOOTER_HEIGHT = 36;

const money = (value: string | number) =>
  new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(
    typeof value === "number" ? value : fromFils(toFils(value))
  );

/** 2 → "2", 1.5 → "1.5", 0.125 → "0.125". */
const quantity = (value: string | number) =>
  new Intl.NumberFormat("en-US", { maximumFractionDigits: 3 }).format(Number(value));

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
 * Renders an invoice as an A4 PDF: seller and title, bill-to and invoice details with the
 * amount due, the product lines (header repeated on every page), totals with amount in
 * words, payment details and the signature block. Logo, signature and stamp come from
 * Settings → Invoice branding. Titled "Tax Invoice" when the company has a TRN
 * (UAE FTA: only VAT-registered businesses issue tax invoices).
 * Invoices raised before line items show their description as a single line.
 * The caller pipes the returned document and calls `end()`.
 */
export function renderInvoicePdf(
  invoice: InvoiceListRow,
  lineRows: InvoiceLineRow[],
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
  const vatRate = Number(invoice.vat_rate);
  const totalFils = toFils(invoice.total_amount);
  const receivedFils = toFils(invoice.amount_received);
  const balance = fromFils(totalFils - receivedFils);
  const paid = invoice.status === "paid" || (invoice.status !== "draft" && totalFils > 0 && balance <= 0);

  const label = (text: string, x: number, y: number, options: PDFKit.Mixins.TextOptions = {}) =>
    doc.font("Helvetica-Bold").fontSize(7.5).fillColor(MUTED)
      .text(text.toUpperCase(), x, y, { characterSpacing: 0.7, lineBreak: false, ...options });

  /** Starts a new page when `needed` points don't fit below `y`; returns where to continue. */
  const ensureSpace = (y: number, needed: number, onNewPage?: (top: number) => number) => {
    if (y + needed <= contentBottom()) return y;
    doc.addPage();
    return onNewPage ? onNewPage(M) : M;
  };

  // ── Header: logo + seller (left), title + number (right)
  doc.rect(0, 0, pageWidth, 5).fill(BRAND);

  const sellerWidth = W * 0.56;
  let leftY = M;
  if (branding.logo) {
    try {
      doc.image(branding.logo, M, leftY, { fit: [160, 52], valign: "center" });
      leftY += 60;
    } catch {
      // Unsupported or corrupt image: fall back to the text header.
    }
  }
  doc.font("Helvetica-Bold").fontSize(branding.logo ? 12 : 18).fillColor(INK)
    .text(company.name, M, leftY, { width: sellerWidth });
  doc.font("Helvetica").fontSize(8.5).fillColor(MUTED).moveDown(0.15);
  for (const line of lines(company.address)) doc.text(line, { width: sellerWidth });
  if (company.trn) doc.font("Helvetica-Bold").fillColor(BODY).text(`TRN ${company.trn}`, { width: sellerWidth });
  const sellerBottom = doc.y;

  const titleX = M + sellerWidth;
  const titleWidth = W - sellerWidth;
  doc.font("Helvetica-Bold").fontSize(22).fillColor(INK)
    .text(title, titleX, M, { width: titleWidth, align: "right", characterSpacing: 1.2 });
  doc.font("Helvetica").fontSize(10).fillColor(MUTED)
    .text(invoice.invoice_no, titleX, doc.y + 3, { width: titleWidth, align: "right" });
  if (paid) {
    const pill = "PAID";
    doc.font("Helvetica-Bold").fontSize(8);
    const pillWidth = doc.widthOfString(pill, { characterSpacing: 0.8 }) + 18;
    const pillY = doc.y + 6;
    doc.roundedRect(right - pillWidth, pillY, pillWidth, 17, 8.5).fill(PAID);
    doc.fillColor("#ffffff").text(pill, right - pillWidth, pillY + 5, { width: pillWidth, align: "center", characterSpacing: 0.8 });
    doc.y = pillY + 17;
  }
  const titleBottom = doc.y;

  let y = Math.max(sellerBottom, titleBottom) + 16;
  doc.moveTo(M, y).lineTo(right, y).lineWidth(1).strokeColor(RULE).stroke();
  y += 16;

  // ── Bill to (left) and invoice details + amount due (right)
  const detailsWidth = 220;
  const detailsX = right - detailsWidth;
  const billWidth = W - detailsWidth - 32;
  const sectionTop = y;

  label("Bill to", M, y);
  doc.font("Helvetica-Bold").fontSize(11.5).fillColor(INK).text(invoice.customer_name, M, y + 13, { width: billWidth });
  doc.font("Helvetica").fontSize(9).fillColor(BODY).moveDown(0.1);
  for (const line of lines(invoice.customer_address)) doc.text(line, { width: billWidth });
  const place = [invoice.customer_city_state, invoice.customer_country_name ?? invoice.customer_country].filter(Boolean).join(", ");
  if (place) doc.text(place, { width: billWidth });
  if (invoice.customer_email) doc.fillColor(MUTED).text(invoice.customer_email, { width: billWidth });
  if (invoice.customer_trn) doc.font("Helvetica-Bold").fillColor(BODY).text(`TRN ${invoice.customer_trn}`, { width: billWidth });
  const billBottom = doc.y;

  const details: Array<[string, string]> = [
    ["Invoice date", displayDate(invoice.invoice_date)],
    ["Due date", displayDate(invoice.due_date)],
  ];
  if (invoice.po_reference) details.push(["PO reference", invoice.po_reference]);
  let detailY = sectionTop;
  for (const [name, value] of details) {
    doc.font("Helvetica").fontSize(9).fillColor(MUTED).text(name, detailsX, detailY, { width: 100, lineBreak: false });
    doc.font("Helvetica-Bold").fontSize(9).fillColor(INK)
      .text(value, detailsX + 100, detailY, { width: detailsWidth - 100, align: "right", lineBreak: false, ellipsis: true });
    detailY += 16;
  }
  detailY += 6;
  doc.roundedRect(detailsX, detailY, detailsWidth, 46, 6).fill(paid ? "#e7f6ef" : TINT);
  label(paid ? "Paid in full" : `Amount due (${currency})`, detailsX + 12, detailY + 9, { width: detailsWidth - 24 });
  doc.font("Helvetica-Bold").fontSize(17).fillColor(paid ? PAID : BRAND)
    .text(money(paid ? fromFils(totalFils) : balance), detailsX + 12, detailY + 21, { width: detailsWidth - 24, align: "right", lineBreak: false });
  const detailsBottom = detailY + 46;

  y = Math.max(billBottom, detailsBottom) + 20;

  // ── Subject (the invoice description), when it adds something to the lines
  const items: Array<Pick<InvoiceLineRow, "description" | "unit" | "quantity" | "unit_price" | "amount"> & { code: string | null }> =
    lineRows.length > 0
      ? lineRows.map((l) => ({ ...l, code: l.product_code ?? null }))
      : [{
          description: invoice.description?.trim() || "Services",
          code: null,
          unit: null,
          quantity: "1",
          unit_price: invoice.subtotal_amount,
          amount: invoice.subtotal_amount,
        }];
  const subject = invoice.description?.trim();
  if (subject && !(items.length === 1 && items[0]!.description === subject)) {
    label("Subject", M, y);
    doc.font("Helvetica").fontSize(9.5).fillColor(INK).text(subject, M, y + 12, { width: W });
    y = doc.y + 14;
  }

  // ── Line items
  const col = { no: 26, qty: 54, unit: 46, price: 84, amount: 94 };
  const itemWidth = W - col.no - col.qty - col.unit - col.price - col.amount;
  const x = {
    no: M,
    item: M + col.no,
    qty: M + col.no + itemWidth,
    unit: M + col.no + itemWidth + col.qty,
    price: M + col.no + itemWidth + col.qty + col.unit,
    amount: M + col.no + itemWidth + col.qty + col.unit + col.price,
  };
  const pad = 8;
  const headerHeight = 24;

  const drawTableHeader = (top: number) => {
    doc.rect(M, top, W, headerHeight).fill(INK);
    doc.font("Helvetica-Bold").fontSize(7.5).fillColor("#ffffff");
    const head = (text: string, left: number, width: number, align: "left" | "right" = "left") =>
      doc.text(text, left + pad, top + 9, { width: width - pad * 2, align, characterSpacing: 0.6, lineBreak: false });
    head("#", x.no, col.no);
    head("ITEM", x.item, itemWidth);
    head("QTY", x.qty, col.qty, "right");
    head("UNIT", x.unit, col.unit);
    head("UNIT PRICE", x.price, col.price, "right");
    head(`AMOUNT (${currency})`, x.amount, col.amount, "right");
    return top + headerHeight;
  };

  y = ensureSpace(y, headerHeight + 30);
  y = drawTableHeader(y);
  items.forEach((item, index) => {
    doc.font("Helvetica").fontSize(9.5);
    const textHeight = doc.heightOfString(item.description, { width: itemWidth - pad * 2 });
    const codeHeight = item.code ? 11 : 0;
    const rowHeight = Math.max(textHeight + codeHeight, 11) + 12;
    y = ensureSpace(y, rowHeight, drawTableHeader);

    if (index % 2 === 1) doc.rect(M, y, W, rowHeight).fill(ZEBRA);
    const top = y + 6;
    doc.font("Helvetica").fontSize(9).fillColor(MUTED).text(String(index + 1), x.no + pad, top, { width: col.no - pad, lineBreak: false });
    doc.font("Helvetica").fontSize(9.5).fillColor(INK).text(item.description, x.item + pad, top, { width: itemWidth - pad * 2 });
    if (item.code) {
      doc.font("Helvetica").fontSize(7.5).fillColor(MUTED).text(item.code, x.item + pad, top + textHeight + 1, { width: itemWidth - pad * 2, lineBreak: false });
    }
    doc.font("Helvetica").fontSize(9.5).fillColor(INK)
      .text(quantity(item.quantity), x.qty + pad, top, { width: col.qty - pad * 2, align: "right", lineBreak: false });
    doc.fillColor(MUTED).text(item.unit ?? "", x.unit + pad, top, { width: col.unit - pad * 2, lineBreak: false, ellipsis: true });
    doc.fillColor(INK).text(money(item.unit_price), x.price + pad, top, { width: col.price - pad * 2, align: "right", lineBreak: false });
    doc.font("Helvetica-Bold").text(money(item.amount), x.amount + pad, top, { width: col.amount - pad * 2, align: "right", lineBreak: false });
    y += rowHeight;
    doc.moveTo(M, y).lineTo(right, y).lineWidth(0.6).strokeColor(RULE).stroke();
  });
  y += 16;

  // ── Totals (right) beside amount in words and notes (left); kept together
  const totalsWidth = 240;
  const totalsX = right - totalsWidth;
  const leftWidth = W - totalsWidth - 32;
  const bank = lines(company.bankDetails);
  const words = amountInWords(fromFils(totalFils), currency);

  const totals: Array<[string, string, "row" | "total" | "balance"]> = [
    [`Subtotal (excl. VAT)`, money(invoice.subtotal_amount), "row"],
    [`VAT ${vatRate}%${vatRate === 0 ? " (zero-rated)" : ""}`, money(invoice.vat_amount), "row"],
    [`Total (${currency})`, money(invoice.total_amount), "total"],
  ];
  if (receivedFils > 0) {
    totals.push(["Amount received", `– ${money(invoice.amount_received)}`, "row"]);
    totals.push([`Balance due (${currency})`, money(balance), "balance"]);
  }
  const totalsHeight = totals.reduce((h, [, , kind]) => h + (kind === "row" ? 20 : 34), 0);

  doc.font("Helvetica-Oblique").fontSize(9.5);
  let leftHeight = 14 + doc.heightOfString(words, { width: leftWidth }) + 16;
  if (invoice.notes) {
    doc.font("Helvetica").fontSize(9);
    leftHeight += 14 + doc.heightOfString(invoice.notes, { width: leftWidth }) + 16;
  }

  y = ensureSpace(y, Math.max(totalsHeight, leftHeight));
  const blockTop = y;

  let ty = blockTop;
  for (const [name, value, kind] of totals) {
    if (kind === "row") {
      doc.font("Helvetica").fontSize(9.5).fillColor(MUTED).text(name, totalsX + 12, ty + 4, { width: 140, lineBreak: false });
      doc.fillColor(INK).text(value, totalsX + 140, ty + 4, { width: totalsWidth - 152, align: "right", lineBreak: false });
      ty += 20;
    } else {
      ty += 4;
      doc.roundedRect(totalsX, ty, totalsWidth, 28, 5).fill(kind === "total" ? TINT : INK);
      const color = kind === "total" ? BRAND : "#ffffff";
      doc.font("Helvetica-Bold").fontSize(11).fillColor(color).text(name, totalsX + 12, ty + 9, { width: 140, lineBreak: false });
      doc.text(value, totalsX + 140, ty + 9, { width: totalsWidth - 152, align: "right", lineBreak: false });
      ty += 30;
    }
  }

  let ly = blockTop;
  label("Amount in words", M, ly);
  doc.font("Helvetica-Oblique").fontSize(9.5).fillColor(INK).text(words, M, ly + 13, { width: leftWidth });
  ly = doc.y + 16;
  if (invoice.notes) {
    label("Notes", M, ly);
    doc.font("Helvetica").fontSize(9).fillColor(BODY).text(invoice.notes, M, ly + 13, { width: leftWidth });
    ly = doc.y + 16;
  }
  y = Math.max(ty, ly) + 14;

  // ── Payment details (left) and signature block (right), kept together
  const signWidth = 210;
  const bankWidth = W - signWidth - 32;
  doc.font("Helvetica").fontSize(9);
  const bankHeight = bank.length ? doc.heightOfString(bank.join("\n"), { width: bankWidth - 26 }) + 34 : 0;
  // Room for the bank box plus the thank-you line, or the signature block, whichever is taller.
  y = ensureSpace(y, Math.max(bankHeight + 28, 112));
  if (bank.length) {
    doc.roundedRect(M, y, bankWidth, bankHeight, 6).lineWidth(0.8).strokeColor(RULE).stroke();
    doc.rect(M, y + 8, 3, bankHeight - 16).fill(BRAND);
    label("Payment details", M + 14, y + 11);
    doc.font("Helvetica").fontSize(9).fillColor(INK).text(bank.join("\n"), M + 14, y + 24, { width: bankWidth - 26 });
  }
  const signX = right - signWidth;
  doc.font("Helvetica-Bold").fontSize(9).fillColor(INK)
    .text(`For ${company.name}`, signX, y, { width: signWidth, align: "center" });
  const imageTop = y + 16;
  const lineY = imageTop + 62;
  if (branding.stamp) {
    try {
      doc.save().opacity(0.9);
      doc.image(branding.stamp, signX + signWidth - 84, imageTop - 4, { fit: [74, 74], align: "center", valign: "center" });
      doc.restore();
    } catch {
      doc.restore();
    }
  }
  if (branding.signature) {
    try {
      doc.image(branding.signature, signX + 10, imageTop + 4, { fit: [signWidth - 70, 54], align: "center", valign: "bottom" });
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
  doc.font("Helvetica").fontSize(9).fillColor(MUTED)
    .text("Thank you for your business.", M, bank.length ? y + bankHeight + 12 : lineY + 20, { width: bankWidth });

  // ── Every page: watermark for documents that aren't live, and the footer
  const { start, count } = doc.bufferedPageRange();
  for (let i = start; i < start + count; i++) {
    doc.switchToPage(i);
    const bottomMargin = doc.page.margins.bottom;
    doc.page.margins.bottom = 0; // writing inside the footer area must not add a page

    if (invoice.status === "draft" || invoice.status === "cancelled") {
      doc.save()
        .rotate(-30, { origin: [pageWidth / 2, doc.page.height / 2] })
        .font("Helvetica-Bold").fontSize(90).fillColor("#e00000").opacity(0.08)
        .text(invoice.status.toUpperCase(), 0, doc.page.height / 2 - 45, { width: pageWidth, align: "center", lineBreak: false })
        .restore();
    }

    const footerY = doc.page.height - M - 12;
    doc.moveTo(M, footerY - 10).lineTo(right, footerY - 10).lineWidth(0.6).strokeColor(RULE).stroke();
    const seller = [company.name, company.trn ? `TRN ${company.trn}` : null].filter(Boolean).join(" · ");
    doc.font("Helvetica").fontSize(7.5).fillColor(MUTED)
      .text(`${seller} · Computer-generated invoice, amounts in ${currency}`, M, footerY, { width: W * 0.72, lineBreak: false, ellipsis: true })
      .text(`${invoice.invoice_no} · Page ${i - start + 1} of ${count}`, M + W * 0.72, footerY, { width: W * 0.28, align: "right", lineBreak: false });
    doc.page.margins.bottom = bottomMargin;
  }

  return doc;
}
