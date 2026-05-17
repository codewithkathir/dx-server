import type { Knex } from "knex";
import { BaseRepository } from "../../shared/repositories/base.repository";
import {
  applyListQuery,
  paginateQuery,
} from "../../shared/utils/query-builder";
import type {
  CreatePaymentMethodInput,
  PaymentMethodListQuery,
  PaymentMethodRow,
  UpdatePaymentMethodInput,
} from "./payment-method.types";

class PaymentMethodRepository extends BaseRepository<PaymentMethodRow> {
  constructor() {
    super("payment_methods");
  }

  private buildListQuery(options: PaymentMethodListQuery): Knex.QueryBuilder {
    return applyListQuery(this.baseQuery(), options, {
      table: "payment_methods",
      searchableFields: ["name", "code", "description"],
      sortableFields: ["created_at", "name", "status", "sort_order", "code"],
      defaultSort: "sort_order",
    });
  }

  async findByCode(code: string): Promise<PaymentMethodRow | undefined> {
    return this.baseQuery()
      .whereRaw("LOWER(code) = ?", [code.toLowerCase()])
      .first() as Promise<PaymentMethodRow | undefined>;
  }

  async findByName(name: string): Promise<PaymentMethodRow | undefined> {
    return this.baseQuery()
      .whereRaw("LOWER(name) = ?", [name.toLowerCase()])
      .first() as Promise<PaymentMethodRow | undefined>;
  }

  async findAllPaginated(
    options: PaymentMethodListQuery
  ): Promise<{ data: PaymentMethodRow[]; total: number }> {
    return paginateQuery<PaymentMethodRow>(
      this.buildListQuery(options),
      options
    );
  }

  async create(
    input: CreatePaymentMethodInput,
    createdBy?: number
  ): Promise<number> {
    const [id] = await this.db(this.tableName).insert({
      name: input.name,
      code: input.code ?? null,
      description: input.description ?? null,
      status: input.status ?? "active",
      sort_order: input.sortOrder ?? 0,
      created_by: createdBy ?? null,
      updated_by: createdBy ?? null,
      created_at: this.db.fn.now(),
      updated_at: this.db.fn.now(),
    });
    return id as number;
  }

  async updateById(
    id: number,
    input: UpdatePaymentMethodInput,
    updatedBy?: number
  ): Promise<number> {
    const data: Record<string, unknown> = { updated_at: this.db.fn.now() };
    if (input.name !== undefined) data.name = input.name;
    if (input.code !== undefined) data.code = input.code;
    if (input.description !== undefined) data.description = input.description;
    if (input.status !== undefined) data.status = input.status;
    if (input.sortOrder !== undefined) data.sort_order = input.sortOrder;
    if (updatedBy !== undefined) data.updated_by = updatedBy;

    return this.baseQuery().where({ id }).update(data);
  }
}

export const paymentMethodRepository = new PaymentMethodRepository();
