jest.mock("../../../../src/modules/users/user.repository");
jest.mock("../../../../src/modules/roles/role.repository");
jest.mock("../../../../src/shared/utils/password.util", () => ({
  hashPassword: jest.fn().mockResolvedValue("hashed_password"),
}));

import { userService } from "../../../../src/modules/users/user.service";
import { userRepository } from "../../../../src/modules/users/user.repository";
import { roleRepository } from "../../../../src/modules/roles/role.repository";
import { ErrorCodes } from "../../../../src/shared/errors/error-codes";
import { Roles } from "../../../../src/shared/constants/roles";
import { createUserRow } from "../../../mocks/user.factory";
import { createRoleRow } from "../../../mocks/role.factory";

const mockedUserRepo = userRepository as jest.Mocked<typeof userRepository>;
const mockedRoleRepo = roleRepository as jest.Mocked<typeof roleRepository>;

describe("UserService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("getUserById", () => {
    it("returns public user when found", async () => {
      const row = createUserRow();
      mockedUserRepo.findByIdWithRole.mockResolvedValue(row);

      const result = await userService.getUserById(1);

      expect(result.id).toBe(1);
      expect(result.email).toBe("test@example.com");
      expect(result.role).toBe(Roles.USER);
      expect(result).not.toHaveProperty("password_hash");
    });

    it("throws NOT_FOUND when user does not exist", async () => {
      mockedUserRepo.findByIdWithRole.mockResolvedValue(undefined);

      await expect(userService.getUserById(999)).rejects.toMatchObject({
        errorCode: ErrorCodes.NOT_FOUND,
        statusCode: 404,
      });
    });
  });

  describe("createUser", () => {
    it("throws CONFLICT when email already exists", async () => {
      mockedUserRepo.findByEmail.mockResolvedValue(createUserRow());

      await expect(
        userService.createUser({
          name: "Test",
          email: "test@example.com",
          password: "password123",
        })
      ).rejects.toMatchObject({
        errorCode: ErrorCodes.CONFLICT,
        statusCode: 409,
      });
    });

    it("creates user with default USER role", async () => {
      mockedUserRepo.findByEmail.mockResolvedValue(undefined);
      mockedRoleRepo.findByName.mockResolvedValue(createRoleRow());
      mockedUserRepo.create.mockResolvedValue(2);
      mockedUserRepo.findByIdWithRole.mockResolvedValue(
        createUserRow({ id: 2, email: "new@example.com" })
      );

      const result = await userService.createUser({
        name: "New User",
        email: "new@example.com",
        password: "password123",
      });

      expect(mockedRoleRepo.findByName).toHaveBeenCalledWith(Roles.USER);
      expect(mockedUserRepo.create).toHaveBeenCalled();
      expect(result.email).toBe("new@example.com");
    });
  });

  describe("deleteUser", () => {
    it("throws NOT_FOUND when user does not exist", async () => {
      mockedUserRepo.findById.mockResolvedValue(undefined);

      await expect(userService.deleteUser(999)).rejects.toMatchObject({
        errorCode: ErrorCodes.NOT_FOUND,
        statusCode: 404,
      });
    });

    it("soft deletes existing user", async () => {
      mockedUserRepo.findById.mockResolvedValue(createUserRow());
      mockedUserRepo.softDelete.mockResolvedValue(1);

      await userService.deleteUser(1, 1);

      expect(mockedUserRepo.softDelete).toHaveBeenCalledWith(1, 1);
    });
  });

  describe("listUsers", () => {
    it("returns paginated users", async () => {
      mockedUserRepo.findAllPaginated.mockResolvedValue({
        data: [createUserRow()],
        total: 1,
      });

      const result = await userService.listUsers({
        page: 1,
        limit: 10,
        order: "desc",
      });

      expect(result.data).toHaveLength(1);
      expect(result.meta.total).toBe(1);
      expect(result.meta.totalPages).toBe(1);
    });
  });
});
