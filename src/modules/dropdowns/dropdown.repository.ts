import type { Knex } from "knex";
import { db as knex } from "../../database/knex";
import { applySoftDelete } from "../../shared/utils/query-builder";
import type {
  CategoryDropdownOption,
  DropdownOption,
  VehicleDropdownOption,
  VehicleWorkOption,
  SubCategoryDropdownQuery,
  SubSubCategoryDropdownQuery,
  WhomDropdownOption,
} from "./dropdown.types";

class DropdownRepository {
  private readonly db: Knex = knex;

  async findActiveCategories(): Promise<CategoryDropdownOption[]> {
    const rows = (await applySoftDelete(this.db("categories"))
      .where({ status: "active" })
      .select("id", "name", "is_vehicle_expense")
      .orderBy("name", "asc")) as Array<{ id: number; name: string; is_vehicle_expense: number | boolean }>;
    return rows.map((r) => ({ id: r.id, name: r.name, isVehicleExpense: Boolean(r.is_vehicle_expense) }));
  }

  /** Vehicles; with `employeeId`, only the ones currently assigned to that employee. */
  async findVehicles(employeeId?: number): Promise<VehicleDropdownOption[]> {
    let query = applySoftDelete(this.db("assets"), "assets")
      .where("assets.category", "vehicle")
      .select(
        "assets.id",
        "assets.asset_no",
        "assets.name",
        this.db.raw(
          "(SELECT o.reading_km FROM asset_odometer_readings o WHERE o.asset_id = assets.id ORDER BY o.reading_date DESC, o.id DESC LIMIT 1) AS odometer_km"
        )
      )
      .orderBy("assets.asset_no", "asc");
    if (employeeId) {
      query = query
        .join("asset_assignments as a", "a.asset_id", "assets.id")
        .where("a.employee_id", employeeId)
        .whereNull("a.returned_date");
    }
    const rows = (await query) as Array<{ id: number; asset_no: string; name: string; odometer_km: number | null }>;
    return rows.map((r) => ({ id: r.id, assetNo: r.asset_no, name: r.name, odometerKm: r.odometer_km ?? null }));
  }

  /**
   * Active sub / sub-sub categories of vehicle categories that are mapped to an
   * active service type, in service-type order. A sub-sub mapping is listed as
   * well as its parent's, so the service layer can pick one per type.
   */
  async findVehicleWork(): Promise<VehicleWorkOption[]> {
    const subs = this.db("sub_categories as s")
      .join("categories as c", "c.id", "s.category_id")
      .join("asset_service_types as t", "t.id", "s.service_type_id")
      .whereNull("s.deleted_at")
      .whereNull("c.deleted_at")
      .whereNull("t.deleted_at")
      .where({ "s.status": "active", "c.status": "active", "c.is_vehicle_expense": true, "t.status": "active" })
      .select(
        "t.id as service_type_id",
        "t.name as service_type_name",
        "t.sort_order",
        "c.id as category_id",
        "s.id as sub_category_id",
        this.db.raw("NULL AS sub_sub_category_id"),
        this.db.raw("CONCAT(c.name, ' › ', s.name) AS category_path")
      );
    const subSubs = this.db("sub_sub_categories as ss")
      .join("sub_categories as s", "s.id", "ss.sub_category_id")
      .join("categories as c", "c.id", "s.category_id")
      .join("asset_service_types as t", "t.id", "ss.service_type_id")
      .whereNull("ss.deleted_at")
      .whereNull("s.deleted_at")
      .whereNull("c.deleted_at")
      .whereNull("t.deleted_at")
      .where({ "ss.status": "active", "s.status": "active", "c.status": "active", "c.is_vehicle_expense": true, "t.status": "active" })
      .select(
        "t.id as service_type_id",
        "t.name as service_type_name",
        "t.sort_order",
        "c.id as category_id",
        "s.id as sub_category_id",
        "ss.id as sub_sub_category_id",
        this.db.raw("CONCAT(c.name, ' › ', s.name, ' › ', ss.name) AS category_path")
      );
    const rows = (await this.db
      .select("*")
      .from(subs.unionAll(subSubs, true).as("w"))
      .orderBy([{ column: "sort_order" }, { column: "service_type_name" }, { column: "sub_sub_category_id" }])) as Array<{
      service_type_id: number;
      service_type_name: string;
      category_id: number;
      sub_category_id: number;
      sub_sub_category_id: number | null;
      category_path: string;
    }>;
    return rows.map((r) => ({
      serviceTypeId: r.service_type_id,
      serviceTypeName: r.service_type_name,
      categoryId: r.category_id,
      subCategoryId: r.sub_category_id,
      subSubCategoryId: r.sub_sub_category_id ?? null,
      categoryPath: r.category_path,
    }));
  }

  async findActiveSubCategories(
    query: SubCategoryDropdownQuery
  ): Promise<DropdownOption[]> {
    return applySoftDelete(this.db("sub_categories"))
      .where({ status: "active", category_id: query.categoryId })
      .select("id", "name")
      .orderBy("name", "asc") as Promise<DropdownOption[]>;
  }

  async findActiveSubSubCategories(
    query: SubSubCategoryDropdownQuery
  ): Promise<DropdownOption[]> {
    let qb = applySoftDelete(this.db("sub_sub_categories")).where({
      status: "active",
    });
    if (query.categoryId) {
      qb = qb.where("category_id", query.categoryId);
    }
    if (query.subCategoryId) {
      qb = qb.where("sub_category_id", query.subCategoryId);
    }
    return qb
      .select("id", "name")
      .orderBy("name", "asc") as Promise<DropdownOption[]>;
  }

  async findActivePaymentMethods(): Promise<DropdownOption[]> {
    return applySoftDelete(this.db("payment_methods"))
      .where({ status: "active" })
      .select("id", "name")
      .orderBy("sort_order", "asc")
      .orderBy("name", "asc") as Promise<DropdownOption[]>;
  }

  /** Only active employees: claims can't be saved against inactive ones (see findWhomById). */
  async findWhomEmployees(): Promise<WhomDropdownOption[]> {
    const rows = await applySoftDelete(this.db("employees"))
      .whereNotNull("created_by")
      .where({ status: "active" })
      .select("id", "emp_name", "employee_code", "status")
      .orderBy("emp_name", "asc");

    return rows.map((row) => ({
      id: row.id as number,
      empName: row.emp_name as string,
      employeeCode: (row.employee_code as string | null) ?? null,
      status: row.status as string,
    }));
  }

  async findWhomById(id: number): Promise<WhomDropdownOption | undefined> {
    const row = await applySoftDelete(this.db("employees"))
      .whereNotNull("created_by")
      .where({ id, status: "active" })
      .select("id", "emp_name", "employee_code", "status")
      .first();

    if (!row) {
      return undefined;
    }

    return {
      id: row.id as number,
      empName: row.emp_name as string,
      employeeCode: (row.employee_code as string | null) ?? null,
      status: row.status as string,
    };
  }
}

export const dropdownRepository = new DropdownRepository();
