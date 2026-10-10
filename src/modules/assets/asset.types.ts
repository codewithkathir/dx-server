import type { AssetCategory, AssetCondition, AssetStatus } from "../../shared/constants/asset";
import type { BaseEntity } from "../../shared/types/common.types";

export interface AssetRow extends BaseEntity {
  asset_no: string;
  name: string;
  category: AssetCategory;
  brand: string | null;
  model: string | null;
  serial_no: string | null;
  purchase_date: string | null;
  purchase_cost: string | null;
  warranty_expiry: string | null;
  condition: AssetCondition;
  status: AssetStatus;
  notes: string | null;
}

/** An asset joined with its open assignment (if any) and that employee. */
export interface AssetListRow extends AssetRow {
  assignment_id: number | null;
  employee_id: number | null;
  employee_name: string | null;
  employee_code: string | null;
  assigned_date: string | null;
  expected_return_date: string | null;
  acknowledged_at: Date | null;
}

export interface AssignmentRow {
  id: number;
  asset_id: number;
  employee_id: number;
  assigned_date: string;
  expected_return_date: string | null;
  condition_out: AssetCondition;
  notes: string | null;
  assigned_by: number | null;
  acknowledged_at: Date | null;
  returned_date: string | null;
  condition_in: AssetCondition | null;
  return_notes: string | null;
  returned_by: number | null;
  created_at: Date;
  updated_at: Date;
}

export interface AssignmentHistoryRow extends AssignmentRow {
  employee_name: string | null;
  employee_code: string | null;
  assigned_by_name: string | null;
  returned_by_name: string | null;
}

/** An employee's assignment joined with its asset (employee app). */
export interface EmployeeAssignmentRow extends AssignmentRow {
  asset_no: string;
  asset_name: string;
  category: AssetCategory;
  brand: string | null;
  model: string | null;
  serial_no: string | null;
  warranty_expiry: string | null;
}

export interface CurrentAssignment {
  assignmentId: number;
  employeeId: number;
  employeeName: string | null;
  employeeCode: string | null;
  assignedDate: string;
  expectedReturnDate: string | null;
  acknowledgedAt: Date | null;
  isOverdue: boolean;
}

export interface AssetPublic {
  id: number;
  assetNo: string;
  name: string;
  category: AssetCategory;
  brand: string | null;
  model: string | null;
  serialNo: string | null;
  purchaseDate: string | null;
  purchaseCost: number | null;
  warrantyExpiry: string | null;
  condition: AssetCondition;
  status: AssetStatus;
  notes: string | null;
  currentAssignment: CurrentAssignment | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface AssignmentPublic {
  id: number;
  employeeId: number;
  employeeName: string | null;
  employeeCode: string | null;
  assignedDate: string;
  expectedReturnDate: string | null;
  conditionOut: AssetCondition;
  notes: string | null;
  assignedByName: string | null;
  acknowledgedAt: Date | null;
  returnedDate: string | null;
  conditionIn: AssetCondition | null;
  returnNotes: string | null;
  returnedByName: string | null;
}

export interface AssetDetail extends AssetPublic {
  history: AssignmentPublic[];
}

export interface EmployeeAssetPublic {
  assignmentId: number;
  assetId: number;
  assetNo: string;
  name: string;
  category: AssetCategory;
  brand: string | null;
  model: string | null;
  serialNo: string | null;
  warrantyExpiry: string | null;
  assignedDate: string;
  expectedReturnDate: string | null;
  conditionOut: AssetCondition;
  notes: string | null;
  acknowledgedAt: Date | null;
  returnedDate: string | null;
  conditionIn: AssetCondition | null;
  returnNotes: string | null;
}

export interface AssetSummary {
  total: number;
  totalValue: number;
  byStatus: Record<AssetStatus, number>;
  overdueReturns: number;
  awaitingAcknowledgement: number;
}
