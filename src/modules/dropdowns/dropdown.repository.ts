import type { Knex } from "knex";
import { db as knex } from "../../database/knex";
import { applySoftDelete } from "../../shared/utils/query-builder";
import type {
  DropdownOption,
  SubCategoryDropdownQuery,
  SubSubCategoryDropdownQuery,
  WhomDropdownOption,
} from "./dropdown.types";

class DropdownRepository {
  private readonly db: Knex = knex;

  async findActiveCategories(): Promise<DropdownOption[]> {
    return applySoftDelete(this.db("categories"))
      .where({ status: "active" })
      .select("id", "name")
      .orderBy("name", "asc") as Promise<DropdownOption[]>;
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

  async findWhomEmployees(): Promise<WhomDropdownOption[]> {
    const rows = await applySoftDelete(this.db("employees"))
      .whereNotNull("created_by")
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
