import { z } from "zod";
import {
  emailSchema,
  idParamSchema,
  paginationQuerySchema,
  passwordSchema,
} from "../../shared/validators/common.validation";

export const createUserSchema = z
  .object({
    name: z.string().min(2).max(150).trim(),
    email: emailSchema,
    password: passwordSchema,
    roleId: z.coerce.number().int().positive().optional(),
    status: z.enum(["active", "inactive", "pending"]).optional(),
  })
  .strict();

export const updateUserSchema = z
  .object({
    name: z.string().min(2).max(150).trim().optional(),
    email: emailSchema.optional(),
    password: passwordSchema.optional(),
    roleId: z.coerce.number().int().positive().optional(),
    status: z.enum(["active", "inactive", "pending"]).optional(),
  })
  .strict();

export { idParamSchema, paginationQuerySchema };

export type CreateUserBody = z.infer<typeof createUserSchema>;
export type UpdateUserBody = z.infer<typeof updateUserSchema>;
