import type { Knex } from "knex";
import {
  DEFAULT_ADMIN_EXPENSE_STATUS,
  DEFAULT_EMPLOYEE_EXPENSE_STATUS,
} from "../../shared/constants/expense";
import { BaseRepository } from "../../shared/repositories/base.repository";
import {
  applyListQuery,
  paginateQuery,
} from "../../shared/utils/query-builder";
import type {
  AdminExpenseFilterQuery,
  AdminExpenseListQuery,
  AdminExpenseSummary,
  CreateExpenseInput,
  ExpenseListQuery,
  ExpenseRow,
  UpdateAdminExpenseStatusInput,
  UpdateExpenseInput,
} from "./expense.types";

class ExpenseRepository extends BaseRepository<ExpenseRow> {
  constructor() {
    super("expenses");
  }

  private applyEmployeeScope(
    query: Knex.QueryBuilder,
    employeeId: number
  ): Knex.QueryBuilder {
    return query.where("employee_id", employeeId);
  }

  private applyListFilters(
    query: Knex.QueryBuilder,
    options: ExpenseListQuery
  ): Knex.QueryBuilder {
    if (options.categoryId) {
      query = query.where("category_id", options.categoryId);
    }
    if (options.dateFrom) {
      query = query.where("date", ">=", options.dateFrom);
    }
    if (options.dateTo) {
      query = query.where("date", "<=", options.dateTo);
    }
    return query;
  }

  private buildListQuery(
    employeeId: number,
    options: ExpenseListQuery
  ): Knex.QueryBuilder {
    let query = applyListQuery(this.baseQuery(), options, {
      table: "expenses",
      searchableFields: ["description"],
      sortableFields: ["created_at", "date", "amount", "employee_status"],
      defaultSort: "created_at",
    });
    query = this.applyEmployeeScope(query, employeeId);
    return this.applyListFilters(query, options);
  }

  async findByIdForEmployee(
    id: number,
    employeeId: number
  ): Promise<ExpenseRow | undefined> {
    return this.applyEmployeeScope(this.baseQuery(), employeeId)
      .where({ id })
      .first() as Promise<ExpenseRow | undefined>;
  }

  async findAllPaginatedForEmployee(
    employeeId: number,
    options: ExpenseListQuery
  ): Promise<{ data: ExpenseRow[]; total: number }> {
    return paginateQuery<ExpenseRow>(
      this.buildListQuery(employeeId, options),
      options
    );
  }

  async create(
    employeeId: number,
    input: CreateExpenseInput
  ): Promise<number> {
    const [id] = await this.db(this.tableName).insert({
      employee_id: employeeId,
      date: input.date,
      amount: input.amount,
      whom: input.whom,
      category_id: input.categoryId,
      sub_category_id: input.subCategoryId,
      sub_sub_category_id: input.subSubCategoryId ?? null,
      description: input.description ?? null,
      payment_method_id: input.paymentMethodId,
      support_file: input.supportFile ?? null,
      employee_status: DEFAULT_EMPLOYEE_EXPENSE_STATUS,
      admin_status: DEFAULT_ADMIN_EXPENSE_STATUS,
      created_at: this.db.fn.now(),
      updated_at: this.db.fn.now(),
    });
    return id as number;
  }

  private applyAdminListFilters(
    query: Knex.QueryBuilder,
    options: AdminExpenseFilterQuery
  ): Knex.QueryBuilder {
    if (options.employeeId) {
      query = query.where("employee_id", options.employeeId);
    }
    if (options.adminStatus) {
      query = query.where("admin_status", options.adminStatus);
    }
    if (options.categoryId) {
      query = query.where("category_id", options.categoryId);
    }
    if (options.dateFrom) {
      query = query.where("date", ">=", options.dateFrom);
    }
    if (options.dateTo) {
      query = query.where("date", "<=", options.dateTo);
    }
    return query;
  }

  private buildAdminListQuery(options: AdminExpenseListQuery): Knex.QueryBuilder {
    let query = applyListQuery(this.baseQuery(), options, {
      table: "expenses",
      searchableFields: ["description"],
      sortableFields: [
        "created_at",
        "date",
        "amount",
        "employee_status",
        "admin_status",
      ],
      defaultSort: "created_at",
    });
    return this.applyAdminListFilters(query, options);
  }

  async findAllPaginatedForAdmin(
    options: AdminExpenseListQuery
  ): Promise<{ data: ExpenseRow[]; total: number }> {
    return paginateQuery<ExpenseRow>(this.buildAdminListQuery(options), options);
  }

  async getSummaryForAdmin(
    filters: AdminExpenseFilterQuery
  ): Promise<AdminExpenseSummary> {
    let query = this.baseQuery().select(
      "admin_status",
      this.db.raw("COUNT(*) as count"),
      this.db.raw("COALESCE(SUM(amount), 0) as amount")
    );
    query = this.applyAdminListFilters(query, filters);
    const rows = (await query.groupBy("admin_status")) as Array<{
      admin_status: string;
      count: number | string;
      amount: number | string;
    }>;

    const byStatus = rows.map((row) => ({
      adminStatus: row.admin_status as AdminExpenseSummary["byStatus"][0]["adminStatus"],
      count: Number(row.count),
      amount: Number(row.amount),
    }));

    const totalCount = byStatus.reduce((sum, item) => sum + item.count, 0);
    const totalAmount = byStatus.reduce((sum, item) => sum + item.amount, 0);

    return { totalCount, totalAmount, byStatus };
  }

  async updateAdminStatusById(
    id: number,
    input: UpdateAdminExpenseStatusInput
  ): Promise<number> {
    return this.baseQuery()
      .where({ id })
      .update({
        admin_status: input.adminStatus,
        updated_at: this.db.fn.now(),
      });
  }

  async softDeleteById(id: number): Promise<number> {
    return this.baseQuery()
      .where({ id })
      .update({
        deleted_at: this.db.fn.now(),
        updated_at: this.db.fn.now(),
      });
  }

  async updateByIdForEmployee(
    id: number,
    employeeId: number,
    input: UpdateExpenseInput
  ): Promise<number> {
    const data: Record<string, unknown> = { updated_at: this.db.fn.now() };
    if (input.date !== undefined) data.date = input.date;
    if (input.amount !== undefined) data.amount = input.amount;
    if (input.whom !== undefined) data.whom = input.whom;
    if (input.categoryId !== undefined) data.category_id = input.categoryId;
    if (input.subCategoryId !== undefined) {
      data.sub_category_id = input.subCategoryId;
    }
    if (input.subSubCategoryId !== undefined) {
      data.sub_sub_category_id = input.subSubCategoryId;
    }
    if (input.description !== undefined) data.description = input.description;
    if (input.paymentMethodId !== undefined) {
      data.payment_method_id = input.paymentMethodId;
    }
    if (input.supportFile !== undefined) data.support_file = input.supportFile;

    return this.applyEmployeeScope(this.baseQuery(), employeeId)
      .where({ id })
      .update(data);
  }

  async softDeleteForEmployee(id: number, employeeId: number): Promise<number> {
    return this.applyEmployeeScope(this.baseQuery(), employeeId)
      .where({ id })
      .update({
        deleted_at: this.db.fn.now(),
        updated_at: this.db.fn.now(),
      });
  }
}

export const expenseRepository = new ExpenseRepository();
