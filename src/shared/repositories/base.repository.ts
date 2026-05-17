import type { Knex } from "knex";
import { db } from "../../database/knex";
import { applySoftDelete } from "../utils/query-builder";

export abstract class BaseRepository<T> {
  protected readonly tableName: string;
  protected readonly db: Knex;

  constructor(tableName: string, knexInstance: Knex = db) {
    this.tableName = tableName;
    this.db = knexInstance;
  }

  protected baseQuery(trx?: Knex.Transaction): Knex.QueryBuilder {
    const query = trx
      ? trx(this.tableName)
      : this.db(this.tableName);
    return applySoftDelete(query);
  }

  async findById(id: number, trx?: Knex.Transaction): Promise<T | undefined> {
    return this.baseQuery(trx).where({ id }).first() as Promise<T | undefined>;
  }

  async softDelete(
    id: number,
    updatedBy?: number,
    trx?: Knex.Transaction
  ): Promise<number> {
    return this.baseQuery(trx)
      .where({ id })
      .update({
        deleted_at: this.db.fn.now(),
        updated_at: this.db.fn.now(),
        ...(updatedBy !== undefined ? { updated_by: updatedBy } : {}),
      });
  }
}
