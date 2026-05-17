import type { Knex } from "knex";
import { BaseRepository } from "../../shared/repositories/base.repository";
import {
  applyListQuery,
  paginateQuery,
} from "../../shared/utils/query-builder";
import type {
  CreateSubCategoryInput,
  SubCategoryListQuery,
  SubCategoryRow,
  UpdateSubCategoryInput,
} from "./sub-category.types";

class SubCategoryRepository extends BaseRepository<SubCategoryRow> {
  constructor() {
    super("sub_categories");
  }

  private applyFilters(
    query: Knex.QueryBuilder,
    options: SubCategoryListQuery
  ): Knex.QueryBuilder {
    if (options.categoryId) {
      query = query.where("category_id", options.categoryId);
    }
    return query;
  }

  private buildListQuery(options: SubCategoryListQuery): Knex.QueryBuilder {
    let query = applyListQuery(this.baseQuery(), options, {
      table: "sub_categories",
      searchableFields: ["name", "description"],
      sortableFields: ["created_at", "name", "status", "category_id"],
      defaultSort: "created_at",
    });
    return this.applyFilters(query, options);
  }

  async findByNameInCategory(
    categoryId: number,
    name: string
  ): Promise<SubCategoryRow | undefined> {
    return this.baseQuery()
      .where({ category_id: categoryId })
      .whereRaw("LOWER(name) = ?", [name.toLowerCase()])
      .first() as Promise<SubCategoryRow | undefined>;
  }

  async findAllPaginated(
    options: SubCategoryListQuery
  ): Promise<{ data: SubCategoryRow[]; total: number }> {
    return paginateQuery<SubCategoryRow>(this.buildListQuery(options), options);
  }

  async create(
    input: CreateSubCategoryInput,
    createdBy?: number
  ): Promise<number> {
    const [id] = await this.db(this.tableName).insert({
      category_id: input.categoryId,
      name: input.name,
      description: input.description ?? null,
      status: input.status ?? "active",
      created_by: createdBy ?? null,
      updated_by: createdBy ?? null,
      created_at: this.db.fn.now(),
      updated_at: this.db.fn.now(),
    });
    return id as number;
  }

  async updateById(
    id: number,
    input: UpdateSubCategoryInput,
    updatedBy?: number
  ): Promise<number> {
    const data: Record<string, unknown> = { updated_at: this.db.fn.now() };
    if (input.categoryId !== undefined) data.category_id = input.categoryId;
    if (input.name !== undefined) data.name = input.name;
    if (input.description !== undefined) data.description = input.description;
    if (input.status !== undefined) data.status = input.status;
    if (updatedBy !== undefined) data.updated_by = updatedBy;

    return this.baseQuery().where({ id }).update(data);
  }
}

export const subCategoryRepository = new SubCategoryRepository();
