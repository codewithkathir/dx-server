import { db } from "../../database/knex";
import { config } from "../../config";
import type { AssetStatus } from "../../shared/constants/asset";
import { ApiError } from "../../shared/errors/api.error";
import { ErrorCodes } from "../../shared/errors/error-codes";
import { logger } from "../../shared/logger/logger";
import { assetAssignedEmail, assetReturnedEmail, mailService, type AssetMailInfo } from "../../shared/mail";
import { DocumentSequences, nextDocumentNumber } from "../../shared/utils/document-number.util";
import { todayIso } from "../../shared/utils/money.util";
import { buildPaginationMeta } from "../../shared/utils/pagination.util";
import { employeeRepository } from "../employees/employee.repository";
import { assetRepository } from "./asset.repository";
import type {
  AssetDetail,
  AssetListRow,
  AssetPublic,
  AssetRow,
  AssetSummary,
  AssignmentHistoryRow,
  AssignmentPublic,
  EmployeeAssetPublic,
  EmployeeAssignmentRow,
} from "./asset.types";
import type {
  AssetListQueryParams,
  AssignAssetBody,
  CreateAssetBody,
  ReturnAssetBody,
  UpdateAssetBody,
} from "./asset.validation";

const badRequest = (message: string) => new ApiError(message, ErrorCodes.VALIDATION_ERROR, 400);
const conflict = (message: string) => new ApiError(message, ErrorCodes.CONFLICT, 409);
const notFound = (message: string) => new ApiError(message, ErrorCodes.NOT_FOUND, 404);

const STATUS_BLOCKS_ASSIGN: Record<Exclude<AssetStatus, "available">, string> = {
  assigned: "This asset is already assigned. Record its return first.",
  in_repair: "This asset is in repair. Mark it available before assigning it.",
  retired: "This asset is retired and can't be assigned.",
  lost: "This asset is marked as lost and can't be assigned.",
};

const dateOnly = (value: string | Date | null): string | null =>
  value === null ? null : typeof value === "string" ? value.slice(0, 10) : value.toISOString().slice(0, 10);

const assetsUrl = () => `${config.app.frontendUrl}/app/assets`;

