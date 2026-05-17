import type { BaseEntity } from "../../shared/types/common.types";
import type { RoleName } from "../../shared/constants/roles";

export type UserStatus = "active" | "inactive" | "pending";

export interface UserRow extends BaseEntity {
  name: string;
  email: string;
  password_hash: string;
  role_id: number;
  status: UserStatus;
  email_verified: boolean;
}

export interface UserPublic {
  id: number;
  name: string;
  email: string;
  role: RoleName;
  status: UserStatus;
  emailVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateUserInput {
  name: string;
  email: string;
  password: string;
  roleId?: number;
  status?: UserStatus;
}

export interface UpdateUserInput {
  name?: string;
  email?: string;
  password?: string;
  roleId?: number;
  status?: UserStatus;
}
