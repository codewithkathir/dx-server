import type { BaseEntity } from "../../shared/types/common.types";
import type { CatalogStatus } from "../../shared/constants/catalog";
import type { ListQueryOptions } from "../../shared/utils/query-builder";

export interface PaymentMethodRow extends BaseEntity {
  name: string;
  code: string | null;
  description: string | null;
  status: CatalogStatus;
  sort_order: number;
  created_by: number | null;
  updated_by: number | null;
}

export interface PaymentMethodPublic {
  id: number;
  name: string;
  code: string | null;
  description: string | null;
  status: CatalogStatus;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreatePaymentMethodInput {
  name: string;
  code?: string | null;
  description?: string | null;
  status?: CatalogStatus;
  sortOrder?: number;
}

export interface UpdatePaymentMethodInput {
  name?: string;
  code?: string | null;
  description?: string | null;
  status?: CatalogStatus;
  sortOrder?: number;
}

export interface PaymentMethodListQuery extends ListQueryOptions {}
