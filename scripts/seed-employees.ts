/**
 * Seed sample employees into the `employees` table.
 *
 * Usage:
 *   npm run seed:employees          # insert only if sample rows missing
 *   npm run seed:employees -- --force   # delete sample rows and re-insert
 */
import dotenv from "dotenv";
import knex from "knex";

dotenv.config();

const force = process.argv.includes("--force");

async function main(): Promise<void> {
  const host = process.env.DB_HOST ?? "localhost";
  const database = process.env.DB_NAME ?? "dx_app";

  const db = knex({
    client: "mysql2",
    connection: {
      host,
      port: Number(process.env.DB_PORT ?? 3306),
      user: process.env.DB_USER ?? "root",
      password: process.env.DB_PASSWORD ?? "",
      database,
    },
  });

  console.log(`Database: ${database} @ ${host}`);
  if (force) {
    console.log("Mode: FORCE (replace sample employees)");
  }

  const { seed } = await import("../src/database/seeds/03_employees");
  const result = await seed(db, { force });

  const rows = await db("employees")
    .whereNull("deleted_at")
    .select("id", "emp_name", "email", "status")
    .orderBy("id");

  if (result.skipped) {
    console.log(
      "Skipped insert — sample employees already exist. Use: npm run seed:employees -- --force"
    );
  } else {
    console.log(`Inserted ${result.inserted} employee(s).`);
  }

  console.log(`\nActive employees in DB (${rows.length}):`);
  for (const row of rows) {
    console.log(`  ${row.id}. ${row.emp_name} <${row.email}> [${row.status}]`);
  }

  await db.destroy();
}

main().catch((err: Error) => {
  console.error(err.message);
  process.exit(1);
});
