import type { InvoiceStatus } from "../../shared/constants/finance";
import type { ListQueryOptions } from "../../shared/utils/query-builder";

export interface InvoiceRow {
  id: number;
  invoice_no: string;
  customer_id: number;
  invoice_date: string;
  due_date: string;
  subtotal_amount: string;
  vat_rate: string;
  vat_amount: string;
  total_amount: string;
  amount_received: string;
  currency: string;
  description: string | null;
  po_reference: string | null;
  customer_trn: string | null;
  support_file: string | null;
  notes: string | null;
  status: InvoiceStatus;
  created_at: Date;
  updated_at: Date;
  deleted_at: Date | null;
  created_by: number | null;
  updated_by: number | null;
}

/** InvoiceRow plus joined customer fields (used by lists, detail and the PDF). */
export interface InvoiceListRow extends InvoiceRow {
  customer_name: string;
  customer_address: string | null;
  customer_city_state: string | null;
  customer_country: string | null;
  customer_email: string | null;
}

export interface ReceiptRow {
  id: number;
  invoice_id: number;
  receipt_date: string;
  amount: string;
  payment_method_id: number;
  payment_method_name?: string | null;
  reference: string | null;
  notes: string | null;
  created_at: Date;
}

export interface InvoicePublic {
  id: number;
  invoiceNo: string;
  customerId: number;
  customerName: string;
  customerTrn: string | null;
  invoiceDate: string;
  dueDate: string;
  subtotalAmount: number;
  vatRate: number;
  vatAmount: number;
  totalAmount: number;
  amountReceived: number;
  balance: number;
  currency: string;
  description: string | null;
  poReference: string | null;
  notes: string | null;
  status: InvoiceStatus;
  isOverdue: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ReceiptPublic {
  id: number;
  invoiceId: number;
  receiptDate: string;
  amount: number;
  paymentMethodId: number;
  paymentMethodName: string | null;
  reference: string | null;
  notes: string | null;
  createdAt: Date;
}

export interface InvoiceDetail extends InvoicePublic {
  receipts: ReceiptPublic[];
}

export interface ReceivablesSummary {
  outstandingAmount: number;
  outstandingCount: number;
  overdueAmount: number;
  overdueCount: number;
  receivedThisMonth: number;
  draftCount: number;
}

export interface InvoiceListQuery extends ListQueryOptions {
  customerId?: number;
  dateFrom?: string;
  dateTo?: string;
  dueFrom?: string;
  dueTo?: string;
}
