import path from "path";
import { ApiError } from "../../shared/errors/api.error";
import { ErrorCodes } from "../../shared/errors/error-codes";
import { buildPaginationMeta } from "../../shared/utils/pagination.util";
import {
  getMimeTypeFromFilename,
  resolveUploadAbsolutePath,
} from "../../shared/utils/file.util";
import { expenseRepository } from "./expense.repository";
import type { ExpenseSupportFileResource } from "./expense.service";
import { expenseService } from "./expense.service";
import type {
  AdminExpenseFilterQuery,
  AdminExpenseListQuery,
  AdminExpenseSummary,
  ExpensePublic,
  UpdateAdminExpenseStatusInput,
} from "./expense.types";
import type {
  AdminExpenseListQueryParams,
  AdminExpenseSummaryQueryParams,
} from "./admin-expense.validation";

class AdminExpenseService {
  private toListQuery(params: AdminExpenseListQueryParams): AdminExpenseListQuery {
    return {
      page: params.page,
      limit: params.limit,
      search: params.search,
      sortBy: params.sortBy,
      order: params.order,
      employeeId: params.employeeId,
      adminStatus: params.status,
      categoryId: params.categoryId,
      dateFrom: params.dateFrom,
      dateTo: params.dateTo,
    };
  }

  private toSummaryFilters(
    params: AdminExpenseSummaryQueryParams
  ): AdminExpenseFilterQuery {
    return {
      employeeId: params.employeeId,
      adminStatus: params.status,
      categoryId: params.categoryId,
      dateFrom: params.dateFrom,
      dateTo: params.dateTo,
    };
  }

  async listExpenses(params: AdminExpenseListQueryParams) {
    const query = this.toListQuery(params);
    const { data, total } = await expenseRepository.findAllPaginatedForAdmin(
      query
    );
    return {
      data: data.map((row) => expenseService.toPublicExpense(row)),
      meta: buildPaginationMeta(query.page, query.limit, total),
    };
  }

  async getExpenseById(expenseId: number): Promise<ExpensePublic> {
    const row = await expenseRepository.findById(expenseId);
    if (!row) {
      throw new ApiError("Expense not found", ErrorCodes.NOT_FOUND, 404);
    }
    return expenseService.toPublicExpense(row);
  }

  async updateExpenseStatus(
    expenseId: number,
    input: UpdateAdminExpenseStatusInput
  ): Promise<ExpensePublic> {
    const existing = await expenseRepository.findById(expenseId);
    if (!existing) {
      throw new ApiError("Expense not found", ErrorCodes.NOT_FOUND, 404);
    }

    await expenseRepository.updateAdminStatusById(expenseId, input);
    return this.getExpenseById(expenseId);
  }

  async deleteExpense(expenseId: number): Promise<void> {
    const existing = await expenseRepository.findById(expenseId);
    if (!existing) {
      throw new ApiError("Expense not found", ErrorCodes.NOT_FOUND, 404);
    }
    await expenseRepository.softDeleteById(expenseId);
  }

  async getSummary(
    params: AdminExpenseSummaryQueryParams
  ): Promise<AdminExpenseSummary> {
    return expenseRepository.getSummaryForAdmin(this.toSummaryFilters(params));
  }

  async getSupportFile(expenseId: number): Promise<ExpenseSupportFileResource> {
    const row = await expenseRepository.findById(expenseId);
    if (!row) {
      throw new ApiError("Expense not found", ErrorCodes.NOT_FOUND, 404);
    }
    if (!row.support_file) {
      throw new ApiError("Attachment not found", ErrorCodes.NOT_FOUND, 404);
    }

    const filename = path.basename(row.support_file);
    const absolutePath = resolveUploadAbsolutePath(row.support_file);

    return {
      absolutePath,
      contentType: getMimeTypeFromFilename(filename),
      filename,
    };
  }
}

export const adminExpenseService = new AdminExpenseService();
