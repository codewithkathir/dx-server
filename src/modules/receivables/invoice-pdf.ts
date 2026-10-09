import PDFDocument from "pdfkit";
import { fromFils, toFils } from "../../shared/utils/money.util";
import type { InvoiceListRow } from "./receivable.types";

export interface CompanyDetails {
  name: string;
  address?: string;
  trn?: string;
  bankDetails?: string;
}

const PAGE_MARGIN = 50;
const MUTED = "#555555";
const RULE = "#cccccc";

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

/**
 * Renders an invoice as an A4 PDF. Titled "Tax Invoice" when the company has a
 * TRN (UAE FTA: only VAT-registered businesses issue tax invoices).
 * The caller pipes the returned document and calls `end()`.
 */
export function renderInvoicePdf(invoice: InvoiceListRow, company: CompanyDetails): PDFKit.PDFDocument {
  const doc = new PDFDocument({
    size: "A4",
    margin: PAGE_MARGIN,
    info: { Title: `Invoice ${invoice.invoice_no}`, Author: company.name },
  });
  const width = doc.page.width - PAGE_MARGIN * 2;
  const right = PAGE_MARGIN + width;
  const title = company.trn ? "TAX INVOICE" : "INVOICE";

  // Seller (left) and document title (right)
  doc.font("Helvetica-Bold").fontSize(16).text(company.name, PAGE_MARGIN, PAGE_MARGIN, { width: width / 2 });
  doc.font("Helvetica").fontSize(9).fillColor(MUTED);
  for (const line of lines(company.address)) doc.text(line, { width: width / 2 });
  if (company.trn) doc.text(`TRN: ${company.trn}`, { width: width / 2 });
  const sellerBottom = doc.y;

  doc.fillColor("black").font("Helvetica-Bold").fontSize(18)
    .text(title, PAGE_MARGIN + width / 2, PAGE_MARGIN, { width: width / 2, align: "right" });
  doc.font("Helvetica").fontSize(9);
  const meta: Array<[string, string]> = [
    ["Invoice no.", invoice.invoice_no],
    ["Invoice date", displayDate(invoice.invoice_date)],
    ["Due date", displayDate(invoice.due_date)],
  ];
  if (invoice.po_reference) meta.push(["PO reference", invoice.po_reference]);
  for (const [label, value] of meta) {
    doc.text(`${label}: ${value}`, PAGE_MARGIN + width / 2, doc.y, { width: width / 2, align: "right" });
  }

  // Buyer
  let y = Math.max(sellerBottom, doc.y) + 25;
  doc.font("Helvetica-Bold").fontSize(9).fillColor(MUTED).text("BILL TO", PAGE_MARGIN, y);
  doc.fillColor("black").font("Helvetica-Bold").fontSize(11).text(invoice.customer_name);
  doc.font("Helvetica").fontSize(9);
  for (const line of lines(invoice.customer_address)) doc.text(line);
  const place = [invoice.customer_city_state, invoice.customer_country].filter(Boolean).join(", ");
  if (place) doc.text(place);
  if (invoice.customer_trn) doc.text(`TRN: ${invoice.customer_trn}`);

  // Line item table
  y = doc.y + 25;
  const amountCol = 110;
  doc.rect(PAGE_MARGIN, y, width, 22).fill("#f2f2f2");
  doc.fillColor("black").font("Helvetica-Bold").fontSize(9)
    .text("Description", PAGE_MARGIN + 8, y + 7, { width: width - amountCol - 16 })
    .text(`Amount (${invoice.currency})`, right - amountCol, y + 7, { width: amountCol - 8, align: "right" });
  y += 30;
  doc.font("Helvetica").fontSize(10);
  const descriptionHeight = doc.heightOfString(invoice.description ?? "—", { width: width - amountCol - 16 });
  doc.text(invoice.description ?? "—", PAGE_MARGIN + 8, y, { width: width - amountCol - 16 })
    .text(money(invoice.subtotal_amount), right - amountCol, y, { width: amountCol - 8, align: "right" });
  y += descriptionHeight + 12;
  doc.moveTo(PAGE_MARGIN, y).lineTo(right, y).strokeColor(RULE).stroke();

  // Totals
  const vatRate = Number(invoice.vat_rate);
  const balanceFils = toFils(invoice.total_amount) - toFils(invoice.amount_received);
  const totals: Array<[string, string, boolean]> = [
    ["Subtotal (excl. VAT)", money(invoice.subtotal_amount), false],
    [`VAT ${vatRate}%${vatRate === 0 ? " (zero-rated)" : ""}`, money(invoice.vat_amount), false],
    [`Total (${invoice.currency})`, money(invoice.total_amount), true],
  ];
  if (toFils(invoice.amount_received) > 0) {
    totals.push(["Amount received", money(invoice.amount_received), false]);
    totals.push([`Balance due (${invoice.currency})`, money(fromFils(balanceFils)), true]);
  }
  y += 12;
  const labelX = right - 260;
  for (const [label, value, bold] of totals) {
    doc.font(bold ? "Helvetica-Bold" : "Helvetica").fontSize(bold ? 11 : 10)
      .text(label, labelX, y, { width: 150 })
      .text(value, right - amountCol, y, { width: amountCol - 8, align: "right" });
    y += bold ? 20 : 16;
  }

  // Payment details and notes
  y += 20;
  const bank = lines(company.bankDetails);
  if (bank.length > 0) {
    doc.font("Helvetica-Bold").fontSize(9).fillColor(MUTED).text("PAYMENT DETAILS", PAGE_MARGIN, y);
    doc.font("Helvetica").fillColor("black");
    for (const line of bank) doc.text(line);
    y = doc.y + 12;
  }
  if (invoice.notes) {
    doc.font("Helvetica-Bold").fontSize(9).fillColor(MUTED).text("NOTES", PAGE_MARGIN, y);
    doc.font("Helvetica").fillColor("black").text(invoice.notes, { width });
  }

  // Watermark for documents that aren't live tax invoices
  if (invoice.status === "draft" || invoice.status === "cancelled") {
    doc.save()
      .rotate(-30, { origin: [doc.page.width / 2, doc.page.height / 2] })
      .font("Helvetica-Bold").fontSize(80).fillColor("#e00000").opacity(0.12)
      .text(invoice.status.toUpperCase(), 0, doc.page.height / 2 - 40, { width: doc.page.width, align: "center" })
      .restore();
  }

  doc.font("Helvetica").fontSize(8).fillColor(MUTED)
    .text(`All amounts in ${invoice.currency}.`, PAGE_MARGIN, doc.page.height - PAGE_MARGIN - 10, { width, align: "center" });

  return doc;
}
