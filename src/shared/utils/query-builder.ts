import type { Knex } from "knex";
import { getOffset } from "./pagination.util";

export interface ListQueryOptions {
  page: number;
  limit: number;
  search?: string;
  sortBy?: string;
  order?: "asc" | "desc";
  status?: string;
  startDate?: string;
  endDate?: string;
}

export interface QueryBuilderConfig {
  table: string;
  alias?: string;
  searchableFields?: string[];
  sortableFields?: string[];
  defaultSort?: string;
}

export function applySoftDelete<T extends Knex.QueryBuilder>(
  query: T
): T {
  return query.whereNull("deleted_at") as T;
}

export function applyListQuery(
  baseQuery: Knex.QueryBuilder,
  options: ListQueryOptions,
  config: QueryBuilderConfig
): Knex.QueryBuilder {
  let query = applySoftDelete(baseQuery);

  if (options.search && config.searchableFields?.length) {
    const term = `%${options.search}%`;
    query = query.where(function (this: Knex.QueryBuilder) {
      config.searchableFields!.forEach((field, index) => {
        if (index === 0) {
          void this.where(field, "like", term);
        } else {
          void this.orWhere(field, "like", term);
        }
      });
    });
  }

  if (options.status) {
    query = query.where("status", options.status);
  }

  if (options.startDate && options.endDate) {
    query = query.whereBetween("created_at", [
      options.startDate,
      options.endDate,
    ]);
  }

  const allowedSort = config.sortableFields ?? ["created_at"];
  const sortBy =
    options.sortBy && allowedSort.includes(options.sortBy)
      ? options.sortBy
      : config.defaultSort ?? "created_at";
  const order = options.order ?? "desc";

  return query.orderBy(sortBy, order);
}

export async function paginateQuery<T>(
  query: Knex.QueryBuilder,
  options: ListQueryOptions
): Promise<{ data: T[]; total: number }> {
  const countQuery = query.clone().clearSelect().clearOrder().count("* as total");
  const countResult = await countQuery.first();
  const total = Number((countResult as { total: number })?.total ?? 0);

  const offset = getOffset(options.page, options.limit);
  const data = (await query
    .limit(options.limit)
    .offset(offset)) as T[];

  return { data, total };
}
