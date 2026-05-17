import type { BaseEntity } from "../../shared/types/common.types";

export interface RoleRow extends BaseEntity {
  name: string;
  description: string | null;
}

export interface PermissionRow extends BaseEntity {
  name: string;
  description: string | null;
}

export interface RolePublic {
  id: number;
  name: string;
  description: string | null;
}
