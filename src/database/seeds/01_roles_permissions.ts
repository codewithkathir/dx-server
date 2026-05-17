import type { Knex } from "knex";
import { Roles } from "../../shared/constants/roles";
import { Permissions } from "../../shared/constants/permissions";

export async function seed(knex: Knex): Promise<void> {
  await knex("role_permissions").del();
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

  const rolePermissionAssignments: Record<string, string[]> = {
    [Roles.SUPER_ADMIN]: Object.values(Permissions),
    [Roles.ADMIN]: [
      Permissions.USER_CREATE,
      Permissions.USER_READ,
      Permissions.USER_UPDATE,
      Permissions.USER_DELETE,
      Permissions.ROLE_READ,
      Permissions.EMPLOYEE_CREATE,
      Permissions.EMPLOYEE_READ,
      Permissions.EMPLOYEE_UPDATE,
      Permissions.EMPLOYEE_DELETE,
      Permissions.EMPLOYEE_EXPORT,
      Permissions.EMPLOYEE_EXPENSE_READ,
      Permissions.EMPLOYEE_EXPENSE_UPDATE,
      Permissions.EMPLOYEE_EXPENSE_DELETE,
    ],
    [Roles.EDITOR]: [Permissions.USER_READ],
    [Roles.USER]: [],
  };

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
