import { z } from "zod";
import { emailSchema, passwordSchema } from "../../shared/validators/common.validation";

export const registerSchema = z
  .object({
    name: z.string().min(2).max(150).trim(),
    email: emailSchema,
    password: passwordSchema,
  })
  .strict();

export const loginSchema = z
  .object({
    email: emailSchema,
    password: z.string().min(1),
  })
  .strict();

export const refreshTokenSchema = z
  .object({
    refreshToken: z.string().min(1),
  })
  .strict();

export type RegisterBody = z.infer<typeof registerSchema>;
export type LoginBody = z.infer<typeof loginSchema>;
export type RefreshTokenBody = z.infer<typeof refreshTokenSchema>;
