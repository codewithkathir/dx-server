import type { Knex } from "knex";
import { Permissions } from "../../shared/constants/permissions";

/**
 * Finance forms load the payment-method and category dropdowns, which need
 * these read permissions. Databases seeded before 01_roles_permissions used
 * DefaultRolePermissions lack them for ADMIN, so recording a payment or
 * receipt failed with 403. Grant them to every role that can settle or create
 * finance documents. Only adds rows.
 */
const LOOKUP_PERMISSIONS = [Permissions.PAYMENT_METHOD_READ, Permissions.CATEGORY_READ];
const FINANCE_PERMISSIONS = [
  Permissions.PAYABLE_PAY,
  Permissions.PAYABLE_CREATE,
  Permissions.RECEIVABLE_RECEIVE,
  Permissions.RECEIVABLE_CREATE,
];

export async function up(knex: Knex): Promise<void> {
  const lookupIds = (await knex("permissions")
    .whereIn("name", LOOKUP_PERMISSIONS)
    .whereNull("deleted_at")
    .pluck("id")) as number[];

  const roleIds = (await knex("role_permissions as rp")
    .join("permissions as p", "p.id", "rp.permission_id")
    .whereIn("p.name", FINANCE_PERMISSIONS)
    .whereNull("rp.deleted_at")
    .distinct("rp.role_id")
    .pluck("rp.role_id")) as number[];

  for (const roleId of roleIds) {
    for (const permissionId of lookupIds) {
      const exists = await knex("role_permissions")
        .where({ role_id: roleId, permission_id: permissionId })
        .first("id");
      if (!exists) {
        await knex("role_permissions").insert({ role_id: roleId, permission_id: permissionId });
      }
    }
  }
}

export async function down(): Promise<void> {
  // Not reverted: these grants may also have come from the default seed.
}
