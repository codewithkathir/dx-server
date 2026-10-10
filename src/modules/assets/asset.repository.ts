import type { Knex } from "knex";
import { AssetStatuses, type AssetStatus } from "../../shared/constants/asset";
import { BaseRepository } from "../../shared/repositories/base.repository";
import { applyListQuery, paginateQuery } from "../../shared/utils/query-builder";
import type { AssetListQueryParams } from "./asset.validation";
import type {
  AssetListRow,
  AssetRow,
  AssetSummary,
  AssignmentHistoryRow,
  AssignmentRow,
  EmployeeAssignmentRow,
} from "./asset.types";

type Db = Knex | Knex.Transaction;

class AssetRepository extends BaseRepository<AssetRow> {
  constructor() {
    super("assets");
  }

  /** Assets with their open assignment and that employee. */
  private listQuery(db: Db = this.db): Knex.QueryBuilder {
    return db("assets")
      .leftJoin("asset_assignments as a", function () {
        this.on("a.asset_id", "=", "assets.id").andOnNull("a.returned_date");
      })
      .leftJoin("employees as e", "e.id", "a.employee_id")
      .select(
        "assets.*",
        "a.id as assignment_id",
        "a.employee_id",
        "a.assigned_date",
        "a.expected_return_date",
        "a.acknowledged_at",
        "e.emp_name as employee_name",
        "e.employee_code as employee_code"
      );
  }

  async findAllPaginated(options: AssetListQueryParams): Promise<{ data: AssetListRow[]; total: number }> {
    let query = applyListQuery(this.listQuery(), options, {
      table: "assets",
      searchableFields: ["assets.asset_no", "assets.name", "assets.serial_no", "assets.brand", "assets.model", "e.emp_name"],
      sortableFields: ["assets.created_at", "assets.name", "assets.asset_no", "assets.status", "assets.purchase_date"],
      defaultSort: "assets.created_at",
    });
    if (options.status) query = query.where("assets.status", options.status);
    if (options.category) query = query.where("assets.category", options.category);
    if (options.employeeId) query = query.where("a.employee_id", options.employeeId);
    return paginateQuery<AssetListRow>(query, options);
  }

  async findListRowById(id: number, db: Db = this.db): Promise<AssetListRow | undefined> {
    return this.listQuery(db).where("assets.id", id).whereNull("assets.deleted_at").first();
  }

  async findByIdForUpdate(trx: Knex.Transaction, id: number): Promise<AssetRow | undefined> {
    return trx("assets").where({ id }).whereNull("deleted_at").forUpdate().first();
  }

  async findByAssetNo(assetNo: string, db: Db = this.db): Promise<AssetRow | undefined> {
    return db("assets").whereRaw("LOWER(asset_no) = ?", [assetNo.toLowerCase()]).whereNull("deleted_at").first();
  }

  async findBySerialNo(serialNo: string, db: Db = this.db): Promise<AssetRow | undefined> {
    return db("assets").whereRaw("LOWER(serial_no) = ?", [serialNo.toLowerCase()]).whereNull("deleted_at").first();
  }

  async insert(trx: Knex.Transaction, row: Partial<AssetRow>): Promise<number> {
    const [id] = await trx("assets").insert(row);
    return id as number;
  }

  async updateAsset(db: Db, id: number, row: Partial<AssetRow>): Promise<void> {
    await db("assets").where({ id }).update({ ...row, updated_at: db.fn.now() });
  }

  async softDeleteAsset(id: number, deletedBy?: number): Promise<void> {
    await this.db("assets")
      .where({ id })
      .update({ deleted_at: this.db.fn.now(), updated_by: deletedBy ?? null });
  }

  async findOpenAssignment(assetId: number, db: Db = this.db): Promise<AssignmentRow | undefined> {
    return db("asset_assignments").where({ asset_id: assetId }).whereNull("returned_date").first();
  }

  async insertAssignment(trx: Knex.Transaction, row: Partial<AssignmentRow>): Promise<number> {
    const [id] = await trx("asset_assignments").insert(row);
    return id as number;
  }

