import { z } from "zod";
import { emailSchema, passwordSchema } from "../../shared/validators/common.validation";

export const adminLoginSchema = z
  .object({
    email: emailSchema,
    password: z.string().min(1, "Password is required"),
  })
  .strict();

export const adminRefreshTokenSchema = z
  .object({
    refreshToken: z.string().min(1, "Refresh token is required"),
  })
  .strict();

export const adminForgotPasswordSchema = z
  .object({
    email: emailSchema,
  })
  .strict();

export const adminResetPasswordSchema = z
  .object({
    token: z.string().min(1, "Reset token is required"),
    newPassword: passwordSchema,
  })
  .strict();

export const adminChangePasswordSchema = z
  .object({
    oldPassword: z.string().min(1, "Current password is required"),
    newPassword: passwordSchema,
  })
  .strict()
  .refine((data) => data.oldPassword !== data.newPassword, {
    message: "New password must be different from current password",
    path: ["newPassword"],
  });

export type AdminLoginBody = z.infer<typeof adminLoginSchema>;
export type AdminRefreshTokenBody = z.infer<typeof adminRefreshTokenSchema>;
export type AdminForgotPasswordBody = z.infer<typeof adminForgotPasswordSchema>;
export type AdminResetPasswordBody = z.infer<typeof adminResetPasswordSchema>;
export type AdminChangePasswordBody = z.infer<typeof adminChangePasswordSchema>;
