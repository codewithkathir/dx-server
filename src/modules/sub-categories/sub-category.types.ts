import type { BaseEntity } from "../../shared/types/common.types";
import type { CatalogStatus } from "../../shared/constants/catalog";
import type { ListQueryOptions } from "../../shared/utils/query-builder";

export interface SubCategoryRow extends BaseEntity {
  category_id: number;
  name: string;
  description: string | null;
  status: CatalogStatus;
  service_type_id: number | null;
  created_by: number | null;
  updated_by: number | null;
}

export interface SubCategoryPublic {
  id: number;
  categoryId: number;
  name: string;
  description: string | null;
  status: CatalogStatus;
  /** Approved vehicle claims here create a service record of this type. */
  serviceTypeId: number | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateSubCategoryInput {
  categoryId: number;
  name: string;
  description?: string | null;
  status?: CatalogStatus;
  serviceTypeId?: number | null;
}

export interface UpdateSubCategoryInput {
  categoryId?: number;
  name?: string;
  description?: string | null;
  status?: CatalogStatus;
  serviceTypeId?: number | null;
}

export interface SubCategoryListQuery extends ListQueryOptions {
  categoryId?: number;
}
