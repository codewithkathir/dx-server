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
