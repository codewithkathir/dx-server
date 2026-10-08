import { z } from "zod";
import { emailSchema, passwordSchema } from "../../shared/validators/common.validation";
import { employeeCoreFields } from "../employees/employee.validation";

export const employeeLoginSchema = z
  .object({
    email: emailSchema,
    password: z.string().min(1, "Password is required"),
  })
  .strict();

export const employeeRefreshTokenSchema = z
  .object({
    refreshToken: z.string().min(1, "Refresh token is required"),
  })
  .strict();

export const employeeForgotPasswordSchema = z
  .object({
    email: emailSchema,
  })
  .strict();

export const employeeResetPasswordSchema = z
  .object({
    token: z.string().min(1, "Reset token is required"),
    newPassword: passwordSchema,
  })
  .strict();

export const employeeChangePasswordSchema = z
  .object({
    oldPassword: z.string().min(1, "Current password is required"),
    newPassword: passwordSchema,
  })
  .strict()
  .refine((data) => data.oldPassword !== data.newPassword, {
    message: "New password must be different from current password",
    path: ["newPassword"],
  });

/**
 * Fields an employee may change on their own profile. Company, email, role,
 * status and identity documents stay admin-managed (admin employees module).
 */
export const employeeUpdateProfileSchema = z
  .object({
    empName: employeeCoreFields.empName.optional(),
    dob: employeeCoreFields.dob.optional(),
    phoneNo: employeeCoreFields.phoneNo.optional(),
    whatsappNo: z.union([employeeCoreFields.phoneNo, z.null()]).optional(),
    homeAddress: employeeCoreFields.homeAddress.optional(),
    cityState: employeeCoreFields.cityState.optional(),
    country: employeeCoreFields.country.optional(),
  })
  .strict()
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field is required",
  });

export type EmployeeLoginBody = z.infer<typeof employeeLoginSchema>;
export type EmployeeRefreshTokenBody = z.infer<typeof employeeRefreshTokenSchema>;
export type EmployeeForgotPasswordBody = z.infer<typeof employeeForgotPasswordSchema>;
export type EmployeeResetPasswordBody = z.infer<typeof employeeResetPasswordSchema>;
export type EmployeeChangePasswordBody = z.infer<typeof employeeChangePasswordSchema>;
export type EmployeeUpdateProfileBody = z.infer<typeof employeeUpdateProfileSchema>;
