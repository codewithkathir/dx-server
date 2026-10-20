import type { Knex } from "knex";
import { BaseRepository } from "../../shared/repositories/base.repository";
import {
  applyListQuery,
  paginateQuery,
} from "../../shared/utils/query-builder";
import type {
  CategoryListQuery,
  CategoryRow,
  CreateCategoryInput,
  UpdateCategoryInput,
} from "./category.types";

class CategoryRepository extends BaseRepository<CategoryRow> {
  constructor() {
    super("categories");
  }

  private buildListQuery(options: CategoryListQuery): Knex.QueryBuilder {
    const subCategoryCount = this.db("sub_categories as s")
      .count("*")
      .whereRaw("s.category_id = categories.id")
      .whereNull("s.deleted_at")
      .as("sub_category_count");
    return applyListQuery(this.baseQuery().select("categories.*", subCategoryCount), options, {
      table: "categories",
      searchableFields: ["name", "description"],
      sortableFields: ["created_at", "name", "status"],
      defaultSort: "created_at",
    });
  }

  async findByName(name: string): Promise<CategoryRow | undefined> {
    return this.baseQuery()
      .whereRaw("LOWER(name) = ?", [name.toLowerCase()])
      .first() as Promise<CategoryRow | undefined>;
  }

  async findAllPaginated(
    options: CategoryListQuery
  ): Promise<{ data: CategoryRow[]; total: number }> {
    return paginateQuery<CategoryRow>(this.buildListQuery(options), options);
  }

  /** id → name for a page of rows (includes inactive and deleted, so a label is always found). */
  async findNames(ids: number[]): Promise<Map<number, string>> {
    if (ids.length === 0) return new Map();
    const rows = (await this.db(this.tableName).whereIn("id", [...new Set(ids)]).select("id", "name")) as Array<{
      id: number;
      name: string;
    }>;
    return new Map(rows.map((r) => [r.id, r.name]));
  }

  async create(
    input: CreateCategoryInput,
    createdBy?: number
  ): Promise<number> {
    const [id] = await this.db(this.tableName).insert({
      name: input.name,
      description: input.description ?? null,
      status: input.status ?? "active",
      is_vehicle_expense: input.isVehicleExpense ?? false,
      created_by: createdBy ?? null,
      updated_by: createdBy ?? null,
      created_at: this.db.fn.now(),
      updated_at: this.db.fn.now(),
    });
    return id as number;
  }

  async updateById(
    id: number,
    input: UpdateCategoryInput,
    updatedBy?: number
  ): Promise<number> {
    const data: Record<string, unknown> = { updated_at: this.db.fn.now() };
    if (input.name !== undefined) data.name = input.name;
    if (input.description !== undefined) data.description = input.description;
    if (input.status !== undefined) data.status = input.status;
    if (input.isVehicleExpense !== undefined) data.is_vehicle_expense = input.isVehicleExpense;
    if (updatedBy !== undefined) data.updated_by = updatedBy;

    return this.baseQuery().where({ id }).update(data);
  }
}

export const categoryRepository = new CategoryRepository();
