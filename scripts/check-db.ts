import dotenv from "dotenv";
import knex from "knex";

dotenv.config();

async function checkDb(): Promise<void> {
  const db = knex({
    client: "mysql2",
    connection: {
      host: process.env.DB_HOST ?? "localhost",
      port: Number(process.env.DB_PORT ?? 3306),
      user: process.env.DB_USER ?? "root",
      password: process.env.DB_PASSWORD ?? "Kathir@99",
      database: process.env.DB_NAME ?? "dx_app",
    },
  });

  try {
    await db.raw("SELECT 1");
    console.log("Database connection OK");
    await db.destroy();
    process.exit(0);
  } catch (error) {
    console.error("\nDatabase connection failed.\n");
    console.error("1. Set DB_PASSWORD in .env to your MySQL root password");
    console.error("2. Create the database:");
    console.error(
      `   mysql -u root -p -e "CREATE DATABASE IF NOT EXISTS ${process.env.DB_NAME ?? "dx_app"};"`
    );
    console.error("\nOr use Docker (matches .env defaults):");
    console.error("   docker compose up -d");
    console.error("   npm run setup\n");
    if (error instanceof Error) {
      console.error(`Error: ${error.message}`);
    }
    await db.destroy();
    process.exit(1);
  }
}

void checkDb();
