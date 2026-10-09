import type { Knex } from "knex";
import { Roles } from "../../shared/constants/roles";
import {
  DefaultRolePermissions,
  Permissions,
} from "../../shared/constants/permissions";

export async function seed(knex: Knex): Promise<void> {
  await knex("role_permissions").del();
  await knex("receivable_receipts").del();
  await knex("receivable_invoices").del();
  await knex("payable_payments").del();
  await knex("payable_bills").del();
  await knex("customers").del();
  await knex("suppliers").del();
  await knex("document_sequences").del();
  await knex("expenses").del();
  await knex("sub_sub_categories").del();
  await knex("sub_categories").del();
  await knex("categories").del();
  await knex("payment_methods").del();
  await knex("employees").del();
  await knex("admins").del();
  await knex("users").del();
  await knex("refresh_tokens").del();
  await knex("permissions").del();
  await knex("roles").del();

  const roleRows = [
    { name: Roles.SUPER_ADMIN, description: "Full system access" },
    { name: Roles.ADMIN, description: "Administrative access" },
    { name: Roles.EDITOR, description: "Content editor access" },
    { name: Roles.USER, description: "Standard user access" },
  ];

  await knex("roles").insert(roleRows);

  const permissionRows = Object.values(Permissions).map((name) => ({
    name,
    description: `Permission: ${name}`,
  }));

  await knex("permissions").insert(permissionRows);

  const roles = await knex("roles").select("id", "name");
  const permissions = await knex("permissions").select("id", "name");

  const roleMap = Object.fromEntries(
    roles.map((r: { id: number; name: string }) => [r.name, r.id])
  );
  const permMap = Object.fromEntries(
    permissions.map((p: { id: number; name: string }) => [p.name, p.id])
  );

  // Single source of truth for role → permissions.
  const rolePermissionAssignments: Record<string, readonly string[]> =
    DefaultRolePermissions;

  const rolePermissionRows: Array<{
    role_id: number;
    permission_id: number;
  }> = [];

  for (const [roleName, perms] of Object.entries(rolePermissionAssignments)) {
    for (const perm of perms) {
      rolePermissionRows.push({
        role_id: roleMap[roleName],
        permission_id: permMap[perm],
      });
    }
  }

  if (rolePermissionRows.length > 0) {
    await knex("role_permissions").insert(rolePermissionRows);
  }
}
