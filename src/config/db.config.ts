import { config } from "./index";

export const dbConfig = {
  client: "mysql2" as const,
  connection: {
    host: config.db.host,
    port: config.db.port,
    user: config.db.user,
    password: config.db.password,
    database: config.db.name,
  },
  pool: {
    min: 2,
    max: 10,
  },
};
