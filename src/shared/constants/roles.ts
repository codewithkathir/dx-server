export const Roles = {
  SUPER_ADMIN: "SUPER_ADMIN",
  ADMIN: "ADMIN",
  EDITOR: "EDITOR",
  USER: "USER",
  EMPLOYEE: "employee",
} as const;

export type RoleName = (typeof Roles)[keyof typeof Roles];

export const RoleHierarchy: Record<RoleName, number> = {
  SUPER_ADMIN: 4,
  ADMIN: 3,
  EDITOR: 2,
  USER: 1,
  employee: 0,
};
