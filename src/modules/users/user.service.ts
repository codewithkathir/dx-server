import { ApiError } from "../../shared/errors/api.error";
import { ErrorCodes } from "../../shared/errors/error-codes";
import { Roles } from "../../shared/constants/roles";
import type { RoleName } from "../../shared/constants/roles";
import { hashPassword } from "../../shared/utils/password.util";
import { buildPaginationMeta } from "../../shared/utils/pagination.util";
import type { PaginationQuery } from "../../shared/validators/common.validation";
import { roleRepository } from "../roles/role.repository";
import { userRepository } from "./user.repository";
import type {
  CreateUserInput,
  UpdateUserInput,
  UserPublic,
  UserRow,
} from "./user.types";

interface UserWithRoleRow extends UserRow {
  role_name: string;
}

class UserService {
  private toPublicUser(row: UserWithRoleRow): UserPublic {
    return {
      id: row.id,
      name: row.name,
      email: row.email,
      role: row.role_name as RoleName,
      status: row.status,
      emailVerified: row.email_verified,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  async listUsers(query: PaginationQuery) {
    const { data, total } = await userRepository.findAllPaginated(query);
    return {
      data: data.map((row) => this.toPublicUser(row)),
      meta: buildPaginationMeta(query.page, query.limit, total),
    };
  }

  async getUserById(id: number): Promise<UserPublic> {
    const user = await userRepository.findByIdWithRole(id);
    if (!user) {
      throw new ApiError("User not found", ErrorCodes.NOT_FOUND, 404);
    }
    return this.toPublicUser(user);
  }

  async createUser(
    input: CreateUserInput,
    createdBy?: number
  ): Promise<UserPublic> {
    const existing = await userRepository.findByEmail(input.email);
    if (existing) {
      throw new ApiError(
        "Email already registered",
        ErrorCodes.CONFLICT,
        409
      );
    }

    let roleId = input.roleId;
    if (!roleId) {
      const defaultRole = await roleRepository.findByName(Roles.USER);
      if (!defaultRole) {
        throw new ApiError(
          "Default role not configured",
          ErrorCodes.INTERNAL_ERROR,
          500
        );
      }
      roleId = defaultRole.id;
    }

    const passwordHash = await hashPassword(input.password);
    const userId = await userRepository.create({
      name: input.name,
      email: input.email,
      password_hash: passwordHash,
      role_id: roleId,
      status: input.status ?? "pending",
      created_by: createdBy,
    });

    const user = await userRepository.findByIdWithRole(userId);
    if (!user) {
      throw new ApiError(
        "Failed to create user",
        ErrorCodes.INTERNAL_ERROR,
        500
      );
    }

    return this.toPublicUser(user);
  }

  async updateUser(
    id: number,
    input: UpdateUserInput,
    updatedBy?: number
  ): Promise<UserPublic> {
    const existing = await userRepository.findByIdWithRole(id);
    if (!existing) {
      throw new ApiError("User not found", ErrorCodes.NOT_FOUND, 404);
    }

    if (input.email && input.email !== existing.email) {
      const emailTaken = await userRepository.findByEmail(input.email);
      if (emailTaken && emailTaken.id !== id) {
        throw new ApiError(
          "Email already in use",
          ErrorCodes.CONFLICT,
          409
        );
      }
    }

    const updatePayload: UpdateUserInput & { password_hash?: string } = {
      ...input,
    };

    if (input.password) {
      updatePayload.password_hash = await hashPassword(input.password);
    }

    await userRepository.updateById(id, updatePayload, updatedBy);

    const updated = await userRepository.findByIdWithRole(id);
    if (!updated) {
      throw new ApiError("User not found", ErrorCodes.NOT_FOUND, 404);
    }

    return this.toPublicUser(updated);
  }

  async deleteUser(id: number, deletedBy?: number): Promise<void> {
    const existing = await userRepository.findById(id);
    if (!existing) {
      throw new ApiError("User not found", ErrorCodes.NOT_FOUND, 404);
    }
    await userRepository.softDelete(id, deletedBy);
  }
}

export const userService = new UserService();
