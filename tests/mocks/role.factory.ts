import type { RoleRow } from "../../src/modules/roles/role.types";
import { Roles } from "../../src/shared/constants/roles";

const now = new Date();

export function createRoleRow(overrides: Partial<RoleRow> = {}): RoleRow {
  return {
    id: 4,
    name: Roles.USER,
    description: "Standard user",
    created_at: now,
    updated_at: now,
    deleted_at: null,
    created_by: null,
    updated_by: null,
    ...overrides,
  };
}
