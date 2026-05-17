import type { PaginationMeta } from "../responses/response.handler";

export function buildPaginationMeta(
  page: number,
  limit: number,
  total: number
): PaginationMeta {
  return {
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit) || 0,
  };
}

export function getOffset(page: number, limit: number): number {
  return (page - 1) * limit;
}
