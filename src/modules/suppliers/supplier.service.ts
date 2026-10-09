import { ApiError } from "../../shared/errors/api.error";
import { ErrorCodes } from "../../shared/errors/error-codes";
import { buildPaginationMeta } from "../../shared/utils/pagination.util";
import { supplierRepository } from "./supplier.repository";
import type {
  CreateSupplierInput,
  SupplierListQuery,
  SupplierOption,
  SupplierPublic,
  SupplierRow,
  UpdateSupplierInput,
} from "./supplier.types";

class SupplierService {
  toPublic(row: SupplierRow): SupplierPublic {
    return {
      id: row.id,
      companyName: row.company_name,
      contactName1: row.contact_name_1,
      contactName2: row.contact_name_2,
      companyAddress: row.company_address,
      cityState: row.city_state,
      country: row.country,
      phone1: row.phone_1,
      phone2: row.phone_2,
      email: row.email,
      whatsappNo: row.whatsapp_no,
      status: row.status,
      comments: row.comments,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  async listSuppliers(query: SupplierListQuery) {
    const { data, total } = await supplierRepository.findAllPaginated(query);
    return {
      data: data.map((row) => this.toPublic(row)),
      meta: buildPaginationMeta(query.page, query.limit, total),
    };
  }

  async listOptions(): Promise<SupplierOption[]> {
    return supplierRepository.findActiveOptions();
  }

  async getSupplierById(id: number): Promise<SupplierPublic> {
    return this.toPublic(await this.assertSupplierExists(id));
  }

  async assertSupplierExists(id: number): Promise<SupplierRow> {
    const row = await supplierRepository.findById(id);
    if (!row) {
      throw new ApiError("Supplier not found", ErrorCodes.NOT_FOUND, 404);
    }
    return row;
  }

  private async assertNameAvailable(name: string, exceptId?: number): Promise<void> {
    const existing = await supplierRepository.findByCompanyName(name);
    if (existing && existing.id !== exceptId) {
      throw new ApiError(
        "A supplier with this company name already exists",
        ErrorCodes.CONFLICT,
        409
      );
    }
  }

  async createSupplier(
    input: CreateSupplierInput,
    createdBy?: number
  ): Promise<SupplierPublic> {
    await this.assertNameAvailable(input.companyName);
    const id = await supplierRepository.create(input, createdBy);
    return this.getSupplierById(id);
  }

  async updateSupplier(
    id: number,
    input: UpdateSupplierInput,
    updatedBy?: number
  ): Promise<SupplierPublic> {
    await this.assertSupplierExists(id);
    if (input.companyName) await this.assertNameAvailable(input.companyName, id);
    await supplierRepository.updateById(id, input, updatedBy);
    return this.getSupplierById(id);
  }

  async deleteSupplier(id: number, updatedBy?: number): Promise<void> {
    await this.assertSupplierExists(id);
    if (await supplierRepository.hasBills(id)) {
      throw new ApiError(
        "Supplier has bills and cannot be deleted. Set it to inactive instead.",
        ErrorCodes.CONFLICT,
        409
      );
    }
    await supplierRepository.softDelete(id, updatedBy);
  }
}

export const supplierService = new SupplierService();
