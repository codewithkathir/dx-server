import type { UserRow } from "../../src/modules/users/user.types";
import { Roles } from "../../src/shared/constants/roles";

export interface UserWithRoleFactory extends UserRow {
  role_name: string;
}

const now = new Date();

export function createUserRow(
  overrides: Partial<UserWithRoleFactory> = {}
): UserWithRoleFactory {
  return {
    id: 1,
    name: "Test User",
    email: "test@example.com",
    password_hash: "$2b$12$hashedpasswordplaceholder",
    role_id: 4,
    status: "active",
    email_verified: true,
    created_at: now,
    updated_at: now,
    deleted_at: null,
    created_by: null,
    updated_by: null,
    role_name: Roles.USER,
    ...overrides,
  };
}

export function createUserPublicInput() {
  return {
    name: "New User",
    email: `user-${Date.now()}@example.com`,
    password: "SecurePass123",
  };
}