class AssetService {
  toPublic(row: AssetListRow, today = todayIso()): AssetPublic {
    const expected = dateOnly(row.expected_return_date);
    return {
      id: row.id,
      assetNo: row.asset_no,
      name: row.name,
      category: row.category,
      brand: row.brand,
      model: row.model,
      serialNo: row.serial_no,
      purchaseDate: dateOnly(row.purchase_date),
      purchaseCost: row.purchase_cost === null ? null : Number(row.purchase_cost),
      warrantyExpiry: dateOnly(row.warranty_expiry),
      condition: row.condition,
      status: row.status,
      notes: row.notes,
      currentAssignment:
        row.assignment_id && row.employee_id
          ? {
              assignmentId: row.assignment_id,
              employeeId: row.employee_id,
              employeeName: row.employee_name,
              employeeCode: row.employee_code,
              assignedDate: dateOnly(row.assigned_date) as string,
              expectedReturnDate: expected,
              acknowledgedAt: row.acknowledged_at,
              isOverdue: Boolean(expected && expected < today),
            }
          : null,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  private toAssignment(row: AssignmentHistoryRow): AssignmentPublic {
    return {
      id: row.id,
      employeeId: row.employee_id,
      employeeName: row.employee_name,
      employeeCode: row.employee_code,
      assignedDate: dateOnly(row.assigned_date) as string,
      expectedReturnDate: dateOnly(row.expected_return_date),
      conditionOut: row.condition_out,
      notes: row.notes,
      assignedByName: row.assigned_by_name,
      acknowledgedAt: row.acknowledged_at,
      returnedDate: dateOnly(row.returned_date),
      conditionIn: row.condition_in,
      returnNotes: row.return_notes,
      returnedByName: row.returned_by_name,
    };
  }

  private toEmployeeAsset(row: EmployeeAssignmentRow): EmployeeAssetPublic {
    return {
      assignmentId: row.id,
      assetId: row.asset_id,
      assetNo: row.asset_no,
      name: row.asset_name,
      category: row.category,
      brand: row.brand,
      model: row.model,
      serialNo: row.serial_no,
      warrantyExpiry: dateOnly(row.warranty_expiry),
      assignedDate: dateOnly(row.assigned_date) as string,
      expectedReturnDate: dateOnly(row.expected_return_date),
      conditionOut: row.condition_out,
      notes: row.notes,
      acknowledgedAt: row.acknowledged_at,
      returnedDate: dateOnly(row.returned_date),
      conditionIn: row.condition_in,
      returnNotes: row.return_notes,
    };
  }

  private mailInfo(asset: AssetRow): AssetMailInfo {
    return {
      assetNo: asset.asset_no,
      name: asset.name,
      brandModel: [asset.brand, asset.model].filter(Boolean).join(" ") || null,
      serialNo: asset.serial_no,
    };
  }

  async list(query: AssetListQueryParams) {
    const { data, total } = await assetRepository.findAllPaginated(query);
    const today = todayIso();
    return { data: data.map((row) => this.toPublic(row, today)), meta: buildPaginationMeta(query.page, query.limit, total) };
  }

  async summary(): Promise<AssetSummary> {
    return assetRepository.summary(todayIso());
  }

  async getById(id: number): Promise<AssetDetail> {
    const row = await assetRepository.findListRowById(id);
    if (!row) throw notFound("Asset not found");
    const history = await assetRepository.history(id);
    return { ...this.toPublic(row), history: history.map((h) => this.toAssignment(h)) };
  }

  private async assertUnique(assetNo: string | undefined, serialNo: string | null | undefined, exceptId?: number) {
    if (assetNo) {
      const existing = await assetRepository.findByAssetNo(assetNo);
      if (existing && existing.id !== exceptId) throw conflict(`Asset number ${assetNo} is already in use`);
    }
    if (serialNo) {
      const existing = await assetRepository.findBySerialNo(serialNo);
      if (existing && existing.id !== exceptId) throw conflict(`Serial number ${serialNo} is already registered (${existing.asset_no})`);
    }
  }

  async create(input: CreateAssetBody, createdBy?: number): Promise<AssetDetail> {
    await this.assertUnique(input.assetNo, input.serialNo);
    const id = await db.transaction(async (trx) => {
      const assetNo = input.assetNo ?? (await nextDocumentNumber(trx, DocumentSequences.ASSET, new Date().getFullYear()));
      return assetRepository.insert(trx, {
        asset_no: assetNo,
        name: input.name,
        category: input.category,
        brand: input.brand ?? null,
        model: input.model ?? null,
        serial_no: input.serialNo ?? null,
        purchase_date: input.purchaseDate ?? null,
        purchase_cost: input.purchaseCost == null ? null : input.purchaseCost.toFixed(2),
        warranty_expiry: input.warrantyExpiry ?? null,
        condition: input.condition,
        status: input.status,
        notes: input.notes ?? null,
        created_by: createdBy ?? null,
        updated_by: createdBy ?? null,
      } as Partial<AssetRow>);
    });
    logger.info({ assetId: id, createdBy }, "Asset created");
    return this.getById(id);
  }

  async update(id: number, input: UpdateAssetBody, updatedBy?: number): Promise<AssetDetail> {
    const current = await assetRepository.findListRowById(id);
    if (!current) throw notFound("Asset not found");
    if (input.status && current.status === "assigned") {
      throw conflict("This asset is assigned. Record its return to change the status.");
    }
    await this.assertUnique(input.assetNo, input.serialNo, id);
    const row: Partial<AssetRow> = { updated_by: updatedBy ?? null };
    if (input.assetNo !== undefined) row.asset_no = input.assetNo;
    if (input.name !== undefined) row.name = input.name;
    if (input.category !== undefined) row.category = input.category;
    if (input.brand !== undefined) row.brand = input.brand;
    if (input.model !== undefined) row.model = input.model;
    if (input.serialNo !== undefined) row.serial_no = input.serialNo;
    if (input.purchaseDate !== undefined) row.purchase_date = input.purchaseDate;
    if (input.purchaseCost !== undefined) row.purchase_cost = input.purchaseCost === null ? null : input.purchaseCost.toFixed(2);
    if (input.warrantyExpiry !== undefined) row.warranty_expiry = input.warrantyExpiry;
    if (input.condition !== undefined) row.condition = input.condition;
    if (input.status !== undefined) row.status = input.status;
    if (input.notes !== undefined) row.notes = input.notes;
    await assetRepository.updateAsset(db, id, row);
    logger.info({ assetId: id, updatedBy }, "Asset updated");
    return this.getById(id);
  }

  async remove(id: number, deletedBy?: number): Promise<void> {
    const current = await assetRepository.findListRowById(id);
    if (!current) throw notFound("Asset not found");
    if (current.status === "assigned") throw conflict("This asset is assigned. Record its return before deleting it.");
    await assetRepository.softDeleteAsset(id, deletedBy);
    logger.info({ assetId: id, deletedBy }, "Asset deleted");
  }

  async assign(id: number, input: AssignAssetBody, assignedBy?: number): Promise<AssetDetail> {
    if (input.assignedDate > todayIso()) throw badRequest("The assigned date can't be in the future");
    const employee = await employeeRepository.findById(input.employeeId);
    if (!employee) throw notFound("Employee not found");
    if (employee.status !== "active") throw badRequest("Only active employees can be given assets");

    const asset = await db.transaction(async (trx) => {
      const locked = await assetRepository.findByIdForUpdate(trx, id);
      if (!locked) throw notFound("Asset not found");
      if (locked.status !== "available") throw conflict(STATUS_BLOCKS_ASSIGN[locked.status]);
      if (await assetRepository.findOpenAssignment(id, trx)) throw conflict(STATUS_BLOCKS_ASSIGN.assigned);
      const condition = input.condition ?? locked.condition;
      await assetRepository.insertAssignment(trx, {
        asset_id: id,
        employee_id: input.employeeId,
        assigned_date: input.assignedDate,
        expected_return_date: input.expectedReturnDate ?? null,
        condition_out: condition,
        notes: input.notes ?? null,
        assigned_by: assignedBy ?? null,
      });
      await assetRepository.updateAsset(trx, id, { status: "assigned", condition, updated_by: assignedBy ?? null });
      return { ...locked, condition };
    });

    logger.info({ assetId: id, employeeId: input.employeeId, assignedBy }, "Asset assigned");
    if (employee.email) {
      mailService.sendInBackground(
        assetAssignedEmail(
          { email: employee.email, name: employee.emp_name },
          this.mailInfo(asset),
          {
            assignedDate: input.assignedDate,
            expectedReturnDate: input.expectedReturnDate ?? null,
            condition: asset.condition,
            notes: input.notes ?? null,
          },
          assetsUrl()
        )
      );
    }
    return this.getById(id);
  }

  async returnAsset(id: number, input: ReturnAssetBody, returnedBy?: number): Promise<AssetDetail> {
    if (input.returnedDate > todayIso()) throw badRequest("The return date can't be in the future");
    const { asset, employeeId } = await db.transaction(async (trx) => {
      const locked = await assetRepository.findByIdForUpdate(trx, id);
      if (!locked) throw notFound("Asset not found");
      const open = await assetRepository.findOpenAssignment(id, trx);
      if (!open) throw conflict("This asset isn't assigned to anyone");
      if (input.returnedDate < (dateOnly(open.assigned_date) as string)) {
        throw badRequest("The return date can't be before the assigned date");
      }
      await assetRepository.closeAssignment(trx, open.id, {
        returned_date: input.returnedDate,
        condition_in: input.condition,
        return_notes: input.notes ?? null,
        returned_by: returnedBy ?? null,
      });
      await assetRepository.updateAsset(trx, id, {
        status: input.nextStatus,
        condition: input.condition,
        updated_by: returnedBy ?? null,
      });
      return { asset: locked, employeeId: open.employee_id };
    });

    logger.info({ assetId: id, employeeId, returnedBy }, "Asset returned");
    const employee = await employeeRepository.findById(employeeId);
    if (employee?.email) {
      mailService.sendInBackground(
        assetReturnedEmail(
          { email: employee.email, name: employee.emp_name },
          this.mailInfo(asset),
          { returnedDate: input.returnedDate, condition: input.condition },
          assetsUrl()
        )
      );
    }
    return this.getById(id);
  }

  async listForEmployee(employeeId: number): Promise<{ current: EmployeeAssetPublic[]; past: EmployeeAssetPublic[] }> {
    const rows = (await assetRepository.listForEmployee(employeeId)).map((row) => this.toEmployeeAsset(row));
    return { current: rows.filter((r) => !r.returnedDate), past: rows.filter((r) => r.returnedDate) };
  }

  async acknowledge(assignmentId: number, employeeId: number): Promise<EmployeeAssetPublic> {
    const done = await assetRepository.acknowledge(assignmentId, employeeId);
    if (!done) {
      const existing = await assetRepository.findAssignmentForEmployee(assignmentId, employeeId);
      if (!existing) throw notFound("Asset not found");
      if (existing.returned_date) throw conflict("This asset has already been returned");
      // Already acknowledged: idempotent.
    }
    const { current, past } = await this.listForEmployee(employeeId);
    const item = [...current, ...past].find((a) => a.assignmentId === assignmentId);
    if (!item) throw notFound("Asset not found");
    logger.info({ assignmentId, employeeId }, "Asset receipt acknowledged");
    return item;
  }
}

export const assetService = new AssetService();
