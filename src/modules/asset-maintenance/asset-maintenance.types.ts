import type { AssetCategory } from "../../shared/constants/asset";
import type { OdometerSource, ServiceTypeStatus } from "../../shared/constants/asset-maintenance";
import type { AdminExpenseStatus, EmployeeExpenseStatus, ExpenseStage } from "../../shared/constants/expense";
import type { BaseEntity } from "../../shared/types/common.types";

export interface ServiceTypeRow extends BaseEntity {
  code: string;
  name: string;
  category: AssetCategory | null;
  interval_days: number | null;
  interval_km: number | null;
  sort_order: number;
  status: ServiceTypeStatus;
}

export interface ServiceTypePublic {
  id: number;
  code: string;
  name: string;
  category: AssetCategory | null;
  intervalDays: number | null;
  intervalKm: number | null;
  sortOrder: number;
  status: ServiceTypeStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface ServiceRecordRow extends BaseEntity {
  asset_id: number;
  service_type_id: number;
  employee_id: number | null;
  start_date: string;
  end_date: string | null;
  odometer_km: number | null;
  next_due_km: number | null;
  cost: string | null;
  reference_no: string | null;
  notes: string | null;
  /** Set when an approved expense claim created this record. */
  expense_id: number | null;
}

/** A service record joined with its type, employee and the admin who entered it. */
export interface ServiceRecordListRow extends ServiceRecordRow {
  service_type_code: string;
  service_type_name: string;
  employee_name: string | null;
  employee_code: string | null;
  created_by_name: string | null;
}

export interface ServiceRecordPublic {
  id: number;
  assetId: number;
  serviceTypeId: number;
  serviceTypeCode: string;
  serviceTypeName: string;
  employeeId: number | null;
  employeeName: string | null;
  employeeCode: string | null;
  startDate: string;
  endDate: string | null;
  odometerKm: number | null;
  nextDueKm: number | null;
  cost: number | null;
  referenceNo: string | null;
  notes: string | null;
  /** The expense claim this record came from, if any. */
  expenseId: number | null;
  createdByName: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface OdometerReadingRow {
  id: number;
  asset_id: number;
  reading_km: number;
  reading_date: string;
  source: OdometerSource;
  service_record_id: number | null;
  assignment_id: number | null;
  expense_id: number | null;
  employee_id: number | null;
  notes: string | null;
  created_by: number | null;
  created_at: Date;
}

export interface OdometerReadingListRow extends OdometerReadingRow {
  employee_name: string | null;
  created_by_name: string | null;
}

export interface OdometerReadingPublic {
  id: number;
  assetId: number;
  readingKm: number;
  readingDate: string;
  source: OdometerSource;
  serviceRecordId: number | null;
  assignmentId: number | null;
  expenseId: number | null;
  employeeId: number | null;
  employeeName: string | null;
  notes: string | null;
  createdByName: string | null;
  createdAt: Date;
}

export interface LatestOdometer {
  readingKm: number;
  readingDate: string;
}

/** What a new reading has to be recorded with; the service checks it against its neighbours. */
export interface NewOdometerReading {
  assetId: number;
  readingKm: number;
  readingDate: string;
  source: OdometerSource;
  serviceRecordId?: number | null;
  assignmentId?: number | null;
  employeeId?: number | null;
  notes?: string | null;
  createdBy?: number | null;
  /** Set for readings that came from an approved expense claim. */
  expenseId?: number | null;
  /** Admin override for a replaced or reset odometer. */
  allowDecrease?: boolean;
}

/** An expense claim made for a vehicle, with its category path and linked service record. */
export interface VehicleExpenseRow {
  id: number;
  date: string;
  amount: string;
  description: string | null;
  odometer_km: number | null;
  employee_status: EmployeeExpenseStatus;
  admin_status: AdminExpenseStatus;
  support_file: string | null;
  employee_id: number;
  employee_name: string | null;
  category_name: string;
  sub_category_name: string;
  sub_sub_category_name: string | null;
  service_record_id: number | null;
  service_type_name: string | null;
}

export interface VehicleExpensePublic {
  id: number;
  date: string;
  amount: number;
  description: string | null;
  odometerKm: number | null;
  stage: ExpenseStage;
  hasReceipt: boolean;
  employeeId: number;
  employeeName: string | null;
  categoryName: string;
  subCategoryName: string;
  subSubCategoryName: string | null;
  serviceRecordId: number | null;
  serviceTypeName: string | null;
}

type SumRow = { count: number | string; amount: number | string } | undefined;

export interface VehicleExpenseSummaryRows {
  total: SumRow;
  year: SumRow;
  month: SumRow;
  pending: SumRow;
  byCategory: Array<{ category_name: string; count: number | string; amount: number | string }>;
  manualServices: { amount: number | string } | undefined;
  yearKm: { year_max: number | null; before_max: number | null; year_min: number | null } | undefined;
}

/** Employee claim form: the selected vehicle's km, the employee's spend on it and what's due. */
export interface EmployeeVehicleSummary {
  assetId: number;
  assetNo: string;
  name: string;
  odometer: LatestOdometer | null;
  /** The employee's own claims for this vehicle (rejected ones excluded). */
  thisMonth: Totals;
  thisYear: Totals;
  pending: Totals;
  recentClaims: Array<{
    id: number;
    date: string;
    amount: number;
    categoryName: string;
    subCategoryName: string;
    stage: ExpenseStage;
  }>;
  /** Latest record per service type, newest due first. */
  due: Array<{ serviceTypeName: string; startDate: string; endDate: string | null; nextDueKm: number | null }>;
}

export interface Totals {
  count: number;
  amount: number;
}

/** Vehicle running cost: approved/paid claims, plus service costs entered by admins (not from a claim). */
export interface VehicleExpenseSummary {
  thisMonth: Totals;
  thisYear: Totals;
  allTime: Totals;
  /** Claims still waiting for approval. */
  pending: Totals;
  byCategory: Array<{ categoryName: string; count: number; amount: number }>;
  /** Service record costs this year that did not come from a claim. */
  manualServiceCostThisYear: number;
  kmThisYear: number | null;
  /** (claims + manual service costs this year) ÷ km this year. */
  costPerKm: number | null;
}
