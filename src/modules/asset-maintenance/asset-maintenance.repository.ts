import type { Knex } from "knex";
import type { ExpenseStage } from "../../shared/constants/expense";
import { BaseRepository } from "../../shared/repositories/base.repository";
import { applyListQuery, applySoftDelete, paginateQuery } from "../../shared/utils/query-builder";
import type {
  OdometerReadingListRow,
  OdometerReadingRow,
  ServiceRecordListRow,
  ServiceRecordRow,
  ServiceTypeRow,
  VehicleExpenseRow,
  VehicleExpenseSummaryRows,
} from "./asset-maintenance.types";
import type {
  OdometerReadingListQueryParams,
  ServiceRecordListQueryParams,
  ServiceTypeListQueryParams,
  VehicleExpenseListQueryParams,
} from "./asset-maintenance.validation";

type Db = Knex | Knex.Transaction;

/**
 * Claim stages on the joined "x" alias. "counted" = money the company owes or
 * paid (approved or paid, not rejected), which is what vehicle spend totals use.
 */
function applyExpenseStage(query: Knex.QueryBuilder, stage: ExpenseStage | "counted"): Knex.QueryBuilder {
  if (stage === "counted") {
    return query.whereNot("x.admin_status", "rejected").where((q) => q.where("x.employee_status", "approved").orWhere("x.admin_status", "paid"));
  }
  if (stage === "pending") return query.where({ "x.employee_status": "pending", "x.admin_status": "pending" });
  if (stage === "approved") return query.where({ "x.employee_status": "approved", "x.admin_status": "pending" });
  if (stage === "paid") return query.where("x.admin_status", "paid");
  return query.where("x.admin_status", "rejected");
}

class AssetMaintenanceRepository extends BaseRepository<ServiceRecordRow> {
  constructor() {
    super("asset_service_records");
  }

  // ── Service types ──────────────────────────────────────────────────────────

  async findServiceTypes(options: ServiceTypeListQueryParams): Promise<{ data: ServiceTypeRow[]; total: number }> {
    let query = applyListQuery(this.db("asset_service_types"), options, {
      table: "asset_service_types",
      searchableFields: ["asset_service_types.code", "asset_service_types.name"],
      sortableFields: ["sort_order", "name", "code", "created_at"],
      defaultSort: "sort_order",
    });
    if (options.category) {
      query = query.where((q) => q.where("category", options.category!).orWhereNull("category"));
    }
    return paginateQuery<ServiceTypeRow>(query.orderBy("name", "asc"), options);
  }

  async findServiceTypeById(id: number, db: Db = this.db): Promise<ServiceTypeRow | undefined> {
    return applySoftDelete(db("asset_service_types")).where({ id }).first();
  }

  /** Includes deleted types: the code column is unique across all rows. */
  async findServiceTypeByCode(code: string): Promise<ServiceTypeRow | undefined> {
    return this.db("asset_service_types").where({ code }).first();
  }

  async insertServiceType(row: Partial<ServiceTypeRow>): Promise<number> {
    const [id] = await this.db("asset_service_types").insert(row);
    return id as number;
  }

  async updateServiceType(id: number, row: Partial<ServiceTypeRow>): Promise<void> {
    await this.db("asset_service_types").where({ id }).update({ ...row, updated_at: this.db.fn.now() });
  }

  async softDeleteServiceType(id: number, deletedBy?: number): Promise<void> {
    await this.db("asset_service_types")
      .where({ id })
      .update({ deleted_at: this.db.fn.now(), updated_by: deletedBy ?? null });
  }

  async serviceTypeInUse(id: number): Promise<boolean> {
    const row = await applySoftDelete(this.db("asset_service_records")).where({ service_type_id: id }).first("id");
    return Boolean(row);
  }

  // ── Service records ────────────────────────────────────────────────────────

  private serviceRecordQuery(db: Db = this.db): Knex.QueryBuilder {
    return db("asset_service_records as r")
      .join("asset_service_types as t", "t.id", "r.service_type_id")
      .leftJoin("employees as e", "e.id", "r.employee_id")
      .leftJoin("admins as cb", "cb.id", "r.created_by")
      .select(
        "r.*",
        "t.code as service_type_code",
        "t.name as service_type_name",
        "e.emp_name as employee_name",
        "e.employee_code as employee_code",
        "cb.name as created_by_name"
      );
  }

  async findServiceRecords(
    assetId: number,
    options: ServiceRecordListQueryParams
  ): Promise<{ data: ServiceRecordListRow[]; total: number }> {
    let query = applyListQuery(this.serviceRecordQuery().where("r.asset_id", assetId), options, {
      table: "asset_service_records",
      alias: "r",
      sortableFields: ["r.start_date", "r.end_date", "r.created_at"],
      defaultSort: "r.start_date",
    }).orderBy("r.id", "desc");
    if (options.serviceTypeId) query = query.where("r.service_type_id", options.serviceTypeId);
    return paginateQuery<ServiceRecordListRow>(query, options);
  }

