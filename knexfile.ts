import type { Knex } from "knex";
import { loadEnv } from "./src/config/load-env";

loadEnv();

function requireEnv(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

const config: Knex.Config = {
  client: "mysql2",
  connection: {
    host: requireEnv("DB_HOST"),
    port: Number(process.env.DB_PORT ?? 3306),
    user: requireEnv("DB_USER"),
    password: process.env.DB_PASSWORD ?? "",
    database: requireEnv("DB_NAME"),
    // Keep DATE columns as "YYYY-MM-DD" strings (see src/config/db.config.ts).
    dateStrings: ["DATE"],
  },
  pool: {
    min: 2,
    max: 10,
  },
  migrations: {
    directory: "./src/database/migrations",
    extension: "ts",
  },
  seeds: {
    directory: "./src/database/seeds",
    extension: "ts",
  },
};

export default config;
