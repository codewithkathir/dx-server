jest.mock("../../../../src/modules/users/user.repository");
jest.mock("../../../../src/modules/roles/role.repository");
jest.mock("../../../../src/modules/auth/auth.repository");
jest.mock("../../../../src/modules/users/user.service");
jest.mock("../../../../src/shared/utils/password.util");
jest.mock("../../../../src/shared/utils/jwt.util");

import { authService } from "../../../../src/modules/auth/auth.service";
import { userRepository } from "../../../../src/modules/users/user.repository";
import { roleRepository } from "../../../../src/modules/roles/role.repository";
import { authRepository } from "../../../../src/modules/auth/auth.repository";
import { userService } from "../../../../src/modules/users/user.service";
import { comparePassword } from "../../../../src/shared/utils/password.util";
import {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
} from "../../../../src/shared/utils/jwt.util";
import { ErrorCodes } from "../../../../src/shared/errors/error-codes";
import { Roles } from "../../../../src/shared/constants/roles";
import { createUserRow } from "../../../mocks/user.factory";

const mockedUserRepo = userRepository as jest.Mocked<typeof userRepository>;
const mockedRoleRepo = roleRepository as jest.Mocked<typeof roleRepository>;
const mockedAuthRepo = authRepository as jest.Mocked<typeof authRepository>;
const mockedUserService = userService as jest.Mocked<typeof userService>;
const mockedComparePassword = comparePassword as jest.MockedFunction<
  typeof comparePassword
>;
const mockedGenerateAccessToken = generateAccessToken as jest.MockedFunction<
  typeof generateAccessToken
>;
const mockedGenerateRefreshToken = generateRefreshToken as jest.MockedFunction<
  typeof generateRefreshToken
>;
const mockedVerifyRefreshToken = verifyRefreshToken as jest.MockedFunction<
  typeof verifyRefreshToken
>;

describe("AuthService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedGenerateAccessToken.mockReturnValue("access-token");
    mockedGenerateRefreshToken.mockReturnValue("refresh-token");
    mockedAuthRepo.storeRefreshToken.mockResolvedValue();
    mockedRoleRepo.getPermissionsByRoleName.mockResolvedValue(["user.read"]);
  });

  describe("login", () => {
    it("throws INVALID_CREDENTIALS when user not found", async () => {
      mockedUserRepo.findByEmail.mockResolvedValue(undefined);

      await expect(
        authService.login({ email: "missing@example.com", password: "pass" })
      ).rejects.toMatchObject({
        errorCode: ErrorCodes.INVALID_CREDENTIALS,
        statusCode: 401,
      });
    });

    it("throws AUTH_FAILED when account is not active", async () => {
      mockedUserRepo.findByEmail.mockResolvedValue(
        createUserRow({ status: "pending" })
      );

      await expect(
        authService.login({ email: "test@example.com", password: "pass" })
      ).rejects.toMatchObject({
        errorCode: ErrorCodes.AUTH_FAILED,
        statusCode: 403,
      });
    });

    it("throws INVALID_CREDENTIALS when password is wrong", async () => {
      mockedUserRepo.findByEmail.mockResolvedValue(createUserRow());
      mockedComparePassword.mockResolvedValue(false);

      await expect(
        authService.login({ email: "test@example.com", password: "wrong" })
      ).rejects.toMatchObject({
        errorCode: ErrorCodes.INVALID_CREDENTIALS,
        statusCode: 401,
      });
    });

    it("returns tokens and user on successful login", async () => {
      const row = createUserRow();
      mockedUserRepo.findByEmail.mockResolvedValue(row);
      mockedComparePassword.mockResolvedValue(true);
      mockedUserRepo.findByIdWithRole.mockResolvedValue(row);

      const result = await authService.login({
        email: "test@example.com",
        password: "correct",
      });

      expect(result.accessToken).toBe("access-token");
      expect(result.refreshToken).toBe("refresh-token");
      expect(result.user.email).toBe("test@example.com");
      expect(mockedAuthRepo.storeRefreshToken).toHaveBeenCalled();
    });
  });

  describe("register", () => {
    it("delegates to userService and issues tokens", async () => {
      const publicUser = {
        id: 5,
        name: "New",
        email: "new@example.com",
        role: Roles.USER,
        status: "active" as const,
        emailVerified: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockedUserService.createUser.mockResolvedValue(publicUser);
      mockedUserRepo.findByIdWithRole.mockResolvedValue(
        createUserRow({ id: 5, email: "new@example.com" })
      );

      const result = await authService.register({
        name: "New",
        email: "new@example.com",
        password: "password123",
      });

      expect(mockedUserService.createUser).toHaveBeenCalled();
      expect(result.accessToken).toBeDefined();
      expect(result.user.id).toBe(5);
    });
  });

  describe("refreshTokens", () => {
    it("throws TOKEN_EXPIRED for invalid refresh token", async () => {
      mockedVerifyRefreshToken.mockImplementation(() => {
        throw new Error("invalid");
      });

      await expect(
        authService.refreshTokens({ refreshToken: "bad-token" })
      ).rejects.toMatchObject({
        errorCode: ErrorCodes.TOKEN_EXPIRED,
        statusCode: 401,
      });
    });

    it("issues new tokens when refresh token is valid", async () => {
      mockedVerifyRefreshToken.mockReturnValue({ sub: 1 });
      mockedAuthRepo.findValidRefreshToken.mockResolvedValue({
        id: 1,
        user_id: 1,
        token_hash: "hash",
        expires_at: new Date(Date.now() + 86400000),
        is_revoked: false,
      });
      mockedAuthRepo.revokeRefreshToken.mockResolvedValue();
      mockedUserRepo.findByIdWithRole.mockResolvedValue(createUserRow());

      const result = await authService.refreshTokens({
        refreshToken: "valid-token",
      });

      expect(result.accessToken).toBe("access-token");
      expect(mockedAuthRepo.revokeRefreshToken).toHaveBeenCalledWith(
        "valid-token"
      );
    });
  });

  describe("logout", () => {
    it("revokes refresh token", async () => {
      mockedAuthRepo.revokeRefreshToken.mockResolvedValue();

      await authService.logout("refresh-token");

      expect(mockedAuthRepo.revokeRefreshToken).toHaveBeenCalledWith(
        "refresh-token"
      );
    });
  });
});
