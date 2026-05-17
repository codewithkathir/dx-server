import type { Knex } from "knex";
import { BaseRepository } from "../../shared/repositories/base.repository";
import {
  applyListQuery,
  paginateQuery,
} from "../../shared/utils/query-builder";
import type {
  CreateEmployeeInput,
  EmployeeListQuery,
  EmployeeRow,
  EmployeeStatus,
  UpdateEmployeeInput,
} from "./employee.types";
import { DEFAULT_EMPLOYEE_ROLE } from "./employee.types";

interface EmployeeInsertRow {
  emp_name: string;
  company_name: string;
  dob: string;
  home_address: string;
  city_state: string;
  country: string;
  phone_no: string;
  whatsapp_no: string | null;
  emirates_id_no: string;
  emirates_id_expiry_date: string;
  visa_expiry_date: string;
  passport_no: string;
  passport_expiry_date: string;
  driving_license_no: string | null;
  driving_license_expiry_date: string | null;
  email: string;
  password_hash: string;
  status: EmployeeStatus;
  comments: string | null;
  role: string;
  profile_photo?: string | null;
  created_by?: number;
}

class EmployeeRepository extends BaseRepository<EmployeeRow> {
  constructor() {
    super("employees");
  }

  private applyEmployeeFilters(
    query: Knex.QueryBuilder,
    options: EmployeeListQuery
  ): Knex.QueryBuilder {
    if (options.country) {
      query = query.where("country", options.country);
    }

    if (options.cityState) {
      query = query.where("city_state", "like", `%${options.cityState}%`);
    }

    if (options.companyName) {
      query = query.where("company_name", "like", `%${options.companyName}%`);
    }

    if (options.createdAtFrom) {
      query = query.where("created_at", ">=", options.createdAtFrom);
    }

    if (options.createdAtTo) {
      query = query.where("created_at", "<=", options.createdAtTo);
    }

    if (options.visaExpiry) {
      query = query.where("visa_expiry_date", "<=", options.visaExpiry);
    }

    if (options.passportExpiry) {
      query = query.where("passport_expiry_date", "<=", options.passportExpiry);
    }

    return query;
  }

  private buildListQuery(options: EmployeeListQuery): Knex.QueryBuilder {
    let query = this.baseQuery();

    query = applyListQuery(query, options, {
      table: "employees",
      searchableFields: ["emp_name", "email", "phone_no"],
      sortableFields: [
        "created_at",
        "emp_name",
        "email",
        "status",
        "company_name",
        "country",
        "visa_expiry_date",
        "passport_expiry_date",
      ],
      defaultSort: "created_at",
    });

    return this.applyEmployeeFilters(query, options);
  }

  async findByEmail(
    email: string,
    trx?: Knex.Transaction
  ): Promise<EmployeeRow | undefined> {
    return this.baseQuery(trx)
      .where("email", email.toLowerCase())
      .first() as Promise<EmployeeRow | undefined>;
  }

  async findByIdActive(
    id: number,
    trx?: Knex.Transaction
  ): Promise<EmployeeRow | undefined> {
    return this.baseQuery(trx).where({ id }).first() as Promise<
      EmployeeRow | undefined
    >;
  }

  async findAllPaginated(
    options: EmployeeListQuery
  ): Promise<{ data: EmployeeRow[]; total: number }> {
    const query = this.buildListQuery(options);
    return paginateQuery<EmployeeRow>(query, options);
  }

  async findAllForExport(
    options: Omit<EmployeeListQuery, "page" | "limit">,
    maxRows = 5000
  ): Promise<EmployeeRow[]> {
    const query = this.buildListQuery({
      ...options,
      page: 1,
      limit: maxRows,
    });
    return query.limit(maxRows) as Promise<EmployeeRow[]>;
  }

  private mapInputToRow(
    input: CreateEmployeeInput,
    passwordHash: string,
    createdBy?: number
  ): EmployeeInsertRow {
    return {
      emp_name: input.empName,
      company_name: input.companyName,
      dob: input.dob,
      home_address: input.homeAddress,
      city_state: input.cityState,
      country: input.country,
      phone_no: input.phoneNo,
      whatsapp_no: input.whatsappNo ?? null,
      emirates_id_no: input.emiratesIdNo,
      emirates_id_expiry_date: input.emiratesIdExpiryDate,
      visa_expiry_date: input.visaExpiryDate,
      passport_no: input.passportNo,
      passport_expiry_date: input.passportExpiryDate,
      driving_license_no: input.drivingLicenseNo ?? null,
      driving_license_expiry_date: input.drivingLicenseExpiryDate ?? null,
      email: input.email.toLowerCase(),
      password_hash: passwordHash,
      status: input.status ?? "active",
      comments: input.comments ?? null,
      role: input.role ?? DEFAULT_EMPLOYEE_ROLE,
      profile_photo: input.profilePhoto ?? null,
      created_by: createdBy,
    };
  }

