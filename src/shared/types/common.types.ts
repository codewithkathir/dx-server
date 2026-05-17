export interface BaseEntity {
  id: number;
  created_at: Date;
  updated_at: Date;
  deleted_at: Date | null;
  created_by: number | null;
  updated_by: number | null;
}

export interface PaginationParams {
  page: number;
  limit: number;
  search?: string;
  sortBy?: string;
  order?: "asc" | "desc";
}

export interface PaginatedResult<T> {
  data: T[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
