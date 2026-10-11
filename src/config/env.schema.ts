import { z } from "zod";

import { AppEnvs } from "./load-env";

/** Optional text setting; a blank value in the .env file counts as unset. */
const optionalString = z
  .string()
  .optional()
  .transform((value) => value?.trim() || undefined);

const emailPattern = z.string().email();

// Host/URL values have no defaults here: APP_ENV=local fills them with
// localhost values in load-env.ts, while dev and qa must provide them.
const baseEnvSchema = z.object({
  APP_ENV: z.enum(AppEnvs),
  PORT: z.coerce.number().int().positive(),
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

  /** Comma-separated list of allowed browser origins. */
  CORS_ORIGIN: z.string().min(1),
  APP_URL: z.string().url(),

  UPLOAD_PATH: z.string().default("uploads"),
  MAX_FILE_SIZE: z.coerce.number().default(5242880),

  // Seller details printed on invoices. With COMPANY_TRN set, PDFs are titled "Tax Invoice".
  COMPANY_NAME: z
    .string()
    .optional()
    .transform((value) => value?.trim() || "DX Record"),
  COMPANY_ADDRESS: z.string().optional(),
  COMPANY_TRN: z
    .string()
    .regex(/^\d{15}$/, "COMPANY_TRN must be 15 digits")
    .optional()
    .or(z.literal("").transform(() => undefined)),
  COMPANY_BANK_DETAILS: z.string().optional(),

  // Email via SMTP (e.g. Zoho Mail) when SMTP_HOST is set, otherwise SendGrid.
  // With neither configured, emails are only written to the log.
  SMTP_HOST: optionalString,
  /** 465 = SSL (Zoho default), 587 = STARTTLS. */
  SMTP_PORT: z.coerce.number().int().positive().default(465),
  SMTP_USER: optionalString,
  SMTP_PASS: optionalString,
  SENDGRID_API_KEY: optionalString,
  /**
   * Sender address. SMTP providers like Zoho only accept the signed-in mailbox (or its aliases);
   * defaults to SMTP_USER. For SendGrid it must be a verified sender.
   */
  MAIL_FROM_EMAIL: optionalString,
  MAIL_FROM_NAME: optionalString,
  MAIL_REPLY_TO: optionalString,

  RATE_LIMIT_WINDOW_MS: z.coerce.number().default(900000),
  RATE_LIMIT_MAX: z.coerce.number().default(1000),
  AUTH_RATE_LIMIT_MAX: z.coerce.number().default(5),
});

/** A configured mail provider needs its credentials and a valid sender, otherwise every send would fail. */
export const envSchema = baseEnvSchema.superRefine((env, ctx) => {
  if (env.SMTP_HOST) {
    for (const key of ["SMTP_USER", "SMTP_PASS"] as const) {
      if (!env[key]) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: [key], message: `${key} is required when SMTP_HOST is set` });
      }
    }
    const from = env.MAIL_FROM_EMAIL ?? env.SMTP_USER;
    if (from && !emailPattern.safeParse(from).success) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["MAIL_FROM_EMAIL"],
        message: "MAIL_FROM_EMAIL (or SMTP_USER) must be a valid email when SMTP_HOST is set",
      });
    }
  } else if (env.SENDGRID_API_KEY) {
    if (!env.MAIL_FROM_EMAIL || !emailPattern.safeParse(env.MAIL_FROM_EMAIL).success) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["MAIL_FROM_EMAIL"],
        message: "MAIL_FROM_EMAIL must be a valid email when SENDGRID_API_KEY is set",
      });
    }
  }
  if (env.MAIL_REPLY_TO && !emailPattern.safeParse(env.MAIL_REPLY_TO).success) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["MAIL_REPLY_TO"],
      message: "MAIL_REPLY_TO must be a valid email",
    });
  }
});

export type Env = z.infer<typeof envSchema>;
