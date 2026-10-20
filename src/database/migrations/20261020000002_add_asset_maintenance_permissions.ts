import type { Knex } from "knex";

/**
 * Intentionally empty. Migrations change schema only; permission rows are data
 * and are added with `npm run permissions:sync` (or the 01_roles_permissions
 * seed on a fresh database). Kept so databases that already ran it stay in sync.
 */
export async function up(_knex: Knex): Promise<void> {}

export async function down(_knex: Knex): Promise<void> {}
