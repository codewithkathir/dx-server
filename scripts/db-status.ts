/**
 * Show which database is configured and list employees.
 * Usage: npm run db:status
 */
import dotenv from "dotenv";
import knex from "knex";

dotenv.config();

async function main(): Promise<void> {
  const host = process.env.DB_HOST ?? "localhost";
  const database = process.env.DB_NAME ?? "dx_app";

  console.log("--- .env database target ---");
  console.log(`  Host:     ${host}`);
  console.log(`  Port:     ${process.env.DB_PORT ?? 3306}`);
  console.log(`  Database: ${database}`);
  console.log(`  User:     ${process.env.DB_USER ?? "root"}`);
  console.log("----------------------------\n");

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

  const tableCheck = await db.raw("SHOW TABLES LIKE 'employees'");
  const hasTable = (tableCheck[0] as unknown[]).length > 0;

  if (!hasTable) {
    console.log("employees table: NOT FOUND — run: npm run migrate");
    await db.destroy();
    return;
  }

  const employees = await db("employees")
    .select("id", "emp_name", "email", "status", "deleted_at")
    .orderBy("id");

  console.log(`employees table: ${employees.length} row(s) total\n`);

  if (employees.length === 0) {
    console.log("No rows. Run: npm run seed:employees");
  } else {
    for (const e of employees) {
      const deleted = e.deleted_at ? " [DELETED]" : "";
      console.log(
        `  ${e.id}. ${e.emp_name} <${e.email}> ${e.status}${deleted}`
      );
    }
  }

  await db.destroy();
}

main().catch((err: Error) => {
  console.error(err.message);
  process.exit(1);
});
