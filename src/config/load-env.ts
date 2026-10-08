import fs from "fs";
import path from "path";
import dotenv from "dotenv";

export const AppEnvs = ["local", "dev", "qa"] as const;
export type AppEnv = (typeof AppEnvs)[number];

/** Values used only when APP_ENV=local and the variable is not set. */
const LOCAL_DEFAULTS: Record<string, string> = {
  PORT: "5001",
  DB_HOST: "localhost",
  DB_USER: "root",
  DB_NAME: "dx_app",
  CORS_ORIGIN: "http://localhost:3000,http://localhost:5173",
  APP_URL: "http://localhost:3000",
};

let loadedAppEnv: AppEnv | null = null;

function resolveAppEnv(): AppEnv {
  const value = process.env.APP_ENV ?? "local";
  if (!(AppEnvs as readonly string[]).includes(value)) {
    throw new Error(
      `Invalid APP_ENV "${value}". Expected one of: ${AppEnvs.join(", ")}`
    );
  }
  return value as AppEnv;
}

/**
 * Loads environment variables for the current APP_ENV (default: local).
 *
 * - local: `.env.local` if present, otherwise `.env`; unset values fall back
 *   to localhost defaults.
 * - dev / qa: `.env.dev` / `.env.qa` if present; otherwise values must come
 *   from the process environment. No defaults are applied.
 *
 * Variables already set in the process environment always win over files.
 */
export function loadEnv(): AppEnv {
  if (loadedAppEnv) return loadedAppEnv;

  const appEnv = resolveAppEnv();
  const root = path.resolve(__dirname, "../..");

  const candidates =
    appEnv === "local" ? [".env.local", ".env"] : [`.env.${appEnv}`];
  const envFile = candidates
    .map((name) => path.join(root, name))
    .find((file) => fs.existsSync(file));

  if (envFile) {
    dotenv.config({ path: envFile });
  }

  if (appEnv === "local") {
    for (const [key, value] of Object.entries(LOCAL_DEFAULTS)) {
      process.env[key] ??= value;
    }
  }

  process.env.APP_ENV = appEnv;
  loadedAppEnv = appEnv;
  return appEnv;
}