  async findServiceRecord(assetId: number, recordId: number, db: Db = this.db): Promise<ServiceRecordListRow | undefined> {
    return this.serviceRecordQuery(db)
      .where({ "r.id": recordId, "r.asset_id": assetId })
      .whereNull("r.deleted_at")
      .first();
  }

  async insertServiceRecord(trx: Knex.Transaction, row: Partial<ServiceRecordRow>): Promise<number> {
    const [id] = await trx("asset_service_records").insert(row);
    return id as number;
  }

  async updateServiceRecord(trx: Knex.Transaction, id: number, row: Partial<ServiceRecordRow>): Promise<void> {
    await trx("asset_service_records").where({ id }).update({ ...row, updated_at: trx.fn.now() });
  }

  async softDeleteServiceRecord(trx: Knex.Transaction, id: number, deletedBy?: number): Promise<void> {
    await trx("asset_service_records")
      .where({ id })
      .update({ deleted_at: trx.fn.now(), updated_by: deletedBy ?? null });
  }

  // ── Odometer readings ──────────────────────────────────────────────────────

  async findOdometerReadings(
    assetId: number,
    options: OdometerReadingListQueryParams
  ): Promise<{ data: OdometerReadingListRow[]; total: number }> {
    const query = this.db("asset_odometer_readings as o")
      .leftJoin("employees as e", "e.id", "o.employee_id")
      .leftJoin("admins as cb", "cb.id", "o.created_by")
      .where("o.asset_id", assetId)
      .select("o.*", "e.emp_name as employee_name", "cb.name as created_by_name")
      .orderBy("o.reading_date", options.order)
      .orderBy("o.id", options.order);
    return paginateQuery<OdometerReadingListRow>(query, options);
  }

  async findOdometerReading(assetId: number, readingId: number, db: Db = this.db): Promise<OdometerReadingRow | undefined> {
    return db("asset_odometer_readings").where({ id: readingId, asset_id: assetId }).first();
  }

  async findOdometerReadingForServiceRecord(serviceRecordId: number, db: Db = this.db): Promise<OdometerReadingRow | undefined> {
    return db("asset_odometer_readings").where({ service_record_id: serviceRecordId }).first();
  }

  /** The newest reading, by date and then entry order. */
  async latestOdometer(assetId: number, db: Db = this.db): Promise<OdometerReadingRow | undefined> {
    return db("asset_odometer_readings")
      .where({ asset_id: assetId })
      .orderBy("reading_date", "desc")
      .orderBy("id", "desc")
      .first();
  }

  /** Highest reading on or before `date`, and lowest reading after it (ignoring `exceptId`). */
  async odometerNeighbours(
    assetId: number,
    date: string,
    exceptId: number | null,
    db: Db = this.db
  ): Promise<{ before: OdometerReadingRow | undefined; after: OdometerReadingRow | undefined }> {
    const base = () => {
      const q = db("asset_odometer_readings").where({ asset_id: assetId });
      return exceptId ? q.whereNot("id", exceptId) : q;
    };
    const [before, after] = await Promise.all([
      base().where("reading_date", "<=", date).orderBy("reading_km", "desc").first(),
      base().where("reading_date", ">", date).orderBy("reading_km", "asc").first(),
    ]);
    return { before, after };
  }

  async insertOdometerReading(db: Db, row: Omit<OdometerReadingRow, "id" | "created_at">): Promise<number> {
    const [id] = await db("asset_odometer_readings").insert(row);
    return id as number;
  }

  async deleteOdometerReading(db: Db, id: number): Promise<void> {
    await db("asset_odometer_readings").where({ id }).del();
  }

  // ── Vehicle expenses ───────────────────────────────────────────────────────

  /** Service type a claim category creates: the sub-sub category's wins over the sub category's. */
  async findServiceTypeForCategory(
    subCategoryId: number,
    subSubCategoryId: number | null,
    db: Db = this.db
  ): Promise<ServiceTypeRow | undefined> {
    const row = (await db("sub_categories as s")
      .leftJoin("sub_sub_categories as ss", function () {
        this.on("ss.sub_category_id", "=", "s.id").andOn("ss.id", "=", db.raw("?", [subSubCategoryId ?? 0]));
      })
      .where("s.id", subCategoryId)
      .first(db.raw("COALESCE(ss.service_type_id, s.service_type_id) AS service_type_id"))) as
      | { service_type_id: number | null }
      | undefined;
    if (!row?.service_type_id) return undefined;
    return this.findServiceTypeById(row.service_type_id, db);
  }

  /** Was this vehicle with the employee on that date? */
  async wasAssignedOn(assetId: number, employeeId: number, date: string): Promise<boolean> {
    const row = await this.db("asset_assignments")
      .where({ asset_id: assetId, employee_id: employeeId })
      .where("assigned_date", "<=", date)
      .where((q) => q.whereNull("returned_date").orWhere("returned_date", ">=", date))
      .first("id");
    return Boolean(row);
  }

