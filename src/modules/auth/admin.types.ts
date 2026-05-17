export const AdminRoles = ["ADMIN", "SUPER_ADMIN"] as const;
export type AdminRole = (typeof AdminRoles)[number];

export const AdminStatuses = ["active", "inactive"] as const;
export type AdminStatus = (typeof AdminStatuses)[number];

export interface AdminRow {
  id: number;
  name: string;
  email: string;
  password_hash: string;
  role: AdminRole;
  status: AdminStatus;
  reset_token_hash: string | null;
  reset_token_expiry: Date | null;
  refresh_token_hash: string | null;
  refresh_token_expiry: Date | null;
  profile_photo: string | null;
  last_login_at: Date | null;
  created_at: Date;
  updated_at: Date;
  deleted_at: Date | null;
}

export interface AdminPublic {
  id: number;
  name: string;
  email: string;
  role: AdminRole;
  status: AdminStatus;
  profilePhoto: string | null;
  lastLoginAt: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface AdminAuthResponse {
  accessToken: string;
  refreshToken: string;
  admin: AdminPublic;
}

export interface AdminLoginInput {
  email: string;
  password: string;
}

export interface AdminRefreshInput {
  refreshToken: string;
}

export interface AdminForgotPasswordInput {
  email: string;
}

export interface AdminResetPasswordInput {
  token: string;
  newPassword: string;
}

export interface AdminChangePasswordInput {
  oldPassword: string;
  newPassword: string;
}
