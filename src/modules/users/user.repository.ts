import type { Knex } from "knex";
import { BaseRepository } from "../../shared/repositories/base.repository";
import {
  applyListQuery,
  paginateQuery,
  type ListQueryOptions,
} from "../../shared/utils/query-builder";
import type { UpdateUserInput, UserRow } from "./user.types";

interface UserWithRole extends UserRow {
  role_name: string;
}

class UserRepository extends BaseRepository<UserRow> {
  constructor() {
    super("users");
  }

  private userWithRoleQuery(trx?: Knex.Transaction): Knex.QueryBuilder {
    const query = trx
      ? trx("users as u")
      : this.db("users as u");
    return query
      .join("roles as r", "r.id", "u.role_id")
      .whereNull("u.deleted_at")
      .whereNull("r.deleted_at")
      .select(
        "u.*",
        "r.name as role_name"
      );
  }

  async findByEmail(email: string): Promise<UserWithRole | undefined> {
    return this.userWithRoleQuery()
      .where("u.email", email.toLowerCase())
      .first() as Promise<UserWithRole | undefined>;
  }

  async findByIdWithRole(id: number): Promise<UserWithRole | undefined> {
    return this.userWithRoleQuery()
      .where("u.id", id)
      .first() as Promise<UserWithRole | undefined>;
  }

  async create(
    data: {
      name: string;
      email: string;
      password_hash: string;
      role_id: number;
      status: string;
      created_by?: number;
    },
    trx?: Knex.Transaction
  ): Promise<number> {
    const query = trx ? trx(this.tableName) : this.db(this.tableName);
    const [id] = await query.insert({
      ...data,
      email: data.email.toLowerCase(),
      created_at: this.db.fn.now(),
      updated_at: this.db.fn.now(),
    });
    return id as number;
  }

  async updateById(
    id: number,
    data: Partial<UpdateUserInput & { password_hash?: string; role_id?: number }>,
    updatedBy?: number,
    trx?: Knex.Transaction
  ): Promise<number> {
    const updateData: Record<string, unknown> = {
      updated_at: this.db.fn.now(),
    };

    if (data.name !== undefined) updateData.name = data.name;
    if (data.email !== undefined) updateData.email = data.email.toLowerCase();
    if (data.password_hash !== undefined)
      updateData.password_hash = data.password_hash;
    if (data.roleId !== undefined) updateData.role_id = data.roleId;
    if (data.status !== undefined) updateData.status = data.status;
    if (updatedBy !== undefined) updateData.updated_by = updatedBy;

    const query = trx ? trx(this.tableName) : this.db(this.tableName);
    return query.where({ id }).whereNull("deleted_at").update(updateData);
  }

  async findAllPaginated(
    options: ListQueryOptions
  ): Promise<{ data: UserWithRole[]; total: number }> {
    let query = this.userWithRoleQuery();
    query = applyListQuery(query, options, {
      table: "users",
      alias: "u",
      searchableFields: ["u.name", "u.email"],
      sortableFields: ["u.created_at", "u.name", "u.email", "u.status"],
      defaultSort: "u.created_at",
    });

    return paginateQuery<UserWithRole>(query, options);
  }
}

export const userRepository = new UserRepository();
