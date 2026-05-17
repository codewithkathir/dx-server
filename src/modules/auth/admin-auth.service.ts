import { randomBytes } from "crypto";
import { config } from "../../config";
import { ApiError } from "../../shared/errors/api.error";
import { ErrorCodes } from "../../shared/errors/error-codes";
import { Actors } from "../../shared/constants/actors";
import { Roles } from "../../shared/constants/roles";
import type { RoleName } from "../../shared/constants/roles";
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
import { roleRepository } from "../roles/role.repository";
import { adminRepository } from "./admin.repository";
import type {
  AdminAuthResponse,
  AdminChangePasswordInput,
  AdminForgotPasswordInput,
  AdminLoginInput,
  AdminPublic,
  AdminRefreshInput,
  AdminResetPasswordInput,
  AdminRow,
} from "./admin.types";

class AdminAuthService {
  private toPublicAdmin(row: AdminRow): AdminPublic {
    return {
      id: row.id,
      name: row.name,
      email: row.email,
      role: row.role,
      status: row.status,
      profilePhoto: row.profile_photo,
      lastLoginAt: row.last_login_at ? row.last_login_at.toISOString() : null,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
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

  private async buildAuthUser(admin: AdminRow): Promise<AuthUser> {
    const permissions = await roleRepository.getPermissionsByRoleName(
      admin.role as RoleName
    );

    return {
      id: admin.id,
      email: admin.email,
      role: admin.role as RoleName,
      permissions,
      actor: Actors.ADMIN,
    };
  }

  private async issueTokens(admin: AdminRow): Promise<{
    accessToken: string;
    refreshToken: string;
  }> {
    const authUser = await this.buildAuthUser(admin);
    const accessToken = generateAccessToken(authUser);
    const refreshToken = generateRefreshToken(admin.id);
    const refreshHash = adminRepository.hashValue(refreshToken);
    const refreshExpiry = this.getRefreshExpiryDate();

    await adminRepository.saveRefreshToken(admin.id, refreshHash, refreshExpiry);

    return { accessToken, refreshToken };
  }

  async login(input: AdminLoginInput): Promise<AdminAuthResponse> {
    const admin = await adminRepository.findByEmail(input.email);

    if (!admin) {
      logger.warn({ email: input.email }, "Admin login failed: unknown email");
      throw new ApiError(
        "Invalid credentials",
        ErrorCodes.INVALID_CREDENTIALS,
        401
      );
    }

    if (admin.status !== "active") {
      logger.warn({ adminId: admin.id }, "Admin login failed: inactive account");
      throw new ApiError(
        "Account is not active",
        ErrorCodes.AUTH_FAILED,
        403
      );
    }

    const isValid = await comparePassword(input.password, admin.password_hash);
    if (!isValid) {
      logger.warn({ adminId: admin.id }, "Admin login failed: invalid password");
      throw new ApiError(
        "Invalid credentials",
        ErrorCodes.INVALID_CREDENTIALS,
        401
      );
    }

    await adminRepository.updateLastLogin(admin.id);
    const tokens = await this.issueTokens(admin);

    logger.info({ adminId: admin.id, role: admin.role }, "Admin login successful");

    return {
      ...tokens,
      admin: this.toPublicAdmin(admin),
    };
  }

  async logout(refreshToken: string): Promise<void> {
    try {
      const payload = verifyRefreshToken(refreshToken);
      const hash = adminRepository.hashValue(refreshToken);
      const admin = await adminRepository.findByRefreshTokenHash(hash);

      if (admin && admin.id === payload.sub) {
        await adminRepository.clearRefreshToken(admin.id);
        logger.info({ adminId: admin.id }, "Admin logout successful");
      }
    } catch {
      logger.warn("Admin logout with invalid refresh token");
    }
  }

  async refreshTokens(input: AdminRefreshInput): Promise<{
    accessToken: string;
    refreshToken: string;
  }> {
    let payload: { sub: number };
    try {
      payload = verifyRefreshToken(input.refreshToken);
    } catch {
      throw new ApiError("Invalid refresh token", ErrorCodes.TOKEN_EXPIRED, 401);
    }

    const hash = adminRepository.hashValue(input.refreshToken);
    const admin = await adminRepository.findByRefreshTokenHash(hash);

    if (!admin || admin.id !== payload.sub) {
      throw new ApiError("Invalid refresh token", ErrorCodes.TOKEN_EXPIRED, 401);
    }

    if (admin.status !== "active") {
      throw new ApiError("Account is not active", ErrorCodes.AUTH_FAILED, 403);
    }

    await adminRepository.clearRefreshToken(admin.id);
    const tokens = await this.issueTokens(admin);

    logger.info({ adminId: admin.id }, "Admin token refreshed");

    return tokens;
  }

  async forgotPassword(input: AdminForgotPasswordInput): Promise<void> {
    const admin = await adminRepository.findByEmail(input.email);

    if (!admin || admin.status !== "active") {
      logger.info({ email: input.email }, "Forgot password requested (no action)");
      return;
    }

    const plainToken = randomBytes(32).toString("hex");
    const tokenHash = adminRepository.hashValue(plainToken);
    const expiresAt = this.getResetExpiryDate();

    await adminRepository.saveResetToken(admin.id, tokenHash, expiresAt);

    const resetUrl = `${config.app.frontendUrl}/admin/reset-password?token=${plainToken}`;

    logger.info(
      { adminId: admin.id, resetUrl: config.isDevelopment ? resetUrl : "[redacted]" },
      "Admin password reset token generated"
    );

    // Enqueue email in production via BullMQ; log link in development
    if (config.isDevelopment) {
      logger.info(`Password reset link (dev): ${resetUrl}`);
    }
  }

  async resetPassword(input: AdminResetPasswordInput): Promise<void> {
    const tokenHash = adminRepository.hashValue(input.token);
    const admin = await adminRepository.findByResetTokenHash(tokenHash);

    if (!admin) {
      throw new ApiError(
        "Invalid or expired reset token",
        ErrorCodes.TOKEN_EXPIRED,
        400
      );
    }

    const passwordHash = await hashPassword(input.newPassword);
    await adminRepository.updatePassword(admin.id, passwordHash);
    await adminRepository.clearResetToken(admin.id);
    await adminRepository.clearRefreshToken(admin.id);

    logger.info({ adminId: admin.id }, "Admin password reset successful");
  }

  async changePassword(
    adminId: number,
    input: AdminChangePasswordInput
  ): Promise<void> {
    const admin = await adminRepository.findActiveById(adminId);

    if (!admin) {
      throw new ApiError("Admin not found", ErrorCodes.NOT_FOUND, 404);
    }

    const isValid = await comparePassword(input.oldPassword, admin.password_hash);
    if (!isValid) {
      throw new ApiError(
        "Current password is incorrect",
        ErrorCodes.INVALID_CREDENTIALS,
        401
      );
    }

    const passwordHash = await hashPassword(input.newPassword);
    await adminRepository.updatePassword(admin.id, passwordHash);
    await adminRepository.clearRefreshToken(admin.id);

    logger.info({ adminId: admin.id }, "Admin password changed");
  }

  async getProfile(adminId: number): Promise<AdminPublic> {
    const admin = await adminRepository.findActiveById(adminId);
    if (!admin) {
      throw new ApiError("Admin not found", ErrorCodes.NOT_FOUND, 404);
    }
    return this.toPublicAdmin(admin);
  }

  async updateProfilePhoto(
    adminId: number,
    profilePhoto: string
  ): Promise<AdminPublic> {
    const admin = await adminRepository.findActiveById(adminId);
    if (!admin) {
      throw new ApiError("Admin not found", ErrorCodes.NOT_FOUND, 404);
    }
    await adminRepository.updateProfilePhoto(adminId, profilePhoto);
    const updated = await adminRepository.findActiveById(adminId);
    if (!updated) {
      throw new ApiError("Admin not found", ErrorCodes.NOT_FOUND, 404);
    }
    return this.toPublicAdmin(updated);
  }

  async getProfilePhotoFile(adminId: number): Promise<{
    absolutePath: string;
    contentType: string;
    filename: string;
  }> {
    const admin = await adminRepository.findActiveById(adminId);
    if (!admin?.profile_photo) {
      throw new ApiError("Profile photo not found", ErrorCodes.NOT_FOUND, 404);
    }
    const filename = admin.profile_photo.split("/").pop() ?? "profile.jpg";
    return {
      absolutePath: resolveUploadAbsolutePath(admin.profile_photo),
      contentType: getMimeTypeFromFilename(filename),
      filename,
    };
  }

  async resolveAuthUser(adminId: number): Promise<AuthUser> {
    const admin = await adminRepository.findActiveById(adminId);
    if (!admin) {
      throw new ApiError("Admin not found", ErrorCodes.UNAUTHORIZED, 401);
    }

    const allowedRoles: string[] = [Roles.ADMIN, Roles.SUPER_ADMIN];
    if (!allowedRoles.includes(admin.role)) {
      throw new ApiError("Forbidden", ErrorCodes.FORBIDDEN, 403);
    }

    return this.buildAuthUser(admin);
  }
}

export const adminAuthService = new AdminAuthService();
