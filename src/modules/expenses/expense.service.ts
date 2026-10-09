import path from "path";
import { ApiError } from "../../shared/errors/api.error";
import { ErrorCodes } from "../../shared/errors/error-codes";
import { buildPaginationMeta } from "../../shared/utils/pagination.util";
import {
  getMimeTypeFromFilename,
  resolveUploadAbsolutePath,
} from "../../shared/utils/file.util";
import { categoryRepository } from "../categories/category.repository";
import { paymentMethodRepository } from "../payment-methods/payment-method.repository";
import { subCategoryRepository } from "../sub-categories/sub-category.repository";
import { subSubCategoryRepository } from "../sub-sub-categories/sub-sub-category.repository";
import { dropdownRepository } from "../dropdowns/dropdown.repository";
import { expenseRepository } from "./expense.repository";
import { payableService } from "../payables/payable.service";
import type {
  CreateExpenseInput,
  ExpenseListQuery,
  ExpensePublic,
  ExpenseRow,
  UpdateExpenseInput,
  EmployeeExpenseSummary,
} from "./expense.types";

export interface ExpenseSupportFileResource {
  absolutePath: string;
  contentType: string;
  filename: string;
}

class ExpenseService {
  private formatDateForApi(date: string | Date): string {
    if (date instanceof Date) {
      return date.toISOString().slice(0, 10);
    }
    const value = String(date);
    return value.includes("T") ? value.slice(0, 10) : value;
  }

