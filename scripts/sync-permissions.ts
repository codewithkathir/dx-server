/**
 * Adds permission rows that exist in code (Permissions) but not in the database,
 * and grants each role its DefaultRolePermissions that are missing. Only adds:
 * never removes rows or touches grants an admin changed. Safe to re-run.
 *
 * Usage:
 *   npm run permissions:sync                 # local
 *   APP_ENV=dev npm run permissions:sync     # dev
 */
import knex from "knex";
import knexConfig from "../knexfile";
import { DefaultRolePermissions, Permissions } from "../src/shared/constants/permissions";

async function main(): Promise<void> {
  const db = knex(knexConfig);
  const connection = knexConfig.connection as { host?: string; database?: string };
  try {
    console.log(`Database: ${connection.database} @ ${connection.host}`);
    await db.transaction(async (trx) => {
      const existing = new Set((await trx("permissions").pluck("name")) as string[]);
      const missing = Object.values(Permissions).filter((name) => !existing.has(name));
      if (missing.length) {
        await trx("permissions").insert(missing.map((name) => ({ name, description: `Permission: ${name}` })));
      }
      console.log(missing.length ? `Added permissions: ${missing.join(", ")}` : "Permissions: up to date");

      const permissionIds = new Map(
        ((await trx("permissions").select("id", "name")) as Array<{ id: number; name: string }>).map((p) => [p.name, p.id])
      );
      for (const [roleName, names] of Object.entries(DefaultRolePermissions)) {
        const role = (await trx("roles").where({ name: roleName }).first("id")) as { id: number } | undefined;
        if (!role) continue;
        const granted = new Set((await trx("role_permissions").where({ role_id: role.id }).pluck("permission_id")) as number[]);
        const toGrant = names.map((n) => permissionIds.get(n)).filter((id): id is number => id !== undefined && !granted.has(id));
        if (toGrant.length) {
          await trx("role_permissions").insert(toGrant.map((permission_id) => ({ role_id: role.id, permission_id })));
          console.log(`Granted ${toGrant.length} permission(s) to ${roleName}`);
        }
      }
    });
  } finally {
    await db.destroy();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
