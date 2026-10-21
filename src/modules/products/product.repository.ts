import type { Knex } from "knex";
import { BaseRepository } from "../../shared/repositories/base.repository";
import { filsToDecimalString, toFils } from "../../shared/utils/money.util";
import { applyListQuery, paginateQuery } from "../../shared/utils/query-builder";
import type { CreateProductInput, ProductListQuery, ProductRow, UpdateProductInput } from "./product.types";

class ProductRepository extends BaseRepository<ProductRow> {
  constructor() {
    super("products");
  }

  /** No soft delete on products. */
  protected override baseQuery(trx?: Knex.Transaction): Knex.QueryBuilder {
    return trx ? trx(this.tableName) : this.db(this.tableName);
  }

  async findAllPaginated(options: ProductListQuery): Promise<{ data: ProductRow[]; total: number }> {
    const query = applyListQuery(this.baseQuery(), options, {
      table: "products",
      searchableFields: ["name", "code", "description"],
      sortableFields: ["created_at", "name", "code", "unit_price", "status"],
      defaultSort: "name",
      softDelete: false,
    });
    return paginateQuery<ProductRow>(query, options);
  }

  async findActive(): Promise<ProductRow[]> {
    return this.baseQuery().where({ status: "active" }).orderBy("name", "asc") as Promise<ProductRow[]>;
  }

  async findByIds(ids: number[], trx?: Knex.Transaction): Promise<ProductRow[]> {
    if (ids.length === 0) return [];
    return this.baseQuery(trx).whereIn("id", ids) as Promise<ProductRow[]>;
  }

  async findByName(name: string): Promise<ProductRow | undefined> {
    return this.baseQuery().whereRaw("LOWER(name) = ?", [name.toLowerCase()]).first() as Promise<ProductRow | undefined>;
  }

  async findByCode(code: string): Promise<ProductRow | undefined> {
    return this.baseQuery().whereRaw("LOWER(code) = ?", [code.toLowerCase()]).first() as Promise<ProductRow | undefined>;
  }

  async create(input: CreateProductInput, createdBy?: number): Promise<number> {
    const [id] = await this.db(this.tableName).insert({
      code: input.code ?? null,
      name: input.name,
      unit: input.unit,
      unit_price: filsToDecimalString(toFils(input.unitPrice)),
      description: input.description ?? null,
      status: input.status ?? "active",
      created_by: createdBy ?? null,
      updated_by: createdBy ?? null,
      created_at: this.db.fn.now(),
      updated_at: this.db.fn.now(),
    });
    return id as number;
  }

  async updateById(id: number, input: UpdateProductInput, updatedBy?: number): Promise<void> {
    const data: Record<string, unknown> = { updated_at: this.db.fn.now() };
    if (input.code !== undefined) data.code = input.code;
    if (input.name !== undefined) data.name = input.name;
    if (input.unit !== undefined) data.unit = input.unit;
    if (input.unitPrice !== undefined) data.unit_price = filsToDecimalString(toFils(input.unitPrice));
    if (input.description !== undefined) data.description = input.description;
    if (input.status !== undefined) data.status = input.status;
    if (updatedBy !== undefined) data.updated_by = updatedBy;
    await this.baseQuery().where({ id }).update(data);
  }
}

export const productRepository = new ProductRepository();
