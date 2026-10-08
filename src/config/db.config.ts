import { config } from "./index";

export const dbConfig = {
  client: "mysql2" as const,
  connection: {
    host: config.db.host,
    port: config.db.port,
    user: config.db.user,
    password: config.db.password,
    database: config.db.name,
    // Return DATE columns as "YYYY-MM-DD" strings. As Date objects they are
    // local midnight, and toISOString() then shifts them a day earlier in
    // timezones ahead of UTC (e.g. IST).
    dateStrings: ["DATE" as const],
  },
  pool: {
    min: 2,
    max: 10,
  },
};
