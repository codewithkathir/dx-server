import { ApiError } from "../../shared/errors/api.error";
import { ErrorCodes } from "../../shared/errors/error-codes";
import { Actors } from "../../shared/constants/actors";
import type { RoleName } from "../../shared/constants/roles";
import { comparePassword } from "../../shared/utils/password.util";
import {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
} from "../../shared/utils/jwt.util";
import type { AuthUser } from "../../shared/types/express";
import { roleRepository } from "../roles/role.repository";
import { userRepository } from "../users/user.repository";
import { userService } from "../users/user.service";
import { authRepository } from "./auth.repository";
import type {
  AuthResponse,
  LoginInput,
  RefreshTokenInput,
  RegisterInput,
} from "./auth.types";
import type { UserPublic } from "../users/user.types";

class AuthService {
  private getRefreshExpiryDate(): Date {
    const expiresIn = process.env.REFRESH_TOKEN_EXPIRES_IN ?? "7d";
    const days = parseInt(expiresIn, 10) || 7;
    const date = new Date();
    date.setDate(date.getDate() + (expiresIn.endsWith("d") ? days : 7));
    return date;
  }

  private async buildAuthUser(userId: number): Promise<AuthUser> {
    const user = await userRepository.findByIdWithRole(userId);
    if (!user) {
      throw new ApiError("User not found", ErrorCodes.NOT_FOUND, 404);
    }

    const permissions = await roleRepository.getPermissionsByRoleName(
      user.role_name as RoleName
    );

    return {
      id: user.id,
      email: user.email,
      role: user.role_name as RoleName,
      permissions,
      actor: Actors.USER,
    };
  }

  private async issueTokens(authUser: AuthUser): Promise<{
    accessToken: string;
    refreshToken: string;
  }> {
    const accessToken = generateAccessToken(authUser);
    const refreshToken = generateRefreshToken(authUser.id);

    await authRepository.storeRefreshToken(
      authUser.id,
      refreshToken,
      this.getRefreshExpiryDate()
    );

    return { accessToken, refreshToken };
  }

  async register(input: RegisterInput): Promise<AuthResponse> {
    const user = await userService.createUser({
      name: input.name,
      email: input.email,
      password: input.password,
      status: "active",
    });

    const authUser = await this.buildAuthUser(user.id);
    const tokens = await this.issueTokens(authUser);

    return {
      ...tokens,
      user,
    };
  }

  async login(input: LoginInput): Promise<AuthResponse> {
    const user = await userRepository.findByEmail(input.email);

    if (!user) {
      throw new ApiError(
        "Invalid credentials",
        ErrorCodes.INVALID_CREDENTIALS,
        401
      );
    }

    if (user.status !== "active") {
      throw new ApiError(
        "Account is not active",
        ErrorCodes.AUTH_FAILED,
        403
      );
    }

    const isValid = await comparePassword(input.password, user.password_hash);
    if (!isValid) {
      throw new ApiError(
        "Invalid credentials",
        ErrorCodes.INVALID_CREDENTIALS,
        401
      );
    }

    const authUser = await this.buildAuthUser(user.id);
    const tokens = await this.issueTokens(authUser);

    const publicUser: UserPublic = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role_name as RoleName,
      status: user.status,
      emailVerified: user.email_verified,
      createdAt: user.created_at,
      updatedAt: user.updated_at,
    };

    return {
      ...tokens,
      user: publicUser,
    };
  }

  async refreshTokens(input: RefreshTokenInput): Promise<{
    accessToken: string;
    refreshToken: string;
  }> {
    let payload: { sub: number };
    try {
      payload = verifyRefreshToken(input.refreshToken);
    } catch {
      throw new ApiError("Invalid refresh token", ErrorCodes.TOKEN_EXPIRED, 401);
    }

    const stored = await authRepository.findValidRefreshToken(
      input.refreshToken
    );
    if (!stored || stored.user_id !== payload.sub) {
      throw new ApiError("Invalid refresh token", ErrorCodes.TOKEN_EXPIRED, 401);
    }

    await authRepository.revokeRefreshToken(input.refreshToken);

    const authUser = await this.buildAuthUser(payload.sub);
    return this.issueTokens(authUser);
  }

  async logout(refreshToken: string): Promise<void> {
    await authRepository.revokeRefreshToken(refreshToken);
  }

  async getProfile(userId: number): Promise<UserPublic> {
    return userService.getUserById(userId);
  }
}

export const authService = new AuthService();
