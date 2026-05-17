import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable("admins", (table) => {
    table.string("profile_photo", 500).nullable();
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable("admins", (table) => {
    table.dropColumn("profile_photo");
  });
}
