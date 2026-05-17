import knex, { type Knex } from "knex";
import { dbConfig } from "../config/db.config";

const knexInstance: Knex = knex({
  ...dbConfig,
  migrations: {
    directory: `${__dirname}/migrations`,
    extension: "ts",
  },
  seeds: {
    directory: `${__dirname}/seeds`,
    extension: "ts",
  },
});

export const db = knexInstance;

export default knexInstance;
