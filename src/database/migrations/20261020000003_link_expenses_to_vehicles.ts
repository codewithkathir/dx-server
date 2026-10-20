import type { Knex } from "knex";

const OLD_SOURCES = ["manual", "service", "assign", "return", "employee", "fuel_expense"];
const NEW_SOURCES = ["manual", "service", "assign", "return", "employee", "expense"];

/**
 * Vehicle expenses: an employee claim can name the vehicle it was for (and its
 * km). On approval it creates the matching service record (oil change…) or an
 * odometer reading, linked back by expense_id so reject/delete can undo it.
 */
export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable("expenses", (table) => {
    table.integer("asset_id").unsigned().nullable().references("id").inTable("assets").onDelete("SET NULL");
    table.integer("odometer_km").unsigned().nullable();
    table.index(["asset_id", "date"]);
  });

  await knex.schema.alterTable("categories", (table) => {
    /** Claims in this category ask for the vehicle and its km. */
    table.boolean("is_vehicle_expense").notNullable().defaultTo(false);
  });

  for (const name of ["sub_categories", "sub_sub_categories"]) {
    await knex.schema.alterTable(name, (table) => {
      /** Approved vehicle claims here create a service record of this type (sub-sub wins over sub). */
      table
        .integer("service_type_id")
        .unsigned()
        .nullable()
        .references("id")
        .inTable("asset_service_types")
        .onDelete("SET NULL");
    });
  }

  await knex.schema.alterTable("asset_service_records", (table) => {
    table.integer("expense_id").unsigned().nullable().unique().references("id").inTable("expenses").onDelete("SET NULL");
  });

  await knex.schema.alterTable("asset_odometer_readings", (table) => {
    table.integer("expense_id").unsigned().nullable().references("id").inTable("expenses").onDelete("CASCADE");
  });
  // "fuel_expense" was a placeholder; readings from any claim use "expense".
  await knex("asset_odometer_readings").where({ source: "fuel_expense" }).update({ source: "manual" });
  await knex.schema.alterTable("asset_odometer_readings", (table) => {
    table.enum("source", NEW_SOURCES).notNullable().defaultTo("manual").alter();
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex("asset_odometer_readings").where({ source: "expense" }).del();
  await knex.schema.alterTable("asset_odometer_readings", (table) => {
    table.enum("source", OLD_SOURCES).notNullable().defaultTo("manual").alter();
    table.dropForeign(["expense_id"]);
    table.dropColumn("expense_id");
  });
  await knex.schema.alterTable("asset_service_records", (table) => {
    table.dropForeign(["expense_id"]);
    table.dropUnique(["expense_id"]);
    table.dropColumn("expense_id");
  });
  for (const name of ["sub_categories", "sub_sub_categories"]) {
    await knex.schema.alterTable(name, (table) => {
      table.dropForeign(["service_type_id"]);
      table.dropColumn("service_type_id");
    });
  }
  await knex.schema.alterTable("categories", (table) => {
    table.dropColumn("is_vehicle_expense");
  });
  await knex.schema.alterTable("expenses", (table) => {
    table.dropForeign(["asset_id"]);
    table.dropIndex(["asset_id", "date"]);
    table.dropColumn("asset_id");
    table.dropColumn("odometer_km");
  });
}
