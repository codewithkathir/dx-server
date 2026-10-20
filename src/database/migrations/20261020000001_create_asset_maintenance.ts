import type { Knex } from "knex";
import { AssetCategories } from "../../shared/constants/asset";
import { OdometerSources } from "../../shared/constants/asset-maintenance";

const DEFAULT_SERVICE_TYPES = [
  { code: "OIL_CHANGE", name: "Oil change", category: "vehicle", interval_days: 90, interval_km: 5000, sort_order: 1 },
  { code: "TYRE_CHANGE", name: "Tyre change", category: "vehicle", interval_days: 730, interval_km: 40000, sort_order: 2 },
  { code: "SERVICE", name: "Service", category: "vehicle", interval_days: 180, interval_km: 10000, sort_order: 3 },
  { code: "REGISTRATION", name: "Registration", category: "vehicle", interval_days: 365, interval_km: null, sort_order: 4 },
  { code: "INSURANCE", name: "Insurance", category: "vehicle", interval_days: 365, interval_km: null, sort_order: 5 },
];

/**
 * Maintenance and compliance log for assets (oil change, service, insurance…)
 * plus odometer readings for km-based due dates. Drivers are not stored here:
 * a vehicle's driver is its open asset_assignments row.
 */
export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable("asset_service_types", (table) => {
    table.increments("id").primary();
    table.string("code", 30).notNullable().unique();
    table.string("name", 100).notNullable();
    /** NULL = applies to every asset category. */
    table.enum("category", AssetCategories).nullable();
    table.integer("interval_days").unsigned().nullable();
    table.integer("interval_km").unsigned().nullable();
    table.integer("sort_order").unsigned().notNullable().defaultTo(0);
    table.enum("status", ["active", "inactive"]).notNullable().defaultTo("active");
    table.timestamp("created_at").defaultTo(knex.fn.now());
    table.timestamp("updated_at").defaultTo(knex.fn.now());
    table.timestamp("deleted_at").nullable();
    table.integer("created_by").unsigned().nullable();
    table.integer("updated_by").unsigned().nullable();

    table.index(["deleted_at", "status"]);
    table.index(["category"]);
  });

  await knex.schema.createTable("asset_service_records", (table) => {
    table.increments("id").primary();
    table.integer("asset_id").unsigned().notNullable().references("id").inTable("assets").onDelete("CASCADE");
    table
      .integer("service_type_id")
      .unsigned()
      .notNullable()
      .references("id")
      .inTable("asset_service_types")
      .onDelete("RESTRICT");
    /** Who took the vehicle in / handled it (optional). */
    table.integer("employee_id").unsigned().nullable().references("id").inTable("employees").onDelete("RESTRICT");
    /** Date the work was done, or the policy/registration was issued. */
    table.date("start_date").notNullable();
    /** Next due date, or the policy/registration expiry. */
    table.date("end_date").nullable();
    table.integer("odometer_km").unsigned().nullable();
    table.integer("next_due_km").unsigned().nullable();
    table.decimal("cost", 12, 2).nullable();
    /** Invoice, policy or registration number. */
    table.string("reference_no", 100).nullable();
    table.text("notes").nullable();
    table.timestamp("created_at").defaultTo(knex.fn.now());
    table.timestamp("updated_at").defaultTo(knex.fn.now());
    table.timestamp("deleted_at").nullable();
    table.integer("created_by").unsigned().nullable();
    table.integer("updated_by").unsigned().nullable();

    table.index(["asset_id", "service_type_id", "start_date"]);
    table.index(["deleted_at", "end_date"]);
  });

  await knex.schema.createTable("asset_odometer_readings", (table) => {
    table.increments("id").primary();
    table.integer("asset_id").unsigned().notNullable().references("id").inTable("assets").onDelete("CASCADE");
    table.integer("reading_km").unsigned().notNullable();
    table.date("reading_date").notNullable();
    table.enum("source", OdometerSources).notNullable().defaultTo("manual");
    /** The service record or assignment the reading belongs to, if any. */
    table
      .integer("service_record_id")
      .unsigned()
      .nullable()
      .references("id")
      .inTable("asset_service_records")
      .onDelete("CASCADE");
    table
      .integer("assignment_id")
      .unsigned()
      .nullable()
      .references("id")
      .inTable("asset_assignments")
      .onDelete("CASCADE");
    /** The employee who reported it (employee app) or drove at the time. */
    table.integer("employee_id").unsigned().nullable().references("id").inTable("employees").onDelete("RESTRICT");
    table.string("notes", 255).nullable();
    /** Admin who entered it; NULL when the employee reported it. */
    table.integer("created_by").unsigned().nullable();
    table.timestamp("created_at").defaultTo(knex.fn.now());

    table.index(["asset_id", "reading_date"]);
  });

  await knex.schema.alterTable("asset_assignments", (table) => {
    table.integer("odometer_out").unsigned().nullable();
    table.integer("odometer_in").unsigned().nullable();
  });

  const taken = await knex("asset_service_types")
    .whereIn("code", DEFAULT_SERVICE_TYPES.map((t) => t.code))
    .pluck("code");
  const rows = DEFAULT_SERVICE_TYPES.filter((t) => !taken.includes(t.code)).map((t) => ({
    ...t,
    status: "active",
    created_at: knex.fn.now(),
    updated_at: knex.fn.now(),
  }));
  if (rows.length) await knex("asset_service_types").insert(rows);
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable("asset_assignments", (table) => {
    table.dropColumn("odometer_out");
    table.dropColumn("odometer_in");
  });
  await knex.schema.dropTableIfExists("asset_odometer_readings");
  await knex.schema.dropTableIfExists("asset_service_records");
  await knex.schema.dropTableIfExists("asset_service_types");
}
