import type { CatalogStatus } from "../../shared/constants/catalog";
import type { ListQueryOptions } from "../../shared/utils/query-builder";

/** Products are never deleted (no `deleted_at`); `status` hides them from new invoices. */
export interface ProductRow {
  id: number;
  code: string | null;
  name: string;
  unit: string;
  unit_price: string;
  description: string | null;
  status: CatalogStatus;
  created_at: Date;
  updated_at: Date;
  created_by: number | null;
  updated_by: number | null;
}

export interface ProductPublic {
  id: number;
  code: string | null;
  name: string;
  unit: string;
  unitPrice: number;
  description: string | null;
  status: CatalogStatus;
  createdAt: Date;
  updatedAt: Date;
}

/** Active products for the invoice line picker. */
export interface ProductOption {
  id: number;
  code: string | null;
  name: string;
  unit: string;
  unitPrice: number;
}

export interface CreateProductInput {
  code?: string | null;
  name: string;
  unit: string;
  unitPrice: number;
  description?: string | null;
  status?: CatalogStatus;
}

export type UpdateProductInput = Partial<CreateProductInput>;

export interface ProductListQuery extends ListQueryOptions {}
