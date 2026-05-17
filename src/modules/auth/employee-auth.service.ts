import { randomBytes } from "crypto";
import { config } from "../../config";
import { ApiError } from "../../shared/errors/api.error";
import { ErrorCodes } from "../../shared/errors/error-codes";
import { Actors } from "../../shared/constants/actors";
import { Roles } from "../../shared/constants/roles";
import type { AuthUser } from "../../shared/types/express";
import { logger } from "../../shared/logger/logger";
import { comparePassword, hashPassword } from "../../shared/utils/password.util";
import {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
} from "../../shared/utils/jwt.util";
import {
  getMimeTypeFromFilename,
  resolveUploadAbsolutePath,
} from "../../shared/utils/file.util";
import { DEFAULT_EMPLOYEE_ROLE } from "../employees/employee.types";
import { employeeAuthRepository } from "./employee-auth.repository";
import type {
  EmployeeAuthPublic,
  EmployeeAuthResponse,
  EmployeeAuthRow,
  EmployeeChangePasswordInput,
  EmployeeForgotPasswordInput,
  EmployeeLoginInput,
  EmployeeRefreshInput,
  EmployeeResetPasswordInput,
} from "./employee-auth.types";

class EmployeeAuthService {
  private formatDate(value: Date | string): string {
    if (value instanceof Date) {
      return value.toISOString().slice(0, 10);
    }
    return String(value).slice(0, 10);
  }

  private toPublicEmployee(row: EmployeeAuthRow): EmployeeAuthPublic {
    return {
      id: row.id,
      empName: row.emp_name,
      companyName: row.company_name,
      email: row.email,
      status: row.status,
      role: row.role,
      profilePhoto: row.profile_photo,
      phoneNo: row.phone_no,
      cityState: row.city_state,
      country: row.country,
      dob: this.formatDate(row.dob),
      homeAddress: row.home_address,
      whatsappNo: row.whatsapp_no,
      lastLoginAt: row.last_login_at ? row.last_login_at.toISOString() : null,
    };
  }

  private getRefreshExpiryDate(): Date {
    const expiresIn = process.env.REFRESH_TOKEN_EXPIRES_IN ?? "7d";
    const days = parseInt(expiresIn, 10) || 7;
    const date = new Date();
    date.setDate(date.getDate() + (expiresIn.endsWith("d") ? days : 7));
    return date;
  }

  private getResetExpiryDate(): Date {
    const date = new Date();
    date.setHours(date.getHours() + 1);
    return date;
  }

  private buildAuthUser(employee: EmployeeAuthRow): AuthUser {
    return {
      id: employee.id,
      email: employee.email,
      role: employee.role,
      permissions: [],
      actor: Actors.EMPLOYEE,
    };
  }

  private async issueTokens(employee: EmployeeAuthRow): Promise<{
    accessToken: string;
    refreshToken: string;
  }> {
    const authUser = this.buildAuthUser(employee);
    const accessToken = generateAccessToken(authUser);
    const refreshToken = generateRefreshToken(employee.id);
    const refreshHash = employeeAuthRepository.hashValue(refreshToken);
    const refreshExpiry = this.getRefreshExpiryDate();

    await employeeAuthRepository.saveRefreshToken(
      employee.id,
      refreshHash,
      refreshExpiry
    );

    return { accessToken, refreshToken };
  }

  async login(input: EmployeeLoginInput): Promise<EmployeeAuthResponse> {
    const employee = await employeeAuthRepository.findByEmail(input.email);

    if (!employee) {
      logger.warn({ email: input.email }, "Employee login failed: unknown email");
      throw new ApiError(
        "Invalid credentials",
        ErrorCodes.INVALID_CREDENTIALS,
        401
      );
    }

    if (employee.status !== "active") {
      logger.warn(
        { employeeId: employee.id, status: employee.status },
        "Employee login failed: inactive account"
      );
      throw new ApiError(
        "Account is not active",
        ErrorCodes.AUTH_FAILED,
        403
      );
    }

    if (employee.role !== DEFAULT_EMPLOYEE_ROLE) {
      logger.warn({ employeeId: employee.id }, "Employee login failed: invalid role");
      throw new ApiError("Forbidden", ErrorCodes.FORBIDDEN, 403);
    }

    const isValid = await comparePassword(input.password, employee.password_hash);
    if (!isValid) {
      logger.warn(
        { employeeId: employee.id },
        "Employee login failed: invalid password"
      );
      throw new ApiError(
        "Invalid credentials",
        ErrorCodes.INVALID_CREDENTIALS,
        401
      );
    }

    await employeeAuthRepository.updateLastLogin(employee.id);
    const tokens = await this.issueTokens(employee);

    logger.info({ employeeId: employee.id }, "Employee login successful");

    return {
      ...tokens,
      employee: this.toPublicEmployee(employee),
    };
  }

  async logout(refreshToken: string): Promise<void> {
    try {
      const payload = verifyRefreshToken(refreshToken);
      const hash = employeeAuthRepository.hashValue(refreshToken);
      const employee = await employeeAuthRepository.findByRefreshTokenHash(hash);

      if (employee && employee.id === payload.sub) {
        await employeeAuthRepository.clearRefreshToken(employee.id);
        logger.info({ employeeId: employee.id }, "Employee logout successful");
      }
    } catch {
      logger.warn("Employee logout with invalid refresh token");
    }
  }

