import type { BaseEntity } from "../../shared/types/common.types";
import type { CatalogStatus } from "../../shared/constants/catalog";
import type { ListQueryOptions } from "../../shared/utils/query-builder";

export interface SubSubCategoryRow extends BaseEntity {
  category_id: number;
  sub_category_id: number;
  name: string;
  description: string | null;
  status: CatalogStatus;
  service_type_id: number | null;
  created_by: number | null;
  updated_by: number | null;
}

export interface SubSubCategoryPublic {
  id: number;
  categoryId: number;
  subCategoryId: number;
  name: string;
  description: string | null;
  status: CatalogStatus;
  /** Approved vehicle claims here create a service record of this type. */
  serviceTypeId: number | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateSubSubCategoryInput {
  categoryId: number;
  subCategoryId: number;
  name: string;
  description?: string | null;
  status?: CatalogStatus;
  serviceTypeId?: number | null;
}

export interface UpdateSubSubCategoryInput {
  categoryId?: number;
  subCategoryId?: number;
  name?: string;
  description?: string | null;
  status?: CatalogStatus;
  serviceTypeId?: number | null;
}

export interface SubSubCategoryListQuery extends ListQueryOptions {
  categoryId?: number;
  subCategoryId?: number;
}
