import { z } from "zod";

export const envSchema = z.object({
  PORT: z.coerce.number().default(5000),
  NODE_ENV: z.enum(["development", "staging", "production", "test"]).default("development"),

  DB_HOST: z.string().min(1),
  DB_PORT: z.coerce.number().default(3306),
  DB_USER: z.string().min(1),
  DB_PASSWORD: z.string(),
  DB_NAME: z.string().min(1),

  JWT_SECRET: z.string().min(32),
  JWT_EXPIRES_IN: z.string().default("15m"),
  REFRESH_TOKEN_SECRET: z.string().min(32),
  REFRESH_TOKEN_EXPIRES_IN: z.string().default("7d"),

  REDIS_HOST: z.string().default("localhost"),
  REDIS_PORT: z.coerce.number().default(6379),
  REDIS_ENABLED: z
    .string()
    .transform((v) => v === "true")
    .default("false"),

  CORS_ORIGIN: z.string().default("http://localhost:3000"),
  APP_URL: z.string().default("http://localhost:3000"),

  UPLOAD_PATH: z.string().default("uploads"),
  MAX_FILE_SIZE: z.coerce.number().default(5242880),

  RATE_LIMIT_WINDOW_MS: z.coerce.number().default(900000),
  RATE_LIMIT_MAX: z.coerce.number().default(100),
  AUTH_RATE_LIMIT_MAX: z.coerce.number().default(5),
});

export type Env = z.infer<typeof envSchema>;
