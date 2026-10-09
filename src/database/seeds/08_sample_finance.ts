import type { Knex } from "knex";
import {
  DocumentSequences,
  nextDocumentNumber,
} from "../../shared/utils/document-number.util";
import {
  addDaysIso,
  calculateTotals,
  deriveSettlementStatus,
  filsToDecimalString,
  todayIso,
  type SettlementStatus,
} from "../../shared/utils/money.util";

/**
 * Sample suppliers, customers, bills (with payments) and invoices (with
 * receipts) for local development. Deterministic and idempotent: skipped
 * entirely once the sample suppliers exist. Totals, amounts paid and statuses
 * are computed with the same helpers the app uses, so every invariant holds.
 */

const SUPPLIERS = [
  { company_name: "Al Futtaim Office Supplies", contact_name_1: "Rana Haddad", email: "orders@af-office.ae", phone_1: "+97142201100", city_state: "Dubai" },
  { company_name: "Emirates Fleet Services", contact_name_1: "Omar Saeed", email: "billing@emiratesfleet.ae", phone_1: "+97125508800", city_state: "Abu Dhabi" },
  { company_name: "Gulf Telecom Solutions", contact_name_1: "Priya Nair", email: "accounts@gulftelecom.ae", phone_1: "+97143309900", city_state: "Dubai" },
  { company_name: "Desert Print & Courier", contact_name_1: "Ahmed Kareem", email: "hello@desertprint.ae", phone_1: "+97165521234", city_state: "Sharjah" },
  { company_name: "Blue Coast Facility Management", contact_name_1: "Liam Carter", email: "finance@bluecoastfm.ae", phone_1: "+97144405566", city_state: "Dubai" },
  { company_name: "Falcon IT Hardware", contact_name_1: "Sara Al Mansoori", email: "sales@falconit.ae", phone_1: "+97142217788", city_state: "Dubai" },
];

const CUSTOMERS = [
  { company_name: "Al Noor Trading LLC", trn: "100234567800003", payment_terms: "Net 30", credit_limit: "75000.00", city_state: "Dubai", company_address: "Office 1402, Al Moosa Tower 2\nSheikh Zayed Road" },
  { company_name: "Gulf Star Logistics", trn: "100345678900003", payment_terms: "Net 45", credit_limit: "120000.00", city_state: "Dubai", company_address: "Warehouse 7, Jebel Ali Free Zone" },
  { company_name: "Emirates Fresh Foods", trn: "100456789000003", payment_terms: "Net 30", credit_limit: "50000.00", city_state: "Sharjah", company_address: "Plot 22, Industrial Area 6" },
  { company_name: "Desert Rose Interiors", trn: null, payment_terms: "Due on receipt", credit_limit: null, city_state: "Abu Dhabi", company_address: "Villa 9, Al Bateen" },
  { company_name: "Blue Wave Marine", trn: "100567890100003", payment_terms: "Net 60", credit_limit: "200000.00", city_state: "Ras Al Khaimah", company_address: "Al Hamra Marina, Building B" },
  { company_name: "Falcon Tech FZ-LLC", trn: "100678901200003", payment_terms: "Net 30", credit_limit: "90000.00", city_state: "Dubai", company_address: "Unit 305, Dubai Internet City" },
];

const BILL_LINES = [
  "Printer paper and toner", "Fleet servicing – monthly", "Business internet & PBX", "Courier and printing",
  "Office cleaning – monthly", "Laptops and accessories", "Air-conditioning maintenance", "Mobile plans – corporate",
];
const INVOICE_LINES = [
  "Consulting services", "Freight forwarding services", "Fit-out project – stage payment", "Monthly retainer",
  "Logistics support – container clearance", "Software implementation", "Marine equipment supply", "Training workshop",
];

