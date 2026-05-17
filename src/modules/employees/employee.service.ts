import { db } from "../../database/knex";
import { ApiError } from "../../shared/errors/api.error";
import { ErrorCodes } from "../../shared/errors/error-codes";
import { hashPassword } from "../../shared/utils/password.util";
import { buildPaginationMeta } from "../../shared/utils/pagination.util";
import {
  getMimeTypeFromFilename,
  resolveUploadAbsolutePath,
} from "../../shared/utils/file.util";
import { employeesToCsv } from "./employee.export.util";
import { employeeRepository } from "./employee.repository";
import type {
  BulkCreateResult,
  CreateEmployeeInput,
  EmployeeListQuery,
  EmployeePublic,
  EmployeeRow,
  EmployeeStatus,
  UpdateEmployeeInput,
} from "./employee.types";
import type { CreateEmployeeBody } from "./employee.validation";

class EmployeeService {
  private formatDate(value: Date | string): string {
    if (value instanceof Date) {
      return value.toISOString().slice(0, 10);
    }
    return String(value).slice(0, 10);
  }

  private toPublicEmployee(row: EmployeeRow): EmployeePublic {
    return {
      id: row.id,
      empName: row.emp_name,
      companyName: row.company_name,
      dob: this.formatDate(row.dob),
      homeAddress: row.home_address,
      cityState: row.city_state,
      country: row.country,
      phoneNo: row.phone_no,
      whatsappNo: row.whatsapp_no,
      emiratesIdNo: row.emirates_id_no,
      emiratesIdExpiryDate: this.formatDate(row.emirates_id_expiry_date),
      visaExpiryDate: this.formatDate(row.visa_expiry_date),
      passportNo: row.passport_no,
      passportExpiryDate: this.formatDate(row.passport_expiry_date),
      drivingLicenseNo: row.driving_license_no,
      drivingLicenseExpiryDate: row.driving_license_expiry_date
        ? this.formatDate(row.driving_license_expiry_date)
        : null,
      email: row.email,
      status: row.status,
      comments: row.comments,
      role: row.role,
      profilePhoto: row.profile_photo,
      lastLoginAt: row.last_login_at
        ? row.last_login_at.toISOString()
        : null,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  async listEmployees(query: EmployeeListQuery) {
    const { data, total } = await employeeRepository.findAllPaginated(query);
    return {
      data: data.map((row) => this.toPublicEmployee(row)),
      meta: buildPaginationMeta(query.page, query.limit, total),
    };
  }

  async getEmployeeById(id: number): Promise<EmployeePublic> {
    const employee = await employeeRepository.findByIdActive(id);
    if (!employee) {
      throw new ApiError("Employee not found", ErrorCodes.NOT_FOUND, 404);
    }
    return this.toPublicEmployee(employee);
  }

  async getProfilePhotoFile(id: number): Promise<{
    absolutePath: string;
    contentType: string;
    filename: string;
  }> {
    const employee = await employeeRepository.findByIdActive(id);
    if (!employee?.profile_photo) {
      throw new ApiError("Profile photo not found", ErrorCodes.NOT_FOUND, 404);
    }

    const filename = employee.profile_photo.split("/").pop() ?? "profile.jpg";
    const absolutePath = resolveUploadAbsolutePath(employee.profile_photo);

    return {
      absolutePath,
      contentType: getMimeTypeFromFilename(filename),
      filename,
    };
  }

  async createEmployee(
    input: CreateEmployeeInput,
    createdBy?: number
  ): Promise<EmployeePublic> {
    const existing = await employeeRepository.findByEmail(input.email);
    if (existing) {
      throw new ApiError(
        "Email already registered",
        ErrorCodes.CONFLICT,
        409
      );
    }

    const passwordHash = await hashPassword(input.password);
    const employeeId = await employeeRepository.create(
      input,
      passwordHash,
      createdBy
    );

    const employee = await employeeRepository.findByIdActive(employeeId);
    if (!employee) {
      throw new ApiError(
        "Failed to create employee",
        ErrorCodes.INTERNAL_ERROR,
        500
      );
    }

    return this.toPublicEmployee(employee);
  }

  async updateEmployee(
    id: number,
    input: UpdateEmployeeInput,
    updatedBy?: number
  ): Promise<EmployeePublic> {
    const existing = await employeeRepository.findByIdActive(id);
    if (!existing) {
      throw new ApiError("Employee not found", ErrorCodes.NOT_FOUND, 404);
    }

    if (input.email && input.email.toLowerCase() !== existing.email) {
      const emailTaken = await employeeRepository.findByEmail(input.email);
      if (emailTaken && emailTaken.id !== id) {
        throw new ApiError("Email already in use", ErrorCodes.CONFLICT, 409);
      }
    }

    const updatePayload: UpdateEmployeeInput & { password_hash?: string } = {
      ...input,
    };

    if (input.password) {
      updatePayload.password_hash = await hashPassword(input.password);
    }

    await employeeRepository.updateById(id, updatePayload, updatedBy);

    const updated = await employeeRepository.findByIdActive(id);
    if (!updated) {
      throw new ApiError("Employee not found", ErrorCodes.NOT_FOUND, 404);
    }

    return this.toPublicEmployee(updated);
  }

  async deleteEmployee(id: number, deletedBy?: number): Promise<void> {
    const existing = await employeeRepository.findByIdActive(id);
    if (!existing) {
      throw new ApiError("Employee not found", ErrorCodes.NOT_FOUND, 404);
    }
    await employeeRepository.softDelete(id, deletedBy);
  }

  async bulkDeleteEmployees(ids: number[], deletedBy?: number): Promise<number> {
    return db.transaction(async (trx) => {
      const existing = await employeeRepository.findActiveByIds(ids, trx);
      if (existing.length === 0) {
        throw new ApiError(
          "No matching employees found",
          ErrorCodes.NOT_FOUND,
          404
        );
      }
      const existingIds = existing.map((row) => row.id);
      return employeeRepository.bulkSoftDelete(existingIds, deletedBy, trx);
    });
  }

  async bulkUpdateStatus(
    ids: number[],
    status: EmployeeStatus,
    updatedBy?: number
  ): Promise<number> {
    return db.transaction(async (trx) => {
      const existing = await employeeRepository.findActiveByIds(ids, trx);
      if (existing.length === 0) {
        throw new ApiError(
          "No matching employees found",
          ErrorCodes.NOT_FOUND,
          404
        );
      }
      const existingIds = existing.map((row) => row.id);
      return employeeRepository.bulkUpdateStatus(
        existingIds,
        status,
        updatedBy,
        trx
      );
    });
  }

  async bulkCreateEmployees(
    employees: CreateEmployeeBody[],
    createdBy?: number
  ): Promise<BulkCreateResult> {
    const created: EmployeePublic[] = [];
    const failed: BulkCreateResult["failed"] = [];

    await db.transaction(async (trx) => {
      for (let index = 0; index < employees.length; index++) {
        const input = employees[index]!;

        try {
          const existing = await employeeRepository.findByEmail(
            input.email,
            trx
          );
          if (existing) {
            failed.push({
              index,
              email: input.email,
              message: "Email already registered",
            });
            continue;
          }

          const passwordHash = await hashPassword(input.password);
          const employeeId = await employeeRepository.create(
            input,
            passwordHash,
            createdBy,
            trx
          );

          const employee = await employeeRepository.findByIdActive(
            employeeId,
            trx
          );
          if (employee) {
            created.push(this.toPublicEmployee(employee));
          }
        } catch (error) {
          failed.push({
            index,
            email: input.email,
            message:
              error instanceof Error ? error.message : "Failed to create employee",
          });
        }
      }
    });

    return { created, failed };
  }

  async exportEmployees(
    query: Omit<EmployeeListQuery, "page" | "limit">,
    format: "csv" | "json"
  ): Promise<{ format: "csv" | "json"; content: string | EmployeePublic[] }> {
    const rows = await employeeRepository.findAllForExport(query);
    const data = rows.map((row) => this.toPublicEmployee(row));

    if (format === "json") {
      return { format: "json", content: data };
    }

    return { format: "csv", content: employeesToCsv(data) };
  }
}

export const employeeService = new EmployeeService();
