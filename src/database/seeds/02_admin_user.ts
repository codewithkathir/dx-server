import type { Knex } from "knex";
import bcrypt from "bcrypt";
import { Roles } from "../../shared/constants/roles";

export async function seed(knex: Knex): Promise<void> {
  const superAdminRole = await knex("roles")
    .where({ name: Roles.SUPER_ADMIN })
    .whereNull("deleted_at")
    .first();

  if (!superAdminRole) {
    throw new Error("SUPER_ADMIN role not found. Run roles seed first.");
  }

  const existing = await knex("users")
    .where({ email: "admin@example.com" })
    .whereNull("deleted_at")
    .first();

  if (existing) {
    return;
  }

  const passwordHash = await bcrypt.hash("Admin@12345", 12);

  await knex("users").insert({
    name: "Super Admin",
    email: "admin@example.com",
    password_hash: passwordHash,
    role_id: superAdminRole.id,
    status: "active",
    email_verified: true,
  });
}