/** mulberry32: small deterministic PRNG. */
function createRandom(seed: number): () => number {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

interface Plan {
  docDate: string;
  dueDate: string;
  subtotal: number; // fils
  vatRate: 0 | 5;
  /** Fractions of the total settled by successive payments (summing to ≤ 1). */
  settlements: number[];
  cancelled: boolean;
  draft: boolean;
}

/** A realistic mix: older documents mostly settled, recent ones mostly open. */
function planDocuments(count: number, seed: number, dueDays: number[]): Plan[] {
  const random = createRandom(seed);
  const today = todayIso();
  const plans: Plan[] = [];
  for (let i = 0; i < count; i++) {
    const ageDays = Math.floor(random() * 200);
    const docDate = addDaysIso(today, -ageDays);
    const due = dueDays[Math.floor(random() * dueDays.length)] as number;
    const roll = random();
    let settlements: number[] = [];
    let cancelled = false;
    let draft = false;
    if (ageDays > 60) {
      settlements = roll < 0.75 ? [1] : roll < 0.85 ? [0.4, 0.6] : roll < 0.93 ? [0.5] : [];
      cancelled = roll >= 0.97;
    } else if (ageDays > 15) {
      settlements = roll < 0.35 ? [1] : roll < 0.6 ? [0.3] : [];
    } else {
      draft = roll < 0.25;
      settlements = !draft && roll > 0.85 ? [1] : [];
    }
    if (cancelled || draft) settlements = [];
    plans.push({
      docDate,
      dueDate: addDaysIso(docDate, due),
      subtotal: Math.round((800 + random() * 24000) * 4) * 25, // multiples of 0.25 AED
      vatRate: random() < 0.85 ? 5 : 0,
      settlements,
      cancelled,
      draft,
    });
  }
  return plans;
}

/** Split a total into payment amounts (fils) from fractions; the last one takes the remainder. */
function splitAmounts(total: number, fractions: number[]): number[] {
  const sum = fractions.reduce((a, b) => a + b, 0);
  const amounts = fractions.map((f) => Math.floor(total * f));
  if (amounts.length > 0 && Math.abs(sum - 1) < 1e-9) {
    amounts[amounts.length - 1] = total - amounts.slice(0, -1).reduce((a, b) => a + b, 0);
  }
  return amounts.filter((a) => a > 0);
}

export async function seed(knex: Knex): Promise<void> {
  const existing = await knex("suppliers").where({ company_name: SUPPLIERS[0]!.company_name }).first("id");
  if (existing) return;

  const methods = (await knex("payment_methods")
    .where({ status: "active" })
    .whereNull("deleted_at")
    .orderBy("sort_order")
    .pluck("id")) as number[];
  const categoryId = ((await knex("categories").whereNull("deleted_at").orderBy("id").first("id")) as { id: number } | undefined)?.id ?? null;
  if (methods.length === 0) return;
  const today = todayIso();

  await knex.transaction(async (trx) => {
    const supplierIds: number[] = [];
    for (const s of SUPPLIERS) {
      const [id] = await trx("suppliers").insert({ ...s, country: "UAE", status: "active", created_at: trx.fn.now(), updated_at: trx.fn.now() });
      supplierIds.push(id as number);
    }
    const customerIds: number[] = [];
    for (const c of CUSTOMERS) {
      const [id] = await trx("customers").insert({ ...c, country: "UAE", status: "active", created_at: trx.fn.now(), updated_at: trx.fn.now() });
      customerIds.push(id as number);
    }

    // Bills: settled by payments.
    const billPlans = planDocuments(30, 20261009, [14, 30, 30, 45]);
    for (const [i, plan] of billPlans.entries()) {
      const totals = calculateTotals(plan.subtotal, plan.vatRate);
      const amounts = splitAmounts(totals.total, plan.settlements);
      const paid = amounts.reduce((a, b) => a + b, 0);
      const initial: SettlementStatus = plan.cancelled ? "cancelled" : plan.draft ? "draft" : "open";
      const [billId] = await trx("payable_bills").insert({
        bill_no: `SUP-${String(1000 + i)}`,
        payee_type: "supplier",
        supplier_id: supplierIds[i % supplierIds.length],
        bill_date: plan.docDate,
        due_date: plan.dueDate,
        subtotal_amount: filsToDecimalString(totals.subtotal),
        vat_rate: plan.vatRate,
        vat_amount: filsToDecimalString(totals.vat),
        total_amount: filsToDecimalString(totals.total),
        amount_paid: filsToDecimalString(paid),
        category_id: categoryId,
        description: BILL_LINES[i % BILL_LINES.length],
        source: "manual",
        status: deriveSettlementStatus(initial, totals.total, paid, "open"),
        created_at: trx.fn.now(),
        updated_at: trx.fn.now(),
      });
      for (const [n, amount] of amounts.entries()) {
        const date = addDaysIso(plan.docDate, 10 + n * 15);
        await trx("payable_payments").insert({
          bill_id: billId,
          payment_date: date > today ? today : date,
          amount: filsToDecimalString(amount),
          payment_method_id: methods[(i + n) % methods.length],
          reference: `TT-${String(70000 + i * 10 + n)}`,
          created_at: trx.fn.now(),
          updated_at: trx.fn.now(),
        });
      }
    }

    // Invoices: numbered from the shared sequence, settled by receipts.
    const invoicePlans = planDocuments(30, 9102026, [30, 30, 45, 60]).sort((a, b) =>
      a.docDate.localeCompare(b.docDate)
    );
    for (const [i, plan] of invoicePlans.entries()) {
      const customer = CUSTOMERS[i % CUSTOMERS.length]!;
      const totals = calculateTotals(plan.subtotal, plan.vatRate);
      const amounts = splitAmounts(totals.total, plan.settlements);
      const received = amounts.reduce((a, b) => a + b, 0);
      const initial: SettlementStatus = plan.cancelled ? "cancelled" : plan.draft ? "draft" : "sent";
      const invoiceNo = await nextDocumentNumber(trx, DocumentSequences.RECEIVABLE_INVOICE, Number(plan.docDate.slice(0, 4)));
      const [invoiceId] = await trx("receivable_invoices").insert({
        invoice_no: invoiceNo,
        customer_id: customerIds[i % customerIds.length],
        customer_trn: customer.trn,
        invoice_date: plan.docDate,
        due_date: plan.dueDate,
        subtotal_amount: filsToDecimalString(totals.subtotal),
        vat_rate: plan.vatRate,
        vat_amount: filsToDecimalString(totals.vat),
        total_amount: filsToDecimalString(totals.total),
        amount_received: filsToDecimalString(received),
        description: INVOICE_LINES[i % INVOICE_LINES.length],
        po_reference: i % 3 === 0 ? `PO-${4400 + i}` : null,
        status: deriveSettlementStatus(initial, totals.total, received, "sent"),
        created_at: trx.fn.now(),
        updated_at: trx.fn.now(),
      });
      for (const [n, amount] of amounts.entries()) {
        const date = addDaysIso(plan.docDate, 20 + n * 20);
        await trx("receivable_receipts").insert({
          invoice_id: invoiceId,
          receipt_date: date > today ? today : date,
          amount: filsToDecimalString(amount),
          payment_method_id: methods[(i + n) % methods.length],
          reference: `RCPT-${String(50000 + i * 10 + n)}`,
          created_at: trx.fn.now(),
          updated_at: trx.fn.now(),
        });
      }
    }
  });
}
