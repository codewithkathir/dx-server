import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable("employees", (table) => {
    table.increments("id").primary();
    table.string("emp_name", 150).notNullable();
    table.string("company_name", 200).notNullable();
    table.date("dob").notNullable();
    table.text("home_address").notNullable();
    table.string("city_state", 150).notNullable();
    table.string("country", 100).notNullable();
    table.string("phone_no", 30).notNullable();
    table.string("whatsapp_no", 30).nullable();
    table.string("emirates_id_no", 50).notNullable();
    table.date("emirates_id_expiry_date").notNullable();
    table.date("visa_expiry_date").notNullable();
    table.string("passport_no", 50).notNullable();
    table.date("passport_expiry_date").notNullable();
    table.string("driving_license_no", 50).nullable();
    table.date("driving_license_expiry_date").nullable();
    table.string("email", 255).notNullable().unique();
    table.string("password_hash", 255).notNullable();
    table
      .enum("status", ["active", "inactive", "suspended"])
      .notNullable()
      .defaultTo("active");
    table.text("comments").nullable();
    table.string("role", 50).notNullable().defaultTo("employee");
    table.timestamp("last_login_at").nullable();
    table.timestamp("created_at").defaultTo(knex.fn.now());
    table.timestamp("updated_at").defaultTo(knex.fn.now());
    table.timestamp("deleted_at").nullable();
    table.integer("created_by").unsigned().nullable();
    table.integer("updated_by").unsigned().nullable();

    table.index(["email"]);
    table.index(["status"]);
    table.index(["country"]);
    table.index(["city_state"]);
    table.index(["company_name"]);
    table.index(["created_at"]);
    table.index(["deleted_at"]);
    table.index(["visa_expiry_date"]);
    table.index(["passport_expiry_date"]);
    table.index(["emp_name"]);
    table.index(["phone_no"]);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists("employees");
}
