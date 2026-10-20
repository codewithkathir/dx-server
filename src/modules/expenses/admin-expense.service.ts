import path from "path";
import type { Knex } from "knex";
import { db } from "../../database/knex";
import { ApiError } from "../../shared/errors/api.error";
import { ErrorCodes } from "../../shared/errors/error-codes";
import { logger } from "../../shared/logger/logger";
import { todayIso } from "../../shared/utils/money.util";
import { buildPaginationMeta } from "../../shared/utils/pagination.util";
import { assetMaintenanceService } from "../asset-maintenance/asset-maintenance.service";
import { employeeAccountService } from "../employee-accounts/employee-account.service";
import type { ApprovalPreview } from "../employee-accounts/employee-account.types";
import { createBillForExpense } from "../payables/expense-bill.helper";
import { payableRepository } from "../payables/payable.repository";
import { payableService } from "../payables/payable.service";
import {
  getMimeTypeFromFilename,
  resolveUploadAbsolutePath,
} from "../../shared/utils/file.util";
import { notifyClaimApproved, notifyClaimRejected } from "./expense-notifications";
import { expenseRepository } from "./expense.repository";
import type { ExpenseSupportFileResource } from "./expense.service";
import { expenseService } from "./expense.service";
import type {
  AdminExpenseFilterQuery,
  AdminExpenseListQuery,
  AdminExpenseSummary,
  ExpensePublic,
  UpdateAdminExpenseStatusInput,
  UpdateExpenseVehicleInput,
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
      assetId: params.assetId,
      adminStatus: params.status,
      stage: params.stage,
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
    const reimbursements = await payableService.getReimbursements(data.map((row) => row.id));
    return {
      data: await expenseService.withVehicles(
        data.map((row) => ({
          ...expenseService.toPublicExpense(row),
          reimbursement: reimbursements.get(row.id) ?? null,
        }))
      ),
      meta: buildPaginationMeta(query.page, query.limit, total),
    };
  }

  async getExpenseById(expenseId: number): Promise<ExpensePublic> {
    const row = await expenseRepository.findById(expenseId);
    if (!row) {
      throw new ApiError("Expense not found", ErrorCodes.NOT_FOUND, 404);
    }
    const reimbursements = await payableService.getReimbursements([expenseId]);
    const [expense] = await expenseService.withVehicles([
      { ...expenseService.toPublicExpense(row), reimbursement: reimbursements.get(expenseId) ?? null },
    ]);
    return expense as ExpensePublic;
  }

  /** Admin approve dialog: how the claim would split between advance and reimbursement. */
  async getApprovalPreview(expenseId: number): Promise<ApprovalPreview> {
    const expense = await expenseRepository.findById(expenseId);
    if (!expense) {
      throw new ApiError("Expense not found", ErrorCodes.NOT_FOUND, 404);
    }
    return employeeAccountService.previewSettlement(expense);
  }

  /**
   * Approving always draws the claim from the employee's advance first; only what
   * the advance can't cover becomes a payable bill. A claim the advance
   * covers fully is settled ("paid") straight away; otherwise it becomes
   * "paid" through payments on its bill.
   */
  async approveExpense(
    expenseId: number,
    approvedBy?: number,
    note?: string | null
  ): Promise<ExpensePublic> {
    let fromAdvance = 0;
    await db.transaction(async (trx) => {
      const expense = await expenseRepository.findByIdForUpdate(trx, expenseId);
      if (!expense) {
        throw new ApiError("Expense not found", ErrorCodes.NOT_FOUND, 404);
      }
      if (expense.employee_status !== "pending" || expense.admin_status !== "pending") {
        throw new ApiError(
          `Expense is already ${expense.employee_status === "pending" ? expense.admin_status : expense.employee_status}`,
          ErrorCodes.CONFLICT,
          409
        );
      }
      const settlement = await employeeAccountService.settleExpense(trx, expense, approvedBy);
      fromAdvance = settlement.fromAdvance;
      if (settlement.reimbursable > 0) {
        await createBillForExpense(
          trx,
          {
            id: expense.id,
            employee_id: expense.employee_id,
            amount: settlement.reimbursable.toFixed(2),
            category_id: expense.category_id,
            description: expense.description,
          },
          { billDate: todayIso(), createdBy: approvedBy }
        );
      }
      // Vehicle claims: oil change → service record, fuel → odometer reading.
      await assetMaintenanceService.linkExpense(trx, expense, approvedBy);
      await expenseRepository.setStatuses(trx, expenseId, {
        employee_status: "approved",
        // Nothing left to reimburse: the advance settled it.
        ...(settlement.reimbursable === 0 ? { admin_status: "paid" } : {}),
        advance_amount: settlement.fromAdvance.toFixed(2),
        reimbursable_amount: settlement.reimbursable.toFixed(2),
        review_note: note?.trim() || null,
        reviewed_at: trx.fn.now(),
        reviewed_by: approvedBy ?? null,
      });
    });
    logger.info({ expenseId, approvedBy, fromAdvance }, "Expense approved");
    notifyClaimApproved(expenseId);
    return this.getExpenseById(expenseId);
  }

  /** Rejecting cancels an unpaid reimbursement bill, if one exists. */
  async rejectExpense(
    expenseId: number,
    rejectedBy?: number,
    note?: string | null
  ): Promise<ExpensePublic> {
    await db.transaction(async (trx) => {
      const expense = await expenseRepository.findByIdForUpdate(trx, expenseId);
      if (!expense) {
        throw new ApiError("Expense not found", ErrorCodes.NOT_FOUND, 404);
      }
      if (expense.employee_status === "rejected") {
        throw new ApiError("Expense is already rejected", ErrorCodes.CONFLICT, 409);
      }
      await this.cancelUnpaidReimbursement(trx, expenseId, rejectedBy);
      await assetMaintenanceService.unlinkExpense(trx, expenseId);
      await employeeAccountService.reverseExpense(trx, expenseId, "Claim rejected", rejectedBy);
      await expenseRepository.setStatuses(trx, expenseId, {
        employee_status: "rejected",
        admin_status: "rejected",
        advance_amount: "0.00",
        reimbursable_amount: null,
        review_note: note?.trim() || null,
        reviewed_at: trx.fn.now(),
        reviewed_by: rejectedBy ?? null,
      });
    });
    logger.info({ expenseId, rejectedBy }, "Expense rejected");
    notifyClaimRejected(expenseId);
    return this.getExpenseById(expenseId);
  }

  private async cancelUnpaidReimbursement(
    trx: Knex.Transaction,
    expenseId: number,
    updatedBy?: number
  ): Promise<void> {
    const bill = await payableRepository.findByExpenseId(expenseId, trx);
    if (!bill || bill.status === "cancelled") return;
    if ((await payableRepository.sumPayments(trx, bill.id)) > 0) {
      throw new ApiError(
        `Reimbursement ${bill.bill_no} has payments. Delete them in Payables first.`,
        ErrorCodes.CONFLICT,
        409
      );
    }
    await payableRepository.updateBill(trx, bill.id, {
      status: "cancelled",
      updated_by: updatedBy ?? null,
    });
  }

  /**
   * Legacy status endpoint. "paid" now comes only from paying the
   * reimbursement bill; "rejected" goes through the reject flow.
   */
  async updateExpenseStatus(
    expenseId: number,
    input: UpdateAdminExpenseStatusInput,
    updatedBy?: number
  ): Promise<ExpensePublic> {
    if (input.adminStatus === "rejected") {
      return this.rejectExpense(expenseId, updatedBy);
    }
    throw new ApiError(
      input.adminStatus === "paid"
        ? "Approve the expense, then record a payment on its reimbursement bill in Payables"
        : "An expense can't be set back to pending",
      ErrorCodes.VALIDATION_ERROR,
      400
    );
  }

  async deleteExpense(expenseId: number, deletedBy?: number): Promise<void> {
    await db.transaction(async (trx) => {
      const expense = await expenseRepository.findByIdForUpdate(trx, expenseId);
      if (!expense) {
        throw new ApiError("Expense not found", ErrorCodes.NOT_FOUND, 404);
      }
      await this.cancelUnpaidReimbursement(trx, expenseId, deletedBy);
      await assetMaintenanceService.unlinkExpense(trx, expenseId);
      await employeeAccountService.reverseExpense(trx, expenseId, "Claim deleted", deletedBy);
      await expenseRepository.softDeleteById(expenseId, trx);
    });
  }

  /**
   * Set or fix the vehicle on a claim. On an approved claim the service record
   * or odometer reading it created is rebuilt for the new vehicle and km.
   */
  async updateExpenseVehicle(
    expenseId: number,
    input: UpdateExpenseVehicleInput,
    updatedBy?: number
  ): Promise<ExpensePublic> {
    if (input.assetId === null && input.odometerKm !== null) {
      throw new ApiError("Pick a vehicle for the odometer reading", ErrorCodes.VALIDATION_ERROR, 400);
    }
    await db.transaction(async (trx) => {
      const expense = await expenseRepository.findByIdForUpdate(trx, expenseId);
      if (!expense) {
        throw new ApiError("Expense not found", ErrorCodes.NOT_FOUND, 404);
      }
      if (expense.employee_status === "rejected" || expense.admin_status === "rejected") {
        throw new ApiError("This expense was rejected", ErrorCodes.CONFLICT, 409);
      }
      const linked = expense.employee_status === "approved" || expense.admin_status === "paid";
      if (linked) await assetMaintenanceService.unlinkExpense(trx, expenseId);
      if (input.assetId !== null) {
        const date = String(expense.date).slice(0, 10);
        // Pending claims are checked now; approved ones when the reading is recorded below.
        if (linked) await assetMaintenanceService.assertVehicle(input.assetId, date, null);
        else await assetMaintenanceService.assertVehicle(input.assetId, date, input.odometerKm);
      }
      const vehicle = { asset_id: input.assetId, odometer_km: input.odometerKm };
      await expenseRepository.setVehicle(trx, expenseId, vehicle);
      if (linked) await assetMaintenanceService.linkExpense(trx, { ...expense, ...vehicle }, updatedBy);
    });
    logger.info({ expenseId, assetId: input.assetId, updatedBy }, "Expense vehicle updated");
    return this.getExpenseById(expenseId);
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
