import { ApiError } from "../../shared/errors/api.error";
import { ErrorCodes } from "../../shared/errors/error-codes";
import {
  getMimeTypeFromFilename,
  removeUploadFile,
  resolveUploadAbsolutePath,
} from "../../shared/utils/file.util";
import { buildPaginationMeta } from "../../shared/utils/pagination.util";
import { customerRepository } from "./customer.repository";
import type {
  CreateCustomerInput,
  CustomerListQuery,
  CustomerOption,
  CustomerPublic,
  CustomerRow,
  UpdateCustomerInput,
} from "./customer.types";
import { assertPhonesMatchCountry } from "../../shared/utils/phone.util";

class CustomerService {
  toPublic(row: CustomerRow): CustomerPublic {
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
      trn: row.trn,
      creditLimit: row.credit_limit === null ? null : Number(row.credit_limit),
      paymentTerms: row.payment_terms,
      status: row.status,
      comments: row.comments,
      photo: row.photo,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      ...(row.outstanding_amount !== undefined ? { outstanding: Number(row.outstanding_amount) } : {}),
    };
  }

  async listCustomers(query: CustomerListQuery) {
    const { data, total } = await customerRepository.findAllPaginated(query);
    return {
      data: data.map((row) => this.toPublic(row)),
      meta: buildPaginationMeta(query.page, query.limit, total),
    };
  }

  async listOptions(): Promise<CustomerOption[]> {
    return customerRepository.findActiveOptions();
  }

  async getCustomerById(id: number): Promise<CustomerPublic> {
    return this.toPublic(await this.assertCustomerExists(id));
  }

  async assertCustomerExists(id: number): Promise<CustomerRow> {
    const row = await customerRepository.findById(id);
    if (!row) {
      throw new ApiError("Customer not found", ErrorCodes.NOT_FOUND, 404);
    }
    return row;
  }

  private async assertNameAvailable(name: string, exceptId?: number): Promise<void> {
    const existing = await customerRepository.findByCompanyName(name);
    if (existing && existing.id !== exceptId) {
      throw new ApiError(
        "A customer with this company name already exists",
        ErrorCodes.CONFLICT,
        409
      );
    }
  }

  async createCustomer(
    input: CreateCustomerInput,
    createdBy?: number
  ): Promise<CustomerPublic> {
    await this.assertNameAvailable(input.companyName);
    assertPhonesMatchCountry(input.country, {
      phone1: { label: "Phone number", value: input.phone1 },
      phone2: { label: "Second phone number", value: input.phone2 },
      whatsappNo: { label: "WhatsApp number", value: input.whatsappNo },
    });
    const id = await customerRepository.create(input, createdBy);
    return this.getCustomerById(id);
  }

  async updateCustomer(
    id: number,
    input: UpdateCustomerInput,
    updatedBy?: number
  ): Promise<CustomerPublic> {
    const existing = await this.assertCustomerExists(id);
    if (input.companyName) await this.assertNameAvailable(input.companyName, id);
    assertPhonesMatchCountry(input.country === undefined ? existing.country : input.country, {
      phone1: { label: "Phone number", value: input.phone1 },
      phone2: { label: "Second phone number", value: input.phone2 },
      whatsappNo: { label: "WhatsApp number", value: input.whatsappNo },
    });
    await customerRepository.updateById(id, input, updatedBy);
    return this.getCustomerById(id);
  }

  async deleteCustomer(id: number, updatedBy?: number): Promise<void> {
    await this.assertCustomerExists(id);
    if (await customerRepository.hasInvoices(id)) {
      throw new ApiError(
        "Customer has invoices and cannot be deleted. Set it to inactive instead.",
        ErrorCodes.CONFLICT,
        409
      );
    }
    await customerRepository.softDelete(id, updatedBy);
  }

  /** Replaces the customer's picture; the old file (or the new one, on failure) is removed. */
  async setPhoto(id: number, photoPath: string, updatedBy?: number): Promise<CustomerPublic> {
    let previous: string | null;
    try {
      previous = (await this.assertCustomerExists(id)).photo;
      await customerRepository.setPhoto(id, photoPath, updatedBy);
    } catch (error) {
      await removeUploadFile(photoPath);
      throw error;
    }
    if (previous) await removeUploadFile(previous);
    return this.getCustomerById(id);
  }

  async removePhoto(id: number, updatedBy?: number): Promise<CustomerPublic> {
    const row = await this.assertCustomerExists(id);
    if (row.photo) {
      await customerRepository.setPhoto(id, null, updatedBy);
      await removeUploadFile(row.photo);
    }
    return this.getCustomerById(id);
  }

  async getPhotoFile(id: number): Promise<{ absolutePath: string; contentType: string; filename: string }> {
    const row = await this.assertCustomerExists(id);
    if (!row.photo) {
      throw new ApiError("Photo not found", ErrorCodes.NOT_FOUND, 404);
    }
    const filename = row.photo.split("/").pop() ?? "photo.jpg";
    return {
      absolutePath: resolveUploadAbsolutePath(row.photo),
      contentType: getMimeTypeFromFilename(filename),
      filename,
    };
  }
}

export const customerService = new CustomerService();
