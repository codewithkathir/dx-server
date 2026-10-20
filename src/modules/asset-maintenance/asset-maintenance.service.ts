import type { Knex } from "knex";
import { db } from "../../database/knex";
import { LinkedOdometerSources } from "../../shared/constants/asset-maintenance";
import type { ExpenseStage } from "../../shared/constants/expense";
import { ApiError } from "../../shared/errors/api.error";
import { ErrorCodes } from "../../shared/errors/error-codes";
import { logger } from "../../shared/logger/logger";
import { addDaysIso, isFutureDate, todayIso } from "../../shared/utils/money.util";
import { buildPaginationMeta } from "../../shared/utils/pagination.util";
import { assetRepository } from "../assets/asset.repository";
import type { AssetRow } from "../assets/asset.types";
import { employeeRepository } from "../employees/employee.repository";
import { assetMaintenanceRepository } from "./asset-maintenance.repository";
import type {
  LatestOdometer,
  NewOdometerReading,
  OdometerReadingListRow,
  OdometerReadingPublic,
  ServiceRecordListRow,
  ServiceRecordPublic,
  ServiceRecordRow,
  ServiceTypePublic,
  ServiceTypeRow,
  VehicleExpensePublic,
  VehicleExpenseRow,
  VehicleExpenseSummary,
} from "./asset-maintenance.types";
import type {
  CreateOdometerReadingBody,
  CreateServiceRecordBody,
  CreateServiceTypeBody,
  EmployeeOdometerReadingBody,
  OdometerReadingListQueryParams,
  ServiceRecordListQueryParams,
  ServiceTypeListQueryParams,
  UpdateServiceRecordBody,
  UpdateServiceTypeBody,
  VehicleExpenseListQueryParams,
} from "./asset-maintenance.validation";

/** The expense columns linking needs (an ExpenseRow fits). */
export interface ExpenseForVehicle {
  id: number;
  asset_id: number | null;
  odometer_km: number | null;
  employee_id: number;
  date: string;
  amount: string | number;
  sub_category_id: number;
  sub_sub_category_id: number | null;
  description: string | null;
}

const badRequest = (message: string) => new ApiError(message, ErrorCodes.VALIDATION_ERROR, 400);
const conflict = (message: string) => new ApiError(message, ErrorCodes.CONFLICT, 409);
const notFound = (message: string) => new ApiError(message, ErrorCodes.NOT_FOUND, 404);

const dateOnly = (value: string | Date | null): string | null =>
  value === null ? null : typeof value === "string" ? value.slice(0, 10) : value.toISOString().slice(0, 10);

const formatKm = (value: number) => `${value.toLocaleString("en-US")} km`;

