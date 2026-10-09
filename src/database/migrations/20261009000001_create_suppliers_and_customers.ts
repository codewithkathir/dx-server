import type { Knex } from "knex";

/** Same columns as the dx_app design; customers add tax and credit fields. */
function partyColumns(table: Knex.CreateTableBuilder): void {
  table.increments("id").primary();
  table.string("company_name", 200).notNullable();
  table.string("contact_name_1", 150).nullable();
  table.string("contact_name_2", 150).nullable();
  table.text("company_address").nullable();
  table.string("city_state", 150).nullable();
  table.string("country", 100).nullable();
  table.string("phone_1", 30).nullable();
  table.string("phone_2", 30).nullable();
  table.string("email", 255).nullable();
  table.string("whatsapp_no", 30).nullable();
}

function auditColumns(knex: Knex, table: Knex.CreateTableBuilder): void {
  table.enum("status", ["active", "inactive"]).notNullable().defaultTo("active");
  table.text("comments").nullable();
  table.timestamp("created_at").defaultTo(knex.fn.now());
  table.timestamp("updated_at").defaultTo(knex.fn.now());
  table.timestamp("deleted_at").nullable();
  table.integer("created_by").unsigned().nullable();
  table.integer("updated_by").unsigned().nullable();
  table.index(["company_name"]);
  table.index(["status"]);
  table.index(["deleted_at"]);
  table.index(["created_at"]);
}

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable("suppliers", (table) => {
    partyColumns(table);
    auditColumns(knex, table);
  });

  await knex.schema.createTable("customers", (table) => {
    partyColumns(table);
    table.string("trn", 50).nullable();
    table.decimal("credit_limit", 12, 2).nullable();
    table.string("payment_terms", 100).nullable();
    auditColumns(knex, table);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists("customers");
  await knex.schema.dropTableIfExists("suppliers");
}
