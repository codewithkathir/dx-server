import { ApiError } from "../../shared/errors/api.error";
import { ErrorCodes } from "../../shared/errors/error-codes";
import { buildPaginationMeta } from "../../shared/utils/pagination.util";
import { paymentMethodRepository } from "./payment-method.repository";
import type {
  CreatePaymentMethodInput,
  PaymentMethodListQuery,
  PaymentMethodPublic,
  PaymentMethodRow,
  UpdatePaymentMethodInput,
} from "./payment-method.types";

class PaymentMethodService {
  private toPublic(row: PaymentMethodRow): PaymentMethodPublic {
    return {
      id: row.id,
      name: row.name,
      code: row.code,
      description: row.description,
      status: row.status,
      sortOrder: row.sort_order,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  async listPaymentMethods(query: PaymentMethodListQuery) {
    const { data, total } =
      await paymentMethodRepository.findAllPaginated(query);
    return {
      data: data.map((row) => this.toPublic(row)),
      meta: buildPaginationMeta(query.page, query.limit, total),
    };
  }

  async getPaymentMethodById(id: number): Promise<PaymentMethodPublic> {
    const row = await paymentMethodRepository.findById(id);
    if (!row) {
      throw new ApiError("Payment method not found", ErrorCodes.NOT_FOUND, 404);
    }
    return this.toPublic(row);
  }

  async createPaymentMethod(
    input: CreatePaymentMethodInput,
    createdBy?: number
  ): Promise<PaymentMethodPublic> {
    const existingName = await paymentMethodRepository.findByName(input.name);
    if (existingName) {
      throw new ApiError(
        "Payment method with this name already exists",
        ErrorCodes.CONFLICT,
        409
      );
    }

    if (input.code) {
      const existingCode = await paymentMethodRepository.findByCode(input.code);
      if (existingCode) {
        throw new ApiError(
          "Payment method with this code already exists",
          ErrorCodes.CONFLICT,
          409
        );
      }
    }

    const id = await paymentMethodRepository.create(input, createdBy);
    return this.getPaymentMethodById(id);
  }

  async updatePaymentMethod(
    id: number,
    input: UpdatePaymentMethodInput,
    updatedBy?: number
  ): Promise<PaymentMethodPublic> {
    const row = await paymentMethodRepository.findById(id);
    if (!row) {
      throw new ApiError("Payment method not found", ErrorCodes.NOT_FOUND, 404);
    }

    if (input.name && input.name.toLowerCase() !== row.name.toLowerCase()) {
      const existingName = await paymentMethodRepository.findByName(input.name);
      if (existingName && existingName.id !== id) {
        throw new ApiError(
          "Payment method with this name already exists",
          ErrorCodes.CONFLICT,
          409
        );
      }
    }

    if (input.code && input.code.toLowerCase() !== (row.code ?? "").toLowerCase()) {
      const existingCode = await paymentMethodRepository.findByCode(input.code);
      if (existingCode && existingCode.id !== id) {
        throw new ApiError(
          "Payment method with this code already exists",
          ErrorCodes.CONFLICT,
          409
        );
      }
    }

    await paymentMethodRepository.updateById(id, input, updatedBy);
    return this.getPaymentMethodById(id);
  }

  async deletePaymentMethod(id: number, updatedBy?: number): Promise<void> {
    const row = await paymentMethodRepository.findById(id);
    if (!row) {
      throw new ApiError("Payment method not found", ErrorCodes.NOT_FOUND, 404);
    }
    await paymentMethodRepository.softDelete(id, updatedBy);
  }
}

export const paymentMethodService = new PaymentMethodService();