  async closeAssignment(trx: Knex.Transaction, id: number, row: Partial<AssignmentRow>): Promise<void> {
    await trx("asset_assignments").where({ id }).update({ ...row, updated_at: trx.fn.now() });
  }

  async history(assetId: number): Promise<AssignmentHistoryRow[]> {
    return this.db("asset_assignments as a")
      .leftJoin("employees as e", "e.id", "a.employee_id")
      .leftJoin("admins as ab", "ab.id", "a.assigned_by")
      .leftJoin("admins as rb", "rb.id", "a.returned_by")
      .where("a.asset_id", assetId)
      .select(
        "a.*",
        "e.emp_name as employee_name",
        "e.employee_code as employee_code",
        "ab.name as assigned_by_name",
        "rb.name as returned_by_name"
      )
      .orderBy("a.assigned_date", "desc")
      .orderBy("a.id", "desc");
  }

  /** Everything ever assigned to one employee, open assignments first. */
  async listForEmployee(employeeId: number): Promise<EmployeeAssignmentRow[]> {
    return this.db("asset_assignments as a")
      .join("assets as s", "s.id", "a.asset_id")
      .where("a.employee_id", employeeId)
      .whereNull("s.deleted_at")
      .select(
        "a.*",
        "s.asset_no",
        "s.name as asset_name",
        "s.category",
        "s.brand",
        "s.model",
        "s.serial_no",
        "s.warranty_expiry"
      )
      .orderByRaw("a.returned_date IS NULL DESC")
      .orderBy("a.assigned_date", "desc")
      .orderBy("a.id", "desc");
  }

  /** Marks an open assignment as received; returns false if it isn't this employee's or is already done. */
  async acknowledge(assignmentId: number, employeeId: number): Promise<boolean> {
    const updated = await this.db("asset_assignments")
      .where({ id: assignmentId, employee_id: employeeId })
      .whereNull("returned_date")
      .whereNull("acknowledged_at")
      .update({ acknowledged_at: this.db.fn.now(), updated_at: this.db.fn.now() });
    return updated > 0;
  }

  async findAssignmentForEmployee(assignmentId: number, employeeId: number): Promise<AssignmentRow | undefined> {
    return this.db("asset_assignments").where({ id: assignmentId, employee_id: employeeId }).first();
  }

  async summary(today: string): Promise<AssetSummary> {
    const [statusRows, overdue, unacknowledged] = await Promise.all([
      this.db("assets")
        .whereNull("deleted_at")
        .select("status", this.db.raw("COUNT(*) AS count"), this.db.raw("COALESCE(SUM(purchase_cost), 0) AS value"))
        .groupBy("status") as Promise<Array<{ status: AssetStatus; count: number | string; value: number | string }>>,
      this.db("asset_assignments as a")
        .join("assets as s", "s.id", "a.asset_id")
        .whereNull("s.deleted_at")
        .whereNull("a.returned_date")
        .where("a.expected_return_date", "<", today)
        .count("* as count")
        .first(),
      this.db("asset_assignments as a")
        .join("assets as s", "s.id", "a.asset_id")
        .whereNull("s.deleted_at")
        .whereNull("a.returned_date")
        .whereNull("a.acknowledged_at")
        .count("* as count")
        .first(),
    ]);
    const byStatus = Object.fromEntries(AssetStatuses.map((s) => [s, 0])) as Record<AssetStatus, number>;
    let total = 0;
    let totalValue = 0;
    for (const row of statusRows) {
      byStatus[row.status] = Number(row.count);
      total += Number(row.count);
      if (row.status !== "retired" && row.status !== "lost") totalValue += Number(row.value);
    }
    return {
      total,
      totalValue: Math.round(totalValue * 100) / 100,
      byStatus,
      overdueReturns: Number((overdue as { count?: number | string } | undefined)?.count ?? 0),
      awaitingAcknowledgement: Number((unacknowledged as { count?: number | string } | undefined)?.count ?? 0),
    };
  }
}

export const assetRepository = new AssetRepository();
