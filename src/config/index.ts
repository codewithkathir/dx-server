import { envSchema, type Env } from "./env.schema";
import { loadEnv } from "./load-env";

loadEnv();

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
  appEnv: env.APP_ENV,
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
    origin: env.CORS_ORIGIN.split(",")
      .map((origin) => origin.trim())
      .filter(Boolean),
  },

  app: {
    frontendUrl: env.APP_URL,
  },

  upload: {
    path: env.UPLOAD_PATH,
    maxFileSize: env.MAX_FILE_SIZE,
  },

  company: {
    name: env.COMPANY_NAME,
    address: env.COMPANY_ADDRESS,
    trn: env.COMPANY_TRN,
    bankDetails: env.COMPANY_BANK_DETAILS,
  },

  mail: {
    /** SMTP (e.g. Zoho) wins over SendGrid; with neither, emails are only logged. */
    provider: env.SMTP_HOST ? ("smtp" as const) : env.SENDGRID_API_KEY ? ("sendgrid" as const) : null,
    enabled: Boolean(env.SMTP_HOST || env.SENDGRID_API_KEY),
    smtp: {
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      user: env.SMTP_USER,
      pass: env.SMTP_PASS,
    },
    sendgridApiKey: env.SENDGRID_API_KEY,
    fromEmail: env.MAIL_FROM_EMAIL ?? (env.SMTP_HOST ? env.SMTP_USER : undefined),
    fromName: env.MAIL_FROM_NAME ?? env.COMPANY_NAME,
    replyTo: env.MAIL_REPLY_TO,
  },

  rateLimit: {
    windowMs: env.RATE_LIMIT_WINDOW_MS,
    max: env.RATE_LIMIT_MAX,
    authMax: env.AUTH_RATE_LIMIT_MAX,
  },
} as const;
