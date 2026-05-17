import { BaseRepository } from "../../shared/repositories/base.repository";
import type { RoleName } from "../../shared/constants/roles";
import type { RoleRow } from "./role.types";

class RoleRepository extends BaseRepository<RoleRow> {
  constructor() {
    super("roles");
  }

  async findByName(name: string): Promise<RoleRow | undefined> {
    return this.baseQuery().where({ name }).first() as Promise<
      RoleRow | undefined
    >;
  }

  async getPermissionsByRoleName(roleName: RoleName): Promise<string[]> {
    const rows = await this.db("role_permissions as rp")
      .join("roles as r", "r.id", "rp.role_id")
      .join("permissions as p", "p.id", "rp.permission_id")
      .where("r.name", roleName)
      .whereNull("r.deleted_at")
      .whereNull("p.deleted_at")
      .whereNull("rp.deleted_at")
      .select("p.name");

    return rows.map((row: { name: string }) => row.name);
  }

  async findAll(): Promise<RoleRow[]> {
    return this.baseQuery().orderBy("name", "asc") as Promise<RoleRow[]>;
  }
}

export const roleRepository = new RoleRepository();