  async findServiceRecordIdForExpense(trx: Knex.Transaction, expenseId: number): Promise<number | undefined> {
    const row = await trx("asset_service_records").where({ expense_id: expenseId }).first("id");
    return row?.id as number | undefined;
  }

  /** Records made from a claim are derived data: removed outright (their reading cascades). */
  async deleteExpenseLinks(trx: Knex.Transaction, expenseId: number): Promise<void> {
    await trx("asset_odometer_readings").where({ expense_id: expenseId }).del();
    await trx("asset_service_records").where({ expense_id: expenseId }).del();
  }

  private vehicleExpenseQuery(assetId: number): Knex.QueryBuilder {
    return this.db("expenses as x")
      .join("categories as c", "c.id", "x.category_id")
      .join("sub_categories as s", "s.id", "x.sub_category_id")
      .leftJoin("sub_sub_categories as ss", "ss.id", "x.sub_sub_category_id")
      .leftJoin("employees as e", "e.id", "x.employee_id")
      .leftJoin("asset_service_records as r", "r.expense_id", "x.id")
      .leftJoin("asset_service_types as t", "t.id", "r.service_type_id")
      .where("x.asset_id", assetId)
      .whereNull("x.deleted_at");
  }

  async findVehicleExpenses(
    assetId: number,
    options: VehicleExpenseListQueryParams
  ): Promise<{ data: VehicleExpenseRow[]; total: number }> {
    let query = this.vehicleExpenseQuery(assetId).select(
      "x.id",
      "x.date",
      "x.amount",
      "x.description",
      "x.odometer_km",
      "x.employee_status",
      "x.admin_status",
      "x.support_file",
      "x.employee_id",
      "e.emp_name as employee_name",
      "c.name as category_name",
      "s.name as sub_category_name",
      "ss.name as sub_sub_category_name",
      "r.id as service_record_id",
      "t.name as service_type_name"
    );
    if (options.stage) query = applyExpenseStage(query, options.stage);
    if (options.dateFrom) query = query.where("x.date", ">=", options.dateFrom);
    if (options.dateTo) query = query.where("x.date", "<=", options.dateTo);
    query = query.orderBy("x.date", options.order).orderBy("x.id", options.order);
    return paginateQuery<VehicleExpenseRow>(query, options);
  }

  /** Spend by period and category (approved or paid claims only), km driven and pending claims. */
  async vehicleExpenseSummary(assetId: number, monthStart: string, yearStart: string): Promise<VehicleExpenseSummaryRows> {
    const counted = () => applyExpenseStage(this.vehicleExpenseQuery(assetId), "counted");
    const sum = (q: Knex.QueryBuilder) =>
      q.first(this.db.raw("COUNT(*) AS count"), this.db.raw("COALESCE(SUM(x.amount), 0) AS amount")) as Promise<
        { count: number | string; amount: number | string } | undefined
      >;
    const [total, year, month, pending, byCategory, manualServices, yearKm] = await Promise.all([
      sum(counted()),
      sum(counted().where("x.date", ">=", yearStart)),
      sum(counted().where("x.date", ">=", monthStart)),
      sum(applyExpenseStage(this.vehicleExpenseQuery(assetId), "pending")),
      counted()
        .where("x.date", ">=", yearStart)
        .groupBy("c.id", "c.name")
        .select("c.name as category_name", this.db.raw("COUNT(*) AS count"), this.db.raw("SUM(x.amount) AS amount"))
        .orderBy("amount", "desc") as Promise<Array<{ category_name: string; count: number | string; amount: number | string }>>,
      this.db("asset_service_records")
        .where({ asset_id: assetId })
        .whereNull("deleted_at")
        .whereNull("expense_id")
        .where("start_date", ">=", yearStart)
        .first(this.db.raw("COALESCE(SUM(cost), 0) AS amount")) as Promise<{ amount: number | string } | undefined>,
      this.db("asset_odometer_readings")
        .where({ asset_id: assetId })
        .first(
          this.db.raw("MAX(CASE WHEN reading_date >= ? THEN reading_km END) AS year_max", [yearStart]),
          this.db.raw("MAX(CASE WHEN reading_date < ? THEN reading_km END) AS before_max", [yearStart]),
          this.db.raw("MIN(CASE WHEN reading_date >= ? THEN reading_km END) AS year_min", [yearStart])
        ) as Promise<{ year_max: number | null; before_max: number | null; year_min: number | null } | undefined>,
    ]);
    return { total, year, month, pending, byCategory, manualServices, yearKm };
  }

  async clearAssignmentOdometer(db: Db, assignmentId: number, column: "odometer_out" | "odometer_in"): Promise<void> {
    await db("asset_assignments").where({ id: assignmentId }).update({ [column]: null, updated_at: db.fn.now() });
  }
}

export const assetMaintenanceRepository = new AssetMaintenanceRepository();
