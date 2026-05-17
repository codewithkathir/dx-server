import type { Knex } from "knex";
import { BaseRepository } from "../../shared/repositories/base.repository";
import {
  applyListQuery,
  paginateQuery,
} from "../../shared/utils/query-builder";
import type {
  CreateSubSubCategoryInput,
  SubSubCategoryListQuery,
  SubSubCategoryRow,
  UpdateSubSubCategoryInput,
} from "./sub-sub-category.types";

class SubSubCategoryRepository extends BaseRepository<SubSubCategoryRow> {
  constructor() {
    super("sub_sub_categories");
  }

  private applyFilters(
    query: Knex.QueryBuilder,
    options: SubSubCategoryListQuery
  ): Knex.QueryBuilder {
    if (options.categoryId) {
      query = query.where("category_id", options.categoryId);
    }
    if (options.subCategoryId) {
      query = query.where("sub_category_id", options.subCategoryId);
    }
    return query;
  }

  private buildListQuery(options: SubSubCategoryListQuery): Knex.QueryBuilder {
    let query = applyListQuery(this.baseQuery(), options, {
      table: "sub_sub_categories",
      searchableFields: ["name", "description"],
      sortableFields: [
        "created_at",
        "name",
        "status",
        "category_id",
        "sub_category_id",
      ],
      defaultSort: "created_at",
    });
    return this.applyFilters(query, options);
  }

  async findByNameInHierarchy(
    categoryId: number,
    subCategoryId: number,
    name: string
  ): Promise<SubSubCategoryRow | undefined> {
    return this.baseQuery()
      .where({ category_id: categoryId, sub_category_id: subCategoryId })
      .whereRaw("LOWER(name) = ?", [name.toLowerCase()])
      .first() as Promise<SubSubCategoryRow | undefined>;
  }

  async findAllPaginated(
    options: SubSubCategoryListQuery
  ): Promise<{ data: SubSubCategoryRow[]; total: number }> {
    return paginateQuery<SubSubCategoryRow>(
      this.buildListQuery(options),
      options
    );
  }

  async create(
    input: CreateSubSubCategoryInput,
    createdBy?: number
  ): Promise<number> {
    const [id] = await this.db(this.tableName).insert({
      category_id: input.categoryId,
      sub_category_id: input.subCategoryId,
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
    input: UpdateSubSubCategoryInput,
    updatedBy?: number
  ): Promise<number> {
    const data: Record<string, unknown> = { updated_at: this.db.fn.now() };
    if (input.categoryId !== undefined) data.category_id = input.categoryId;
    if (input.subCategoryId !== undefined)
      data.sub_category_id = input.subCategoryId;
    if (input.name !== undefined) data.name = input.name;
    if (input.description !== undefined) data.description = input.description;
    if (input.status !== undefined) data.status = input.status;
    if (updatedBy !== undefined) data.updated_by = updatedBy;

    return this.baseQuery().where({ id }).update(data);
  }
}

export const subSubCategoryRepository = new SubSubCategoryRepository();
