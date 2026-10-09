import type { Knex } from "knex";
import { BaseRepository } from "../../shared/repositories/base.repository";
import { applyListQuery, paginateQuery } from "../../shared/utils/query-builder";
import { partyInputToRow } from "../../shared/validators/party.validation";

/** Party columns plus the customer-only tax and credit fields. */
function customerInputToRow(input: Record<string, unknown>): Record<string, unknown> {
  const row = partyInputToRow(input);
  if (input.trn !== undefined) row.trn = input.trn;
  if (input.creditLimit !== undefined) row.credit_limit = input.creditLimit;
  if (input.paymentTerms !== undefined) row.payment_terms = input.paymentTerms;
  return row;
}
import type {
  CreateCustomerInput,
  CustomerListQuery,
  CustomerOption,
  CustomerRow,
  UpdateCustomerInput,
} from "./customer.types";

class CustomerRepository extends BaseRepository<CustomerRow> {
  constructor() {
    super("customers");
  }

  private buildListQuery(options: CustomerListQuery): Knex.QueryBuilder {
    return applyListQuery(this.baseQuery(), options, {
      table: "customers",
      searchableFields: ["company_name", "contact_name_1", "email", "phone_1", "trn"],
      sortableFields: ["created_at", "company_name", "status"],
      defaultSort: "created_at",
    });
  }

  async findAllPaginated(
    options: CustomerListQuery
  ): Promise<{ data: CustomerRow[]; total: number }> {
    return paginateQuery<CustomerRow>(this.buildListQuery(options), options);
  }

  async findByCompanyName(name: string): Promise<CustomerRow | undefined> {
    return this.baseQuery()
      .whereRaw("LOWER(company_name) = ?", [name.toLowerCase()])
      .first() as Promise<CustomerRow | undefined>;
  }

  async findActiveOptions(): Promise<CustomerOption[]> {
    const rows = await this.baseQuery()
      .where({ status: "active" })
      .orderBy("company_name", "asc")
      .select("id", "company_name");
    return rows.map((row: { id: number; company_name: string }) => ({
      id: row.id,
      companyName: row.company_name,
    }));
  }

  async hasInvoices(id: number): Promise<boolean> {
    const row = await this.db("receivable_invoices")
      .where({ customer_id: id })
      .whereNull("deleted_at")
      .first("id");
    return Boolean(row);
  }

  async create(input: CreateCustomerInput, createdBy?: number): Promise<number> {
    const [id] = await this.db(this.tableName).insert({
      ...customerInputToRow(input),
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
    input: UpdateCustomerInput,
    updatedBy?: number
  ): Promise<number> {
    return this.baseQuery()
      .where({ id })
      .update({
        ...customerInputToRow(input),
        updated_at: this.db.fn.now(),
        ...(updatedBy !== undefined ? { updated_by: updatedBy } : {}),
      });
  }
}

export const customerRepository = new CustomerRepository();
