import type { BaseEntity } from "../../shared/types/common.types";
import type { CatalogStatus } from "../../shared/constants/catalog";
import type { ListQueryOptions } from "../../shared/utils/query-builder";

export interface CategoryRow extends BaseEntity {
  name: string;
  description: string | null;
  status: CatalogStatus;
  created_by: number | null;
  updated_by: number | null;
}

export interface CategoryPublic {
  id: number;
  name: string;
  description: string | null;
  status: CatalogStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateCategoryInput {
  name: string;
  description?: string | null;
  status?: CatalogStatus;
}

export interface UpdateCategoryInput {
  name?: string;
  description?: string | null;
  status?: CatalogStatus;
}

export interface CategoryListQuery extends ListQueryOptions {}