  async refreshTokens(input: EmployeeRefreshInput): Promise<{
    accessToken: string;
    refreshToken: string;
  }> {
    let payload: { sub: number };
    try {
      payload = verifyRefreshToken(input.refreshToken);
    } catch {
      throw new ApiError("Invalid refresh token", ErrorCodes.TOKEN_EXPIRED, 401);
    }

    const hash = employeeAuthRepository.hashValue(input.refreshToken);
    const employee = await employeeAuthRepository.findByRefreshTokenHash(hash);

    if (!employee || employee.id !== payload.sub) {
      throw new ApiError("Invalid refresh token", ErrorCodes.TOKEN_EXPIRED, 401);
    }

    if (employee.status !== "active") {
      throw new ApiError("Account is not active", ErrorCodes.AUTH_FAILED, 403);
    }

    await employeeAuthRepository.clearRefreshToken(employee.id);
    const tokens = await this.issueTokens(employee);

    logger.info({ employeeId: employee.id }, "Employee token refreshed");

    return tokens;
  }

  async forgotPassword(input: EmployeeForgotPasswordInput): Promise<void> {
    const employee = await employeeAuthRepository.findByEmail(input.email);

    if (!employee || employee.status !== "active") {
      logger.info({ email: input.email }, "Employee forgot password (no action)");
      return;
    }

    const plainToken = randomBytes(32).toString("hex");
    const tokenHash = employeeAuthRepository.hashValue(plainToken);
    const expiresAt = this.getResetExpiryDate();

    await employeeAuthRepository.saveResetToken(employee.id, tokenHash, expiresAt);

    const resetUrl = `${config.app.frontendUrl}/reset-password?token=${plainToken}`;

    logger.info(
      {
        employeeId: employee.id,
        resetUrl: config.isDevelopment ? resetUrl : "[redacted]",
      },
      "Employee password reset token generated"
    );

    if (config.isDevelopment) {
      logger.info(`Employee password reset link (dev): ${resetUrl}`);
    }
  }

  async resetPassword(input: EmployeeResetPasswordInput): Promise<void> {
    const tokenHash = employeeAuthRepository.hashValue(input.token);
    const employee = await employeeAuthRepository.findByResetTokenHash(tokenHash);

    if (!employee) {
      throw new ApiError(
        "Invalid or expired reset token",
        ErrorCodes.TOKEN_EXPIRED,
        400
      );
    }

    const passwordHash = await hashPassword(input.newPassword);
    await employeeAuthRepository.updatePassword(employee.id, passwordHash);
    await employeeAuthRepository.clearResetToken(employee.id);
    await employeeAuthRepository.clearRefreshToken(employee.id);

    logger.info({ employeeId: employee.id }, "Employee password reset successful");
  }

  async changePassword(
    employeeId: number,
    input: EmployeeChangePasswordInput
  ): Promise<void> {
    const employee = await employeeAuthRepository.findActiveById(employeeId);

    if (!employee) {
      throw new ApiError("Employee not found", ErrorCodes.NOT_FOUND, 404);
    }

    const isValid = await comparePassword(
      input.oldPassword,
      employee.password_hash
    );
    if (!isValid) {
      throw new ApiError(
        "Current password is incorrect",
        ErrorCodes.INVALID_CREDENTIALS,
        401
      );
    }

    const passwordHash = await hashPassword(input.newPassword);
    await employeeAuthRepository.updatePassword(employee.id, passwordHash);
    await employeeAuthRepository.clearRefreshToken(employee.id);

    logger.info({ employeeId: employee.id }, "Employee password changed");
  }

  async getProfile(employeeId: number): Promise<EmployeeAuthPublic> {
    const employee = await employeeAuthRepository.findActiveById(employeeId);
    if (!employee) {
      throw new ApiError("Employee not found", ErrorCodes.NOT_FOUND, 404);
    }
    return this.toPublicEmployee(employee);
  }

  async updateProfilePhoto(
    employeeId: number,
    profilePhoto: string
  ): Promise<EmployeeAuthPublic> {
    const employee = await employeeAuthRepository.findActiveById(employeeId);
    if (!employee) {
      throw new ApiError("Employee not found", ErrorCodes.NOT_FOUND, 404);
    }
    await employeeAuthRepository.updateProfilePhoto(employeeId, profilePhoto);
    const updated = await employeeAuthRepository.findActiveById(employeeId);
    if (!updated) {
      throw new ApiError("Employee not found", ErrorCodes.NOT_FOUND, 404);
    }
    return this.toPublicEmployee(updated);
  }

  async getProfilePhotoFile(employeeId: number): Promise<{
    absolutePath: string;
    contentType: string;
    filename: string;
  }> {
    const employee = await employeeAuthRepository.findActiveById(employeeId);
    if (!employee?.profile_photo) {
      throw new ApiError("Profile photo not found", ErrorCodes.NOT_FOUND, 404);
    }
    const filename = employee.profile_photo.split("/").pop() ?? "profile.jpg";
    return {
      absolutePath: resolveUploadAbsolutePath(employee.profile_photo),
      contentType: getMimeTypeFromFilename(filename),
      filename,
    };
  }

  async resolveAuthUser(employeeId: number): Promise<AuthUser> {
    const employee = await employeeAuthRepository.findActiveById(employeeId);
    if (!employee) {
      throw new ApiError("Employee not found", ErrorCodes.UNAUTHORIZED, 401);
    }

    if (employee.role !== Roles.EMPLOYEE) {
      throw new ApiError("Forbidden", ErrorCodes.FORBIDDEN, 403);
    }

    return this.buildAuthUser(employee);
  }
}

export const employeeAuthService = new EmployeeAuthService();