const toServiceType = (row: ServiceTypeRow): ServiceTypePublic => ({
  id: row.id,
  code: row.code,
  name: row.name,
  category: row.category,
  intervalDays: row.interval_days,
  intervalKm: row.interval_km,
  sortOrder: row.sort_order,
  status: row.status,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

const toServiceRecord = (row: ServiceRecordListRow): ServiceRecordPublic => ({
  id: row.id,
  assetId: row.asset_id,
  serviceTypeId: row.service_type_id,
  serviceTypeCode: row.service_type_code,
  serviceTypeName: row.service_type_name,
  employeeId: row.employee_id,
  employeeName: row.employee_name,
  employeeCode: row.employee_code,
  startDate: dateOnly(row.start_date) as string,
  endDate: dateOnly(row.end_date),
  odometerKm: row.odometer_km,
  nextDueKm: row.next_due_km,
  cost: row.cost === null ? null : Number(row.cost),
  referenceNo: row.reference_no,
  notes: row.notes,
  expenseId: row.expense_id ?? null,
  createdByName: row.created_by_name,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

/** Same mapping as the expense list's stage filter. */
const stageOf = (row: { employee_status: string; admin_status: string }): ExpenseStage =>
  row.admin_status === "paid"
    ? "paid"
    : row.admin_status === "rejected"
      ? "rejected"
      : row.employee_status === "approved"
        ? "approved"
        : row.employee_status === "pending"
          ? "pending"
          : "rejected";

const toVehicleExpense = (row: VehicleExpenseRow): VehicleExpensePublic => ({
  id: row.id,
  date: dateOnly(row.date) as string,
  amount: Number(row.amount),
  description: row.description,
  odometerKm: row.odometer_km,
  stage: stageOf(row),
  hasReceipt: Boolean(row.support_file),
  employeeId: row.employee_id,
  employeeName: row.employee_name,
  categoryName: row.category_name,
  subCategoryName: row.sub_category_name,
  subSubCategoryName: row.sub_sub_category_name,
  serviceRecordId: row.service_record_id,
  serviceTypeName: row.service_type_name,
});

const toOdometerReading = (row: OdometerReadingListRow): OdometerReadingPublic => ({
  id: row.id,
  assetId: row.asset_id,
  readingKm: row.reading_km,
  readingDate: dateOnly(row.reading_date) as string,
  source: row.source,
  serviceRecordId: row.service_record_id,
  assignmentId: row.assignment_id,
  expenseId: row.expense_id,
  employeeId: row.employee_id,
  employeeName: row.employee_name,
  notes: row.notes,
  createdByName: row.created_by_name,
  createdAt: row.created_at,
});

class AssetMaintenanceService {
  private async requireAsset(id: number): Promise<AssetRow> {
    const asset = await assetRepository.findById(id);
    if (!asset) throw notFound("Asset not found");
    return asset;
  }

  private async requireEmployee(id: number): Promise<void> {
    if (!(await employeeRepository.findById(id))) throw notFound("Employee not found");
  }

  /** A type that is active and meant for this asset's category. */
  private async requireUsableType(id: number, asset: AssetRow): Promise<ServiceTypeRow> {
    const type = await assetMaintenanceRepository.findServiceTypeById(id);
    if (!type) throw notFound("Service type not found");
    if (type.status !== "active") throw badRequest(`${type.name} is inactive`);
    if (type.category && type.category !== asset.category) {
      throw badRequest(`${type.name} can't be recorded for a ${asset.category.replace("_", " ")}`);
    }
    return type;
  }

  // ── Odometer ───────────────────────────────────────────────────────────────

  /**
   * Records a reading inside the caller's transaction. Readings may not go
   * backwards in time: it must be ≥ every reading up to its date and ≤ every
   * later one, unless `allowDecrease` (replaced or reset odometer).
   */
  async recordOdometer(trx: Knex.Transaction, reading: NewOdometerReading): Promise<number> {
    // Serialises readings per asset so two concurrent entries can't both pass the check.
    await assetRepository.findByIdForUpdate(trx, reading.assetId);
    if (!reading.allowDecrease) await this.assertOdometerFits(reading.assetId, reading.readingKm, reading.readingDate, trx);
    return assetMaintenanceRepository.insertOdometerReading(trx, {
      asset_id: reading.assetId,
      reading_km: reading.readingKm,
      reading_date: reading.readingDate,
      source: reading.source,
      service_record_id: reading.serviceRecordId ?? null,
      assignment_id: reading.assignmentId ?? null,
      expense_id: reading.expenseId ?? null,
      employee_id: reading.employeeId ?? null,
      notes: reading.notes ?? null,
      created_by: reading.createdBy ?? null,
    });
  }

  /** Throws when `km` on `date` would be below an earlier reading or above a later one. */
  async assertOdometerFits(assetId: number, km: number, date: string, conn: Knex | Knex.Transaction = db): Promise<void> {
    const { before, after } = await assetMaintenanceRepository.odometerNeighbours(assetId, date, null, conn);
    if (before && km < before.reading_km) {
      throw badRequest(`Odometer can't go down: ${formatKm(before.reading_km)} was recorded on ${dateOnly(before.reading_date)}`);
    }
    if (after && km > after.reading_km) {
      throw badRequest(`Odometer is higher than the later reading of ${formatKm(after.reading_km)} on ${dateOnly(after.reading_date)}`);
    }
  }

  async latestOdometer(assetId: number): Promise<LatestOdometer | null> {
    const row = await assetMaintenanceRepository.latestOdometer(assetId);
    return row ? { readingKm: row.reading_km, readingDate: dateOnly(row.reading_date) as string } : null;
  }

  async listOdometerReadings(assetId: number, query: OdometerReadingListQueryParams) {
    await this.requireAsset(assetId);
    const { data, total } = await assetMaintenanceRepository.findOdometerReadings(assetId, query);
    return { data: data.map(toOdometerReading), meta: buildPaginationMeta(query.page, query.limit, total) };
  }

  async addOdometerReading(assetId: number, input: CreateOdometerReadingBody, createdBy?: number): Promise<LatestOdometer | null> {
    await this.requireAsset(assetId);
    if (isFutureDate(input.readingDate)) throw badRequest("The reading date can't be in the future");
    if (input.employeeId) await this.requireEmployee(input.employeeId);
    await db.transaction((trx) =>
      this.recordOdometer(trx, {
        assetId,
        readingKm: input.readingKm,
        readingDate: input.readingDate,
        source: "manual",
        employeeId: input.employeeId ?? null,
        notes: input.notes ?? null,
        createdBy: createdBy ?? null,
        allowDecrease: input.allowDecrease,
      })
    );
    logger.info({ assetId, readingKm: input.readingKm, createdBy }, "Odometer reading added");
    return this.latestOdometer(assetId);
  }

  async removeOdometerReading(assetId: number, readingId: number, deletedBy?: number): Promise<LatestOdometer | null> {
    const reading = await assetMaintenanceRepository.findOdometerReading(assetId, readingId);
    if (!reading) throw notFound("Odometer reading not found");
    if (LinkedOdometerSources.includes(reading.source)) {
      throw conflict(
        reading.source === "expense"
          ? "This reading came from an expense claim. Change the claim's odometer instead."
          : "This reading belongs to a service record. Edit the service record to change it."
      );
    }
    await db.transaction(async (trx) => {
      if (reading.assignment_id && (reading.source === "assign" || reading.source === "return")) {
        const column = reading.source === "assign" ? "odometer_out" : "odometer_in";
        await assetMaintenanceRepository.clearAssignmentOdometer(trx, reading.assignment_id, column);
      }
      await assetMaintenanceRepository.deleteOdometerReading(trx, readingId);
    });
    logger.info({ assetId, readingId, deletedBy }, "Odometer reading deleted");
    return this.latestOdometer(assetId);
  }

  /** Employee app: the current holder reports the odometer of the vehicle they have. */
  async addEmployeeOdometerReading(
    assignmentId: number,
    employeeId: number,
    input: EmployeeOdometerReadingBody
  ): Promise<LatestOdometer | null> {
    const assignment = await assetRepository.findAssignmentForEmployee(assignmentId, employeeId);
    if (!assignment) throw notFound("Asset not found");
    if (assignment.returned_date) throw conflict("This asset has already been returned");
    const readingDate = input.readingDate ?? todayIso();
    if (isFutureDate(readingDate)) throw badRequest("The reading date can't be in the future");
    if (readingDate < (dateOnly(assignment.assigned_date) as string)) {
      throw badRequest("The reading date can't be before you received the vehicle");
    }
    await db.transaction((trx) =>
      this.recordOdometer(trx, {
        assetId: assignment.asset_id,
        readingKm: input.readingKm,
        readingDate,
        source: "employee",
        assignmentId,
        employeeId,
        notes: input.notes ?? null,
      })
    );
    logger.info({ assetId: assignment.asset_id, assignmentId, employeeId }, "Odometer reported by employee");
    return this.latestOdometer(assignment.asset_id);
  }

  // ── Service records ────────────────────────────────────────────────────────

  async listServiceRecords(assetId: number, query: ServiceRecordListQueryParams) {
    await this.requireAsset(assetId);
    const { data, total } = await assetMaintenanceRepository.findServiceRecords(assetId, query);
    return { data: data.map(toServiceRecord), meta: buildPaginationMeta(query.page, query.limit, total) };
  }

  async getServiceRecord(assetId: number, recordId: number): Promise<ServiceRecordPublic> {
    const row = await assetMaintenanceRepository.findServiceRecord(assetId, recordId);
    if (!row) throw notFound("Service record not found");
    return toServiceRecord(row);
  }

  async createServiceRecord(assetId: number, input: CreateServiceRecordBody, createdBy?: number): Promise<ServiceRecordPublic> {
    const asset = await this.requireAsset(assetId);
    const type = await this.requireUsableType(input.serviceTypeId, asset);
    if (isFutureDate(input.startDate)) throw badRequest("The start date can't be in the future");
    if (input.employeeId) await this.requireEmployee(input.employeeId);

    const odometerKm = input.odometerKm ?? null;
    const endDate =
      input.endDate !== undefined ? input.endDate : type.interval_days ? addDaysIso(input.startDate, type.interval_days) : null;
    const nextDueKm =
      input.nextDueKm !== undefined
        ? input.nextDueKm
        : odometerKm !== null && type.interval_km
          ? odometerKm + type.interval_km
          : null;
    if (nextDueKm !== null && odometerKm === null) throw badRequest("Enter the odometer reading to set a next due km");

    const id = await db.transaction(async (trx) => {
      const recordId = await assetMaintenanceRepository.insertServiceRecord(trx, {
        asset_id: assetId,
        service_type_id: type.id,
        employee_id: input.employeeId ?? null,
        start_date: input.startDate,
        end_date: endDate,
        odometer_km: odometerKm,
        next_due_km: nextDueKm,
        cost: input.cost == null ? null : input.cost.toFixed(2),
        reference_no: input.referenceNo ?? null,
        notes: input.notes ?? null,
        created_by: createdBy ?? null,
        updated_by: createdBy ?? null,
      } as Partial<ServiceRecordRow>);
      if (odometerKm !== null) {
        await this.recordOdometer(trx, {
          assetId,
          readingKm: odometerKm,
          readingDate: input.startDate,
          source: "service",
          serviceRecordId: recordId,
          employeeId: input.employeeId ?? null,
          createdBy: createdBy ?? null,
          allowDecrease: input.allowOdometerDecrease,
        });
      }
      return recordId;
    });
    logger.info({ assetId, recordId: id, serviceType: type.code, createdBy }, "Service record added");
    return this.getServiceRecord(assetId, id);
  }

  /** Dates and km are saved as sent; they are only defaulted from the type's intervals on create. */
  async updateServiceRecord(
    assetId: number,
    recordId: number,
    input: UpdateServiceRecordBody,
    updatedBy?: number
  ): Promise<ServiceRecordPublic> {
    const current = await assetMaintenanceRepository.findServiceRecord(assetId, recordId);
    if (!current) throw notFound("Service record not found");
    const asset = await this.requireAsset(assetId);
    if (input.serviceTypeId !== undefined && input.serviceTypeId !== current.service_type_id) {
      await this.requireUsableType(input.serviceTypeId, asset);
    }
    if (input.startDate && isFutureDate(input.startDate)) throw badRequest("The start date can't be in the future");
    if (input.employeeId) await this.requireEmployee(input.employeeId);

    const startDate = input.startDate ?? (dateOnly(current.start_date) as string);
    const endDate = input.endDate !== undefined ? input.endDate : dateOnly(current.end_date);
    const odometerKm = input.odometerKm !== undefined ? input.odometerKm : current.odometer_km;
    const nextDueKm = input.nextDueKm !== undefined ? input.nextDueKm : current.next_due_km;
    if (endDate && endDate < startDate) throw badRequest("The end date can't be before the start date");
    if (nextDueKm !== null && odometerKm === null) throw badRequest("Enter the odometer reading to set a next due km");
    if (nextDueKm !== null && odometerKm !== null && nextDueKm <= odometerKm) {
      throw badRequest("Next due km must be more than the odometer reading");
    }

    const row: Partial<ServiceRecordRow> = { updated_by: updatedBy ?? null };
    if (input.serviceTypeId !== undefined) row.service_type_id = input.serviceTypeId;
    if (input.employeeId !== undefined) row.employee_id = input.employeeId;
    if (input.startDate !== undefined) row.start_date = input.startDate;
    if (input.endDate !== undefined) row.end_date = input.endDate;
    if (input.odometerKm !== undefined) row.odometer_km = input.odometerKm;
    if (input.nextDueKm !== undefined) row.next_due_km = input.nextDueKm;
    if (input.cost !== undefined) row.cost = input.cost === null ? null : input.cost.toFixed(2);
    if (input.referenceNo !== undefined) row.reference_no = input.referenceNo;
    if (input.notes !== undefined) row.notes = input.notes;

    await db.transaction(async (trx) => {
      await assetMaintenanceRepository.updateServiceRecord(trx, recordId, row);
      const reading = await assetMaintenanceRepository.findOdometerReadingForServiceRecord(recordId, trx);
      const readingChanged =
        (reading?.reading_km ?? null) !== odometerKm ||
        (reading !== undefined && dateOnly(reading.reading_date) !== startDate);
      if (!readingChanged) return;
      if (reading) await assetMaintenanceRepository.deleteOdometerReading(trx, reading.id);
      if (odometerKm !== null) {
        await this.recordOdometer(trx, {
          assetId,
          readingKm: odometerKm,
          readingDate: startDate,
          source: "service",
          serviceRecordId: recordId,
          employeeId: input.employeeId !== undefined ? input.employeeId : current.employee_id,
          createdBy: updatedBy ?? null,
          allowDecrease: input.allowOdometerDecrease,
        });
      }
    });
    logger.info({ assetId, recordId, updatedBy }, "Service record updated");
    return this.getServiceRecord(assetId, recordId);
  }

  async removeServiceRecord(assetId: number, recordId: number, deletedBy?: number): Promise<void> {
    const current = await assetMaintenanceRepository.findServiceRecord(assetId, recordId);
    if (!current) throw notFound("Service record not found");
    await db.transaction(async (trx) => {
      const reading = await assetMaintenanceRepository.findOdometerReadingForServiceRecord(recordId, trx);
      if (reading) await assetMaintenanceRepository.deleteOdometerReading(trx, reading.id);
      await assetMaintenanceRepository.softDeleteServiceRecord(trx, recordId, deletedBy);
    });
    logger.info({ assetId, recordId, deletedBy }, "Service record deleted");
  }

  // ── Vehicle expenses ───────────────────────────────────────────────────────

  /** Employee claim: the vehicle must be one they had on the claim date, and the km must fit its history. */
  async assertClaimVehicle(employeeId: number, assetId: number, date: string, odometerKm: number): Promise<void> {
    const asset = await assetRepository.findById(assetId);
    if (!asset || asset.category !== "vehicle") throw badRequest("Pick the vehicle this expense was for");
    if (!(await assetMaintenanceRepository.wasAssignedOn(assetId, employeeId, date))) {
      throw badRequest(`${asset.asset_no} wasn't assigned to you on ${date}`);
    }
    await this.assertOdometerFits(assetId, odometerKm, date);
  }

  /** Admin correction: any vehicle, km must still fit its history. */
  async assertVehicle(assetId: number, date: string, odometerKm: number | null): Promise<void> {
    const asset = await assetRepository.findById(assetId);
    if (!asset || asset.category !== "vehicle") throw badRequest("Pick a vehicle");
    if (odometerKm !== null) await this.assertOdometerFits(assetId, odometerKm, date);
  }

  /**
   * On approval: a claim whose category maps to a service type becomes a
   * service record (cost = claim amount, due date/km from the type);
   * otherwise its km is kept as an odometer reading. Runs in the approval transaction.
   */
  async linkExpense(trx: Knex.Transaction, expense: ExpenseForVehicle, approvedBy?: number): Promise<void> {
    if (!expense.asset_id) return;
    const date = dateOnly(expense.date) as string;
    const km = expense.odometer_km;
    const type = await assetMaintenanceRepository.findServiceTypeForCategory(
      expense.sub_category_id,
      expense.sub_sub_category_id,
      trx
    );
    if (type) {
      const recordId = await assetMaintenanceRepository.insertServiceRecord(trx, {
        asset_id: expense.asset_id,
        service_type_id: type.id,
        employee_id: expense.employee_id,
        start_date: date,
        end_date: type.interval_days ? addDaysIso(date, type.interval_days) : null,
        odometer_km: km,
        next_due_km: km !== null && type.interval_km ? km + type.interval_km : null,
        cost: Number(expense.amount).toFixed(2),
        reference_no: `Claim #${expense.id}`,
        notes: expense.description,
        expense_id: expense.id,
        created_by: approvedBy ?? null,
        updated_by: approvedBy ?? null,
      } as Partial<ServiceRecordRow>);
      if (km !== null) {
        await this.recordOdometer(trx, {
          assetId: expense.asset_id,
          readingKm: km,
          readingDate: date,
          source: "service",
          serviceRecordId: recordId,
          expenseId: expense.id,
          employeeId: expense.employee_id,
          createdBy: approvedBy ?? null,
        });
      }
      return;
    }
    if (km !== null) {
      await this.recordOdometer(trx, {
        assetId: expense.asset_id,
        readingKm: km,
        readingDate: date,
        source: "expense",
        expenseId: expense.id,
        employeeId: expense.employee_id,
        createdBy: approvedBy ?? null,
      });
    }
  }

  /** On reject, delete or vehicle change: drop what the claim created. */
  async unlinkExpense(trx: Knex.Transaction, expenseId: number): Promise<void> {
    await assetMaintenanceRepository.deleteExpenseLinks(trx, expenseId);
  }

  async listVehicleExpenses(assetId: number, query: VehicleExpenseListQueryParams) {
    await this.requireAsset(assetId);
    const { data, total } = await assetMaintenanceRepository.findVehicleExpenses(assetId, query);
    return { data: data.map(toVehicleExpense), meta: buildPaginationMeta(query.page, query.limit, total) };
  }

  async vehicleExpenseSummary(assetId: number): Promise<VehicleExpenseSummary> {
    await this.requireAsset(assetId);
    const today = todayIso();
    const rows = await assetMaintenanceRepository.vehicleExpenseSummary(
      assetId,
      `${today.slice(0, 7)}-01`,
      `${today.slice(0, 4)}-01-01`
    );
    const totals = (r: { count: number | string; amount: number | string } | undefined) => ({
      count: Number(r?.count ?? 0),
      amount: Number(r?.amount ?? 0),
    });
    const thisYear = totals(rows.year);
    const manual = Number(rows.manualServices?.amount ?? 0);
    const km = rows.yearKm;
    // Driven this year: from the last reading before 1 Jan (or the first one this year) to the latest.
    const start = km?.before_max ?? km?.year_min ?? null;
    const kmThisYear = km?.year_max != null && start != null ? Math.max(0, km.year_max - start) : null;
    return {
      thisMonth: totals(rows.month),
      thisYear,
      allTime: totals(rows.total),
      pending: totals(rows.pending),
      byCategory: rows.byCategory.map((c) => ({ categoryName: c.category_name, count: Number(c.count), amount: Number(c.amount) })),
      manualServiceCostThisYear: manual,
      kmThisYear,
      costPerKm: kmThisYear ? Math.round(((thisYear.amount + manual) / kmThisYear) * 100) / 100 : null,
    };
  }

  // ── Service types ──────────────────────────────────────────────────────────

  async listServiceTypes(query: ServiceTypeListQueryParams) {
    const { data, total } = await assetMaintenanceRepository.findServiceTypes(query);
    return { data: data.map(toServiceType), meta: buildPaginationMeta(query.page, query.limit, total) };
  }

  async assertServiceTypeExists(id: number): Promise<void> {
    if (!(await assetMaintenanceRepository.findServiceTypeById(id))) throw notFound("Service type not found");
  }

  async getServiceType(id: number): Promise<ServiceTypePublic> {
    const row = await assetMaintenanceRepository.findServiceTypeById(id);
    if (!row) throw notFound("Service type not found");
    return toServiceType(row);
  }

  private async assertCodeFree(code: string, exceptId?: number) {
    const existing = await assetMaintenanceRepository.findServiceTypeByCode(code);
    if (existing && existing.id !== exceptId) throw conflict(`Service type code ${code} is already in use`);
  }

  async createServiceType(input: CreateServiceTypeBody, createdBy?: number): Promise<ServiceTypePublic> {
    await this.assertCodeFree(input.code);
    const id = await assetMaintenanceRepository.insertServiceType({
      code: input.code,
      name: input.name,
      category: input.category ?? null,
      interval_days: input.intervalDays ?? null,
      interval_km: input.intervalKm ?? null,
      sort_order: input.sortOrder ?? 0,
      status: input.status ?? "active",
      created_by: createdBy ?? null,
      updated_by: createdBy ?? null,
    } as Partial<ServiceTypeRow>);
    logger.info({ serviceTypeId: id, createdBy }, "Service type created");
    return this.getServiceType(id);
  }

  async updateServiceType(id: number, input: UpdateServiceTypeBody, updatedBy?: number): Promise<ServiceTypePublic> {
    const current = await assetMaintenanceRepository.findServiceTypeById(id);
    if (!current) throw notFound("Service type not found");
    if (input.code !== undefined) await this.assertCodeFree(input.code, id);
    const row: Partial<ServiceTypeRow> = { updated_by: updatedBy ?? null };
    if (input.code !== undefined) row.code = input.code;
    if (input.name !== undefined) row.name = input.name;
    if (input.category !== undefined) row.category = input.category;
    if (input.intervalDays !== undefined) row.interval_days = input.intervalDays;
    if (input.intervalKm !== undefined) row.interval_km = input.intervalKm;
    if (input.sortOrder !== undefined) row.sort_order = input.sortOrder;
    if (input.status !== undefined) row.status = input.status;
    await assetMaintenanceRepository.updateServiceType(id, row);
    logger.info({ serviceTypeId: id, updatedBy }, "Service type updated");
    return this.getServiceType(id);
  }

  async removeServiceType(id: number, deletedBy?: number): Promise<void> {
    const current = await assetMaintenanceRepository.findServiceTypeById(id);
    if (!current) throw notFound("Service type not found");
    if (await assetMaintenanceRepository.serviceTypeInUse(id)) {
      throw conflict(`${current.name} has service records. Mark it inactive instead.`);
    }
    await assetMaintenanceRepository.softDeleteServiceType(id, deletedBy);
    logger.info({ serviceTypeId: id, deletedBy }, "Service type deleted");
  }
}

export const assetMaintenanceService = new AssetMaintenanceService();
