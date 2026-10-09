import type {
  BillSource,
  BillStatus,
  PayeeType,
} from "../../shared/constants/finance";
import type { ListQueryOptions } from "../../shared/utils/query-builder";

export interface BillRow {
  id: number;
  bill_no: string;
  payee_type: PayeeType;
  supplier_id: number | null;
  employee_id: number | null;
  bill_date: string;
  due_date: string;
  subtotal_amount: string;
  vat_rate: string;
  vat_amount: string;
  total_amount: string;
  amount_paid: string;
  currency: string;
  category_id: number | null;
  description: string | null;
  expense_id: number | null;
  source: BillSource;
  support_file: string | null;
  notes: string | null;
  status: BillStatus;
  created_at: Date;
  updated_at: Date;
  deleted_at: Date | null;
  created_by: number | null;
  updated_by: number | null;
}

/** BillRow plus joined display fields from list/detail queries. */
export interface BillListRow extends BillRow {
  supplier_name: string | null;
  employee_name: string | null;
  employee_code: string | null;
  category_name: string | null;
  /** Receipt of the linked expense claim (reimbursement bills). */
  expense_support_file: string | null;
}

export interface PaymentRow {
  id: number;
  bill_id: number;
  payment_date: string;
  amount: string;
  payment_method_id: number;
  payment_method_name?: string | null;
  reference: string | null;
  notes: string | null;
  created_at: Date;
  created_by: number | null;
}

export interface BillPublic {
  id: number;
  billNo: string;
  payeeType: PayeeType;
  supplierId: number | null;
  employeeId: number | null;
  payeeName: string | null;
  employeeCode: string | null;
  billDate: string;
  dueDate: string;
  subtotalAmount: number;
  vatRate: number;
  vatAmount: number;
  totalAmount: number;
  amountPaid: number;
  balance: number;
  currency: string;
  categoryId: number | null;
  categoryName: string | null;
  description: string | null;
  expenseId: number | null;
  source: BillSource;
  notes: string | null;
  attachment: BillAttachment | null;
  status: BillStatus;
  isOverdue: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface BillAttachment {
  fileName: string;
  contentType: string;
  isImage: boolean;
  /** "bill" = uploaded on the bill; "expense" = the linked claim's receipt (read-only). */
  source: "bill" | "expense";
}

export interface BillAttachmentFile {
  absolutePath: string;
  contentType: string;
  filename: string;
}

export interface PaymentPublic {
  id: number;
  billId: number;
  paymentDate: string;
  amount: number;
  paymentMethodId: number;
  paymentMethodName: string | null;
  reference: string | null;
  notes: string | null;
  createdAt: Date;
}

export interface BillDetail extends BillPublic {
  payments: PaymentPublic[];
}

export interface ExpenseReimbursement {
  billId: number;
  billNo: string;
  status: BillStatus;
  totalAmount: number;
  amountPaid: number;
  /** Date of the latest payment, once anything has been paid. */
  lastPaymentDate: string | null;
}

export interface PayablesSummary {
  outstandingAmount: number;
  outstandingCount: number;
  overdueAmount: number;
  overdueCount: number;
  paidThisMonth: number;
  draftCount: number;
}

export interface BillListQuery extends ListQueryOptions {
  payeeType?: PayeeType;
  supplierId?: number;
  employeeId?: number;
  dateFrom?: string;
  dateTo?: string;
  dueFrom?: string;
  dueTo?: string;
}
