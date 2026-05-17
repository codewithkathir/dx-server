import dotenv from "dotenv";
import { envSchema, type Env } from "./env.schema";

dotenv.config();

function loadConfig(): Env {
  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    const formatted = result.error.errors
      .map((e) => `${e.path.join(".")}: ${e.message}`)
      .join("\n");
    console.error("Environment validation failed:\n", formatted);
    process.exit(1);
  }

  return result.data;
}

const env = loadConfig();

export const config = {
  port: env.PORT,
  nodeEnv: env.NODE_ENV,
  isProduction: env.NODE_ENV === "production",
  isDevelopment: env.NODE_ENV === "development",

  db: {
    host: env.DB_HOST,
    port: env.DB_PORT,
    user: env.DB_USER,
    password: env.DB_PASSWORD,
    name: env.DB_NAME,
  },

  jwt: {
    secret: env.JWT_SECRET,
    expiresIn: env.JWT_EXPIRES_IN,
    refreshSecret: env.REFRESH_TOKEN_SECRET,
    refreshExpiresIn: env.REFRESH_TOKEN_EXPIRES_IN,
  },

  redis: {
    host: env.REDIS_HOST,
    port: env.REDIS_PORT,
    enabled: env.REDIS_ENABLED,
  },

  cors: {
    origin: env.CORS_ORIGIN,
  },

  app: {
    frontendUrl: env.APP_URL,
  },

  upload: {
    path: env.UPLOAD_PATH,
    maxFileSize: env.MAX_FILE_SIZE,
  },

  rateLimit: {
    windowMs: env.RATE_LIMIT_WINDOW_MS,
    max: env.RATE_LIMIT_MAX,
    authMax: env.AUTH_RATE_LIMIT_MAX,
  },
} as const;
