import type { Knex } from "knex";
import {
  DefaultRolePermissions,
  FinancePermissions,
} from "../../shared/constants/permissions";
import { Roles } from "../../shared/constants/roles";

/**
 * Register the finance permissions in existing databases. Only adds rows —
 * unlike the 01_roles_permissions seed, which wipes data before re-creating it.
 */
export async function up(knex: Knex): Promise<void> {
  const existing = new Set(
    (await knex("permissions").whereIn("name", FinancePermissions).select("name")).map(
      (row: { name: string }) => row.name
    )
  );
  const missing = FinancePermissions.filter((name) => !existing.has(name));
  if (missing.length > 0) {
    await knex("permissions").insert(
      missing.map((name) => ({ name, description: `Permission: ${name}` }))
    );
  }

  const permissionIds = new Map(
    (await knex("permissions").whereIn("name", FinancePermissions).select("id", "name")).map(
      (row: { id: number; name: string }) => [row.name, row.id]
    )
  );

  for (const roleName of [Roles.SUPER_ADMIN, Roles.ADMIN]) {
    const role = await knex("roles").where({ name: roleName }).first("id");
    if (!role) continue;
    const granted = (DefaultRolePermissions[roleName] ?? []).filter((p) =>
      (FinancePermissions as readonly string[]).includes(p)
    );
    for (const name of granted) {
      const permissionId = permissionIds.get(name);
      if (!permissionId) continue;
      const already = await knex("role_permissions")
        .where({ role_id: role.id, permission_id: permissionId })
        .first("id");
      if (!already) {
        await knex("role_permissions").insert({ role_id: role.id, permission_id: permissionId });
      }
    }
  }
}

export async function down(knex: Knex): Promise<void> {
  const ids = (await knex("permissions").whereIn("name", FinancePermissions).select("id")).map(
    (row: { id: number }) => row.id
  );
  if (ids.length > 0) {
    await knex("role_permissions").whereIn("permission_id", ids).del();
    await knex("permissions").whereIn("id", ids).del();
  }
}
