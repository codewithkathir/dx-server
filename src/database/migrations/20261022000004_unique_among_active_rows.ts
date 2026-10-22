import type { Knex } from "knex";

/**
 * Unique keys on soft-deleted tables counted deleted rows too, so re-using a deleted
 * asset's number/serial or a deleted employee's email/code failed with a 500 (ER_DUP_ENTRY)
 * after the service's own check (which ignores deleted rows) had passed.
 * `not_deleted` is 1 for live rows and NULL once deleted; MySQL lets NULLs repeat in a
 * unique index, so each key is now unique among live rows only.
 */
const UniqueKeys: Record<string, string[]> = {
  assets: ["asset_no", "serial_no"],
  employees: ["email", "employee_code"],
};

export async function up(knex: Knex): Promise<void> {
  for (const [table, columns] of Object.entries(UniqueKeys)) {
    await knex.raw(
      `ALTER TABLE ?? ADD COLUMN not_deleted TINYINT AS (IF(deleted_at IS NULL, 1, NULL)) STORED`,
      [table]
    );
    await knex.schema.alterTable(table, (t) => {
      for (const column of columns) {
        t.dropUnique([column]);
        t.unique([column, "not_deleted"], { indexName: `${table}_${column}_unique` });
      }
    });
  }
}

export async function down(knex: Knex): Promise<void> {
  for (const [table, columns] of Object.entries(UniqueKeys)) {
    await knex.schema.alterTable(table, (t) => {
      for (const column of columns) {
        t.dropUnique([column, "not_deleted"], `${table}_${column}_unique`);
        t.unique([column]);
      }
    });
    await knex.schema.alterTable(table, (t) => t.dropColumn("not_deleted"));
  }
}
