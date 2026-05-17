import dotenv from "dotenv";
import path from "path";
import knex from "knex";

export default async function globalSetup(): Promise<void> {
  dotenv.config({
    path: path.resolve(__dirname, "../.env.test"),
    override: true,
  });

  const dbName = process.env.DB_NAME ?? "dx_app_test";

  const adminDb = knex({
    client: "mysql2",
    connection: {
      host: process.env.DB_HOST ?? "localhost",
      port: Number(process.env.DB_PORT ?? 3306),
      user: process.env.DB_USER ?? "root",
      password: process.env.DB_PASSWORD ?? "",
    },
  });

  await adminDb.raw(`CREATE DATABASE IF NOT EXISTS \`${dbName}\``);
  await adminDb.destroy();

  const testDb = knex({
    client: "mysql2",
    connection: {
      host: process.env.DB_HOST ?? "localhost",
      port: Number(process.env.DB_PORT ?? 3306),
      user: process.env.DB_USER ?? "root",
      password: process.env.DB_PASSWORD ?? "",
      database: dbName,
    },
    migrations: {
      directory: path.resolve(__dirname, "../src/database/migrations"),
      extension: "ts",
    },
    seeds: {
      directory: path.resolve(__dirname, "../src/database/seeds"),
      extension: "ts",
    },
  });

  await testDb.migrate.latest();
  await testDb.seed.run();
  await testDb.destroy();
}
