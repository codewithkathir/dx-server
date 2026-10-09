import type { Knex } from "knex";
import { BaseRepository } from "../../shared/repositories/base.repository";
import { applyListQuery, paginateQuery } from "../../shared/utils/query-builder";
import { partyInputToRow } from "../../shared/validators/party.validation";
import type {
  CreateSupplierInput,
  SupplierListQuery,
  SupplierOption,
  SupplierRow,
  UpdateSupplierInput,
} from "./supplier.types";

class SupplierRepository extends BaseRepository<SupplierRow> {
  constructor() {
    super("suppliers");
  }

  private buildListQuery(options: SupplierListQuery): Knex.QueryBuilder {
    return applyListQuery(this.baseQuery(), options, {
      table: "suppliers",
      searchableFields: ["company_name", "contact_name_1", "email", "phone_1"],
      sortableFields: ["created_at", "company_name", "status"],
      defaultSort: "created_at",
    });
  }

  async findAllPaginated(
    options: SupplierListQuery
  ): Promise<{ data: SupplierRow[]; total: number }> {
    return paginateQuery<SupplierRow>(this.buildListQuery(options), options);
  }

  async findByCompanyName(name: string): Promise<SupplierRow | undefined> {
    return this.baseQuery()
      .whereRaw("LOWER(company_name) = ?", [name.toLowerCase()])
      .first() as Promise<SupplierRow | undefined>;
  }

  async findActiveOptions(): Promise<SupplierOption[]> {
    const rows = await this.baseQuery()
      .where({ status: "active" })
      .orderBy("company_name", "asc")
      .select("id", "company_name");
    return rows.map((row: { id: number; company_name: string }) => ({
      id: row.id,
      companyName: row.company_name,
    }));
  }

  async hasBills(id: number): Promise<boolean> {
    const row = await this.db("payable_bills")
      .where({ supplier_id: id })
      .whereNull("deleted_at")
      .first("id");
    return Boolean(row);
  }

  async create(input: CreateSupplierInput, createdBy?: number): Promise<number> {
    const [id] = await this.db(this.tableName).insert({
      ...partyInputToRow(input),
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
    input: UpdateSupplierInput,
    updatedBy?: number
  ): Promise<number> {
    return this.baseQuery()
      .where({ id })
      .update({
        ...partyInputToRow(input),
        updated_at: this.db.fn.now(),
        ...(updatedBy !== undefined ? { updated_by: updatedBy } : {}),
      });
  }
}

export const supplierRepository = new SupplierRepository();
