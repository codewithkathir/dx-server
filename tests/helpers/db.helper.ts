import knex, { type Knex } from "knex";
import path from "path";

let testDb: Knex | null = null;

export function getTestDb(): Knex {
  if (!testDb) {
    testDb = knex({
      client: "mysql2",
      connection: {
        host: process.env.DB_HOST ?? "localhost",
        port: Number(process.env.DB_PORT ?? 3306),
        user: process.env.DB_USER ?? "root",
        password: process.env.DB_PASSWORD ?? "",
        database: process.env.DB_NAME ?? "dx_app_test",
      },
    });
  }
  return testDb;
}

export async function resetDatabase(): Promise<void> {
  const db = getTestDb();

  await db.raw("SET FOREIGN_KEY_CHECKS = 0");
  await db("refresh_tokens").del();
  await db("employee_account_entries").del();
  await db("asset_odometer_readings").del();
  await db("asset_service_records").del();
  // Keep the service types seeded by the migration (created_by NULL); drop ones tests made.
  await db("asset_service_types").whereNotNull("created_by").del();
  await db("asset_images").del();
  await db("asset_assignments").del();
  await db("assets").del();
  await db("role_permissions").del();
  await db("employees").del();
  await db("admins").del();
  await db("users").del();
  await db("permissions").del();
  await db("roles").del();
  await db.raw("SET FOREIGN_KEY_CHECKS = 1");

  const seedKnex = knex({
    client: "mysql2",
    connection: {
      host: process.env.DB_HOST ?? "localhost",
      port: Number(process.env.DB_PORT ?? 3306),
      user: process.env.DB_USER ?? "root",
      password: process.env.DB_PASSWORD ?? "",
      database: process.env.DB_NAME ?? "dx_app_test",
    },
    seeds: {
      directory: path.resolve(__dirname, "../../src/database/seeds"),
      extension: "ts",
    },
  });

  await seedKnex.seed.run();
  await seedKnex.destroy();
}

export async function closeTestDb(): Promise<void> {
  if (testDb) {
    await testDb.destroy();
    testDb = null;
  }
}
