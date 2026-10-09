import { Permissions } from "../../shared/constants/permissions";
import { Roles } from "../../shared/constants/roles";
import type { AuthUser } from "../../shared/types/express";
import { addDaysIso, fromFils, isOverdue, todayIso, toFils } from "../../shared/utils/money.util";
import { dashboardRepository } from "./dashboard.repository";
import type {
  CashFlowMonth,
  DashboardAlerts,
  DashboardOverview,
  SearchResult,
} from "./dashboard.types";

const CASH_FLOW_MONTHS = 6;
const DUE_SOON_DAYS = 14;
const DUE_SOON_LIMIT = 8;
const PENDING_PREVIEW = 5;
const SEARCH_LIMIT = 5;

/** SUPER_ADMIN has every permission (same rule as requirePermission). */
const can = (user: AuthUser, permission: string) =>
  user.role === Roles.SUPER_ADMIN || user.permissions.includes(permission);

/** First day of the month `offset` months from `date` (YYYY-MM-DD). */
function monthStart(date: string, offset = 0): string {
  const [year, month] = date.split("-").map(Number) as [number, number];
  const d = new Date(Date.UTC(year, month - 1 + offset, 1));
  return d.toISOString().slice(0, 10);
}

class DashboardService {
  async getOverview(user: AuthUser): Promise<DashboardOverview> {
    const today = todayIso();
    const thisMonth = monthStart(today);
    const nextMonth = monthStart(today, 1);
    const lastMonth = monthStart(today, -1);
    const cashFlowFrom = monthStart(today, -(CASH_FLOW_MONTHS - 1));

    const canReceivables = can(user, Permissions.RECEIVABLE_READ);
    const canPayables = can(user, Permissions.PAYABLE_READ);
    const canExpenses = can(user, Permissions.EMPLOYEE_EXPENSE_READ);

    const [received, receivedPrev, paid, paidPrev, owed, overdue, moneyIn, moneyOut, pendingTotals, pendingItems, due] =
      await Promise.all([
        canReceivables ? dashboardRepository.settledBetween("receipts", thisMonth, nextMonth) : null,
        canReceivables ? dashboardRepository.settledBetween("receipts", lastMonth, thisMonth) : null,
        canPayables ? dashboardRepository.settledBetween("payments", thisMonth, nextMonth) : null,
        canPayables ? dashboardRepository.settledBetween("payments", lastMonth, thisMonth) : null,
        canReceivables ? dashboardRepository.receivablesOutstanding() : null,
        canPayables ? dashboardRepository.overdueBills(today) : null,
        canReceivables ? dashboardRepository.monthlySettled("receipts", cashFlowFrom) : new Map<string, number>(),
        canPayables ? dashboardRepository.monthlySettled("payments", cashFlowFrom) : new Map<string, number>(),
        canExpenses ? dashboardRepository.pendingClaimsTotals() : null,
        canExpenses ? dashboardRepository.pendingClaims(PENDING_PREVIEW) : [],
        dashboardRepository.dueSoon(addDaysIso(today, DUE_SOON_DAYS), DUE_SOON_LIMIT, {
          bills: canPayables,
          invoices: canReceivables,
        }),
      ]);

    const cashFlow: CashFlowMonth[] = [];
    for (let i = CASH_FLOW_MONTHS - 1; i >= 0; i--) {
      const month = monthStart(today, -i).slice(0, 7);
      cashFlow.push({
        month,
        moneyIn: fromFils(moneyIn.get(month) ?? 0),
        moneyOut: fromFils(moneyOut.get(month) ?? 0),
      });
    }

    return {
      month: thisMonth.slice(0, 7),
      received: received && receivedPrev
        ? { amount: fromFils(received.amount), count: received.count, previousAmount: fromFils(receivedPrev.amount) }
        : null,
      paid: paid && paidPrev
        ? { amount: fromFils(paid.amount), count: paid.count, previousAmount: fromFils(paidPrev.amount) }
        : null,
      owedToUs: owed ? { amount: fromFils(owed.amount), count: owed.count } : null,
      overdueBills: overdue ? { amount: fromFils(overdue.amount), count: overdue.count } : null,
      cashFlow: canReceivables || canPayables ? cashFlow : [],
      pendingApprovals: pendingTotals
        ? {
            count: pendingTotals.count,
            amount: fromFils(pendingTotals.amount),
            items: pendingItems.map((row) => ({
              id: row.id,
              employeeId: row.employee_id,
              employeeName: row.employee_name,
              categoryName: row.category_name,
              description: row.description,
              date: row.date,
              amount: fromFils(toFils(String(row.amount))),
            })),
          }
        : null,
      dueSoon: due.map((row) => {
        const balance = toFils(String(row.balance));
        return {
          type: row.type,
          id: row.id,
          number: row.number,
          partyName: row.party_name,
          dueDate: row.due_date,
          status: row.status,
          isOverdue: isOverdue(row.status as never, row.due_date, balance, today),
          balance: fromFils(balance),
        };
      }),
    };
  }

  async getAlerts(user: AuthUser): Promise<DashboardAlerts> {
    const today = todayIso();
    const [pending, overdueBills, overdueInvoices] = await Promise.all([
      can(user, Permissions.EMPLOYEE_EXPENSE_READ) ? dashboardRepository.pendingClaimsTotals() : null,
      can(user, Permissions.PAYABLE_READ) ? dashboardRepository.overdueBills(today) : null,
      can(user, Permissions.RECEIVABLE_READ) ? dashboardRepository.countOverdueInvoices(today) : 0,
    ]);
    return {
      pendingClaims: pending?.count ?? 0,
      overdueBills: overdueBills?.count ?? 0,
      overdueInvoices,
    };
  }

  /** Top matches per area, limited to areas the admin may read. */
  async search(user: AuthUser, term: string): Promise<SearchResult[]> {
    const found = await dashboardRepository.search(term, SEARCH_LIMIT);
    const money = (value: unknown) => `AED ${fromFils(toFils(String(value))).toFixed(2)}`;
    const results: SearchResult[] = [];

    if (can(user, Permissions.EMPLOYEE_READ)) {
      for (const e of found.employees) {
        results.push({ type: "employee", id: e.id, title: e.emp_name, subtitle: [e.employee_code, e.email].filter(Boolean).join(" · ") });
      }
    }
    if (can(user, Permissions.EMPLOYEE_EXPENSE_READ)) {
      for (const x of found.expenses) {
        results.push({ type: "expense", id: x.id, title: x.description ?? `Expense #${x.id}`, subtitle: `${x.emp_name} · ${money(x.amount)}` });
      }
    }
    if (can(user, Permissions.PAYABLE_READ)) {
      for (const b of found.bills) {
        results.push({ type: "bill", id: b.id, title: b.bill_no, subtitle: `${b.party_name ?? ""} · ${money(b.total_amount)}` });
      }
    }
    if (can(user, Permissions.RECEIVABLE_READ)) {
      for (const i of found.invoices) {
        results.push({ type: "invoice", id: i.id, title: i.invoice_no, subtitle: `${i.company_name} · ${money(i.total_amount)}` });
      }
    }
    if (can(user, Permissions.SUPPLIER_READ)) {
      for (const s of found.suppliers) {
        results.push({ type: "supplier", id: s.id, title: s.company_name, subtitle: s.email });
      }
    }
    if (can(user, Permissions.CUSTOMER_READ)) {
      for (const c of found.customers) {
        results.push({ type: "customer", id: c.id, title: c.company_name, subtitle: c.trn ? `TRN ${c.trn}` : null });
      }
    }
    return results;
  }
}

export const dashboardService = new DashboardService();