  async create(
    input: CreateEmployeeInput,
    passwordHash: string,
    createdBy?: number,
    trx?: Knex.Transaction
  ): Promise<number> {
    const query = trx ? trx(this.tableName) : this.db(this.tableName);
    const row = this.mapInputToRow(input, passwordHash, createdBy);
    const [id] = await query.insert({
      ...row,
      created_at: this.db.fn.now(),
      updated_at: this.db.fn.now(),
    });
    return id as number;
  }

  async updateById(
    id: number,
    data: Partial<UpdateEmployeeInput> & { password_hash?: string },
    updatedBy?: number,
    trx?: Knex.Transaction
  ): Promise<number> {
    const updateData: Record<string, unknown> = {
      updated_at: this.db.fn.now(),
    };

    if (data.empName !== undefined) updateData.emp_name = data.empName;
    if (data.companyName !== undefined) updateData.company_name = data.companyName;
    if (data.dob !== undefined) updateData.dob = data.dob;
    if (data.homeAddress !== undefined) updateData.home_address = data.homeAddress;
    if (data.cityState !== undefined) updateData.city_state = data.cityState;
    if (data.country !== undefined) updateData.country = data.country;
    if (data.phoneNo !== undefined) updateData.phone_no = data.phoneNo;
    if (data.whatsappNo !== undefined) updateData.whatsapp_no = data.whatsappNo;
    if (data.emiratesIdNo !== undefined)
      updateData.emirates_id_no = data.emiratesIdNo;
    if (data.emiratesIdExpiryDate !== undefined)
      updateData.emirates_id_expiry_date = data.emiratesIdExpiryDate;
    if (data.visaExpiryDate !== undefined)
      updateData.visa_expiry_date = data.visaExpiryDate;
    if (data.passportNo !== undefined) updateData.passport_no = data.passportNo;
    if (data.passportExpiryDate !== undefined)
      updateData.passport_expiry_date = data.passportExpiryDate;
    if (data.drivingLicenseNo !== undefined)
      updateData.driving_license_no = data.drivingLicenseNo;
    if (data.drivingLicenseExpiryDate !== undefined)
      updateData.driving_license_expiry_date = data.drivingLicenseExpiryDate;
    if (data.email !== undefined) updateData.email = data.email.toLowerCase();
    if (data.password_hash !== undefined)
      updateData.password_hash = data.password_hash;
    if (data.status !== undefined) updateData.status = data.status;
    if (data.comments !== undefined) updateData.comments = data.comments;
    if (data.role !== undefined) updateData.role = data.role;
    if (data.profilePhoto !== undefined)
      updateData.profile_photo = data.profilePhoto;
    if (updatedBy !== undefined) updateData.updated_by = updatedBy;

    const query = trx ? trx(this.tableName) : this.db(this.tableName);
    return query.where({ id }).whereNull("deleted_at").update(updateData);
  }

  async bulkSoftDelete(
    ids: number[],
    updatedBy?: number,
    trx?: Knex.Transaction
  ): Promise<number> {
    const query = trx ? trx(this.tableName) : this.db(this.tableName);
    return query
      .whereIn("id", ids)
      .whereNull("deleted_at")
      .update({
        deleted_at: this.db.fn.now(),
        updated_at: this.db.fn.now(),
        ...(updatedBy !== undefined ? { updated_by: updatedBy } : {}),
      });
  }

  async bulkUpdateStatus(
    ids: number[],
    status: EmployeeStatus,
    updatedBy?: number,
    trx?: Knex.Transaction
  ): Promise<number> {
    const query = trx ? trx(this.tableName) : this.db(this.tableName);
    return query
      .whereIn("id", ids)
      .whereNull("deleted_at")
      .update({
        status,
        updated_at: this.db.fn.now(),
        ...(updatedBy !== undefined ? { updated_by: updatedBy } : {}),
      });
  }

  async findActiveByIds(
    ids: number[],
    trx?: Knex.Transaction
  ): Promise<EmployeeRow[]> {
    return this.baseQuery(trx).whereIn("id", ids) as Promise<EmployeeRow[]>;
  }

  mapCreateInputToInsertRow(
    input: CreateEmployeeInput,
    passwordHash: string,
    createdBy?: number
  ): EmployeeInsertRow {
    return this.mapInputToRow(input, passwordHash, createdBy);
  }
}

export const employeeRepository = new EmployeeRepository();
