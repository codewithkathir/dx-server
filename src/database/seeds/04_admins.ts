import type { Knex } from "knex";
import bcrypt from "bcrypt";

export async function seed(knex: Knex): Promise<void> {
  const existing = await knex("admins")
    .where({ email: "admin@example.com" })
    .whereNull("deleted_at")
    .first();

  if (existing) {
    return;
  }

  const passwordHash = await bcrypt.hash("Admin@12345", 12);

  await knex("admins").insert({
    name: "Super Admin",
    email: "admin@example.com",
    password_hash: passwordHash,
    role: "SUPER_ADMIN",
    status: "active",
  });
}
