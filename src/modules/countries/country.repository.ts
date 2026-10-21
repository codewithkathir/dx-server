import type { Knex } from "knex";
import { BaseRepository } from "../../shared/repositories/base.repository";
import type { CountryRow } from "./country.types";

/** Countries are never deleted (no `deleted_at`); `status` hides them from the dropdown. */
class CountryRepository extends BaseRepository<CountryRow> {
  constructor() {
    super("countries");
  }

  protected override baseQuery(trx?: Knex.Transaction): Knex.QueryBuilder {
    return trx ? trx(this.tableName) : this.db(this.tableName);
  }

  async findByCode(code: string): Promise<CountryRow | undefined> {
    return this.baseQuery().where({ code: code.toUpperCase() }).first() as Promise<CountryRow | undefined>;
  }

  async findActive(): Promise<CountryRow[]> {
    return this.baseQuery().where({ status: "active" }).orderBy("name", "asc") as Promise<CountryRow[]>;
  }
}

export const countryRepository = new CountryRepository();
