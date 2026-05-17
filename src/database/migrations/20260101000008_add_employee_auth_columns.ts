import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable("employees", (table) => {
    table.string("reset_token_hash", 255).nullable();
    table.timestamp("reset_token_expiry").nullable();
    table.string("refresh_token_hash", 255).nullable();
    table.timestamp("refresh_token_expiry").nullable();

    table.index(["reset_token_hash"]);
    table.index(["refresh_token_hash"]);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable("employees", (table) => {
    table.dropIndex(["reset_token_hash"]);
    table.dropIndex(["refresh_token_hash"]);
    table.dropColumn("reset_token_hash");
    table.dropColumn("reset_token_expiry");
    table.dropColumn("refresh_token_hash");
    table.dropColumn("refresh_token_expiry");
  });
}
