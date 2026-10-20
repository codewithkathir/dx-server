import type { BaseEntity } from "../../shared/types/common.types";
import type { CatalogStatus } from "../../shared/constants/catalog";
import type { ListQueryOptions } from "../../shared/utils/query-builder";

export interface CategoryRow extends BaseEntity {
  /** Present on list queries only. */
  sub_category_count?: number | string;
  name: string;
  description: string | null;
  status: CatalogStatus;
  /** MySQL boolean: 0/1. */
  is_vehicle_expense: number | boolean;
  created_by: number | null;
  updated_by: number | null;
}

export interface CategoryPublic {
  id: number;
  /** Number of sub categories (list responses). */
  subCategoryCount?: number;
  name: string;
  description: string | null;
  status: CatalogStatus;
  /** Claims in this category ask for a vehicle and its odometer. */
  isVehicleExpense: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateCategoryInput {
  name: string;
  description?: string | null;
  status?: CatalogStatus;
  isVehicleExpense?: boolean;
}

export interface UpdateCategoryInput {
  name?: string;
  description?: string | null;
  status?: CatalogStatus;
  isVehicleExpense?: boolean;
}

export interface CategoryListQuery extends ListQueryOptions {}
