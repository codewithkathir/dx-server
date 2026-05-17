import { closeTestDb } from "./helpers/db.helper";

afterAll(async () => {
  await closeTestDb();
  const { db } = await import("../src/database/knex");
  await db.destroy();
});