  toPublicExpense(row: ExpenseRow): ExpensePublic {
    return {
      id: row.id,
      employeeId: row.employee_id,
      date: this.formatDateForApi(row.date),
      amount: Number(row.amount),
      whom: row.whom,
      categoryId: row.category_id,
      subCategoryId: row.sub_category_id,
      subSubCategoryId: row.sub_sub_category_id,
      description: row.description,
      paymentMethodId: row.payment_method_id,
      supportFile: row.support_file,
      employeeStatus: row.employee_status,
      adminStatus: row.admin_status,
      reviewNote: row.review_note ?? null,
      reviewedAt: row.reviewed_at ?? null,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  private async assertCatalogReferences(input: {
    categoryId: number;
    subCategoryId: number;
    subSubCategoryId?: number | null;
    paymentMethodId: number;
    whom: number;
  }): Promise<void> {
    const category = await categoryRepository.findById(input.categoryId);
    if (!category || category.status !== "active") {
      throw new ApiError("Category not found", ErrorCodes.NOT_FOUND, 404);
    }

    const subCategory = await subCategoryRepository.findById(input.subCategoryId);
    if (
      !subCategory ||
      subCategory.status !== "active" ||
      subCategory.category_id !== input.categoryId
    ) {
      throw new ApiError("Sub category not found", ErrorCodes.NOT_FOUND, 404);
    }

    if (input.subSubCategoryId != null) {
      const subSub = await subSubCategoryRepository.findById(
        input.subSubCategoryId
      );
      if (
        !subSub ||
        subSub.status !== "active" ||
        subSub.category_id !== input.categoryId ||
        subSub.sub_category_id !== input.subCategoryId
      ) {
        throw new ApiError(
          "Sub sub category not found",
          ErrorCodes.NOT_FOUND,
          404
        );
      }
    }

    const paymentMethod = await paymentMethodRepository.findById(
      input.paymentMethodId
    );
    if (!paymentMethod || paymentMethod.status !== "active") {
      throw new ApiError(
        "Payment method not found",
        ErrorCodes.NOT_FOUND,
        404
      );
    }

    const whomEmployee = await dropdownRepository.findWhomById(input.whom);
    if (!whomEmployee) {
      throw new ApiError("Whom employee not found", ErrorCodes.NOT_FOUND, 404);
    }
  }

  async listMyExpenses(employeeId: number, query: ExpenseListQuery) {
    const { data, total } = await expenseRepository.findAllPaginatedForEmployee(
      employeeId,
      query
    );
    return {
      data: await this.withReimbursements(data.map((row) => this.toPublicExpense(row))),
      meta: buildPaginationMeta(query.page, query.limit, total),
    };
  }

  async getMySummary(employeeId: number): Promise<EmployeeExpenseSummary> {
    const yearStart = `${new Date().getFullYear()}-01-01`;
    return expenseRepository.getSummaryForEmployee(employeeId, yearStart);
  }

  async getMyExpenseById(
    employeeId: number,
    expenseId: number
  ): Promise<ExpensePublic> {
    const row = await expenseRepository.findByIdForEmployee(expenseId, employeeId);
    if (!row) {
      throw new ApiError("Expense not found", ErrorCodes.NOT_FOUND, 404);
    }
    const [expense] = await this.withReimbursements([this.toPublicExpense(row)]);
    return expense as ExpensePublic;
  }

  private async withReimbursements(expenses: ExpensePublic[]): Promise<ExpensePublic[]> {
    const reimbursements = await payableService.getReimbursements(expenses.map((e) => e.id));
    return expenses.map((e) => ({ ...e, reimbursement: reimbursements.get(e.id) ?? null }));
  }

  /** The guarded write matched nothing: the status changed after we read it. */
  private async assertStillEditable(employeeId: number, expenseId: number): Promise<void> {
    const current = await expenseRepository.findByIdForEmployee(expenseId, employeeId);
    if (!current) throw new ApiError("Expense not found", ErrorCodes.NOT_FOUND, 404);
    this.assertEditable(current);
  }

  private assertEditable(row: { employee_status: string }): void {
    if (row.employee_status !== "pending") {
      throw new ApiError(
        `This expense has been ${row.employee_status} and can no longer be changed`,
        ErrorCodes.CONFLICT,
        409
      );
    }
  }

  async createExpense(
    employeeId: number,
    input: CreateExpenseInput
  ): Promise<ExpensePublic> {
    await this.assertCatalogReferences(input);
    const id = await expenseRepository.create(employeeId, input);
    return this.getMyExpenseById(employeeId, id);
  }

  async updateExpense(
    employeeId: number,
    expenseId: number,
    input: UpdateExpenseInput
  ): Promise<ExpensePublic> {
    const existing = await expenseRepository.findByIdForEmployee(
      expenseId,
      employeeId
    );
    if (!existing) {
      throw new ApiError("Expense not found", ErrorCodes.NOT_FOUND, 404);
    }
    this.assertEditable(existing);

    const merged = {
      categoryId: input.categoryId ?? existing.category_id,
      subCategoryId: input.subCategoryId ?? existing.sub_category_id,
      subSubCategoryId:
        input.subSubCategoryId !== undefined
          ? input.subSubCategoryId
          : existing.sub_sub_category_id,
      paymentMethodId: input.paymentMethodId ?? existing.payment_method_id,
      whom: input.whom ?? existing.whom,
    };

    await this.assertCatalogReferences(merged);

    const updated = await expenseRepository.updateByIdForEmployee(expenseId, employeeId, input);
    if (updated === 0) await this.assertStillEditable(employeeId, expenseId);
    return this.getMyExpenseById(employeeId, expenseId);
  }

  async deleteExpense(employeeId: number, expenseId: number): Promise<void> {
    const existing = await expenseRepository.findByIdForEmployee(
      expenseId,
      employeeId
    );
    if (!existing) {
      throw new ApiError("Expense not found", ErrorCodes.NOT_FOUND, 404);
    }
    this.assertEditable(existing);
    const deleted = await expenseRepository.softDeleteForEmployee(expenseId, employeeId);
    if (deleted === 0) await this.assertStillEditable(employeeId, expenseId);
  }

  async getSupportFileForEmployee(
    employeeId: number,
    expenseId: number
  ): Promise<ExpenseSupportFileResource> {
    const row = await expenseRepository.findByIdForEmployee(expenseId, employeeId);
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

export const expenseService = new ExpenseService();
