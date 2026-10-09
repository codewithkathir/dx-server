export type DueDocumentType = "bill" | "invoice";

export interface CashFlowMonth {
  /** YYYY-MM */
  month: string;
  moneyIn: number;
  moneyOut: number;
}

export interface PendingClaim {
  id: number;
  employeeId: number;
  employeeName: string;
  categoryName: string | null;
  description: string | null;
  date: string;
  amount: number;
}

export interface DueDocument {
  type: DueDocumentType;
  id: number;
  number: string;
  partyName: string | null;
  dueDate: string;
  status: string;
  isOverdue: boolean;
  balance: number;
}

export interface DashboardOverview {
  /** Month the "this month" figures cover, YYYY-MM. */
  month: string;
  received: { amount: number; count: number; previousAmount: number } | null;
  paid: { amount: number; count: number; previousAmount: number } | null;
  owedToUs: { amount: number; count: number } | null;
  overdueBills: { amount: number; count: number } | null;
  cashFlow: CashFlowMonth[];
  pendingApprovals: { count: number; amount: number; items: PendingClaim[] } | null;
  dueSoon: DueDocument[];
}

export interface DashboardAlerts {
  pendingClaims: number;
  overdueBills: number;
  overdueInvoices: number;
}

export type SearchResultType = "employee" | "expense" | "bill" | "invoice" | "supplier" | "customer";

export interface SearchResult {
  type: SearchResultType;
  id: number;
  title: string;
  subtitle: string | null;
}
