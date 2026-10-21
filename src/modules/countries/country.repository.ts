import { BaseRepository } from "../../shared/repositories/base.repository";
import type { CountryRow } from "./country.types";

class CountryRepository extends BaseRepository<CountryRow> {
  constructor() {
    super("countries");
  }

  async findByCode(code: string): Promise<CountryRow | undefined> {
    return this.baseQuery().where({ code: code.toUpperCase() }).first() as Promise<CountryRow | undefined>;
  }

  async findActive(): Promise<CountryRow[]> {
    return this.baseQuery().where({ status: "active" }).orderBy("name", "asc") as Promise<CountryRow[]>;
  }
}

export const countryRepository = new CountryRepository();
