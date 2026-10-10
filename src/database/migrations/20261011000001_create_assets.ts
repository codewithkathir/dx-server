import type { Knex } from "knex";
import { AssetCategories, AssetConditions, AssetStatuses } from "../../shared/constants/asset";

/**
 * Company assets and their hand-over history. An asset has at most one open
 * assignment (returned_at IS NULL); the service enforces that under a row lock.
 */
export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable("assets", (table) => {
    table.increments("id").primary();
    table.string("asset_no", 50).notNullable().unique();
    table.string("name", 150).notNullable();
    table.enum("category", AssetCategories).notNullable().defaultTo("other");
    table.string("brand", 100).nullable();
    table.string("model", 100).nullable();
    table.string("serial_no", 100).nullable().unique();
    table.date("purchase_date").nullable();
    table.decimal("purchase_cost", 12, 2).nullable();
    table.date("warranty_expiry").nullable();
    table.enum("condition", AssetConditions).notNullable().defaultTo("good");
    table.enum("status", AssetStatuses).notNullable().defaultTo("available");
    table.text("notes").nullable();
    table.timestamp("created_at").defaultTo(knex.fn.now());
    table.timestamp("updated_at").defaultTo(knex.fn.now());
    table.timestamp("deleted_at").nullable();
    table.integer("created_by").unsigned().nullable();
    table.integer("updated_by").unsigned().nullable();

    table.index(["deleted_at", "status"]);
    table.index(["category"]);
    table.index(["created_at"]);
  });

  await knex.schema.createTable("asset_assignments", (table) => {
    table.increments("id").primary();
    table.integer("asset_id").unsigned().notNullable().references("id").inTable("assets").onDelete("CASCADE");
    table.integer("employee_id").unsigned().notNullable().references("id").inTable("employees").onDelete("RESTRICT");
    table.date("assigned_date").notNullable();
    table.date("expected_return_date").nullable();
    table.enum("condition_out", AssetConditions).notNullable();
    table.text("notes").nullable();
    table.integer("assigned_by").unsigned().nullable();
    /** When the employee confirmed in the app that they received it. */
    table.timestamp("acknowledged_at").nullable();
    table.date("returned_date").nullable();
    table.enum("condition_in", AssetConditions).nullable();
    table.text("return_notes").nullable();
    table.integer("returned_by").unsigned().nullable();
    table.timestamp("created_at").defaultTo(knex.fn.now());
    table.timestamp("updated_at").defaultTo(knex.fn.now());

    table.index(["asset_id", "returned_date"]);
    table.index(["employee_id", "returned_date"]);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists("asset_assignments");
  await knex.schema.dropTableIfExists("assets");
}
