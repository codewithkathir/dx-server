import type { BaseEntity } from "../../shared/types/common.types";
import type { ListQueryOptions } from "../../shared/utils/query-builder";

export const EmployeeStatuses = ["active", "inactive", "suspended"] as const;
export type EmployeeStatus = (typeof EmployeeStatuses)[number];

export const DEFAULT_EMPLOYEE_ROLE = "employee";

export interface EmployeeRow extends BaseEntity {
  emp_name: string;
  company_name: string;
  dob: Date;
  home_address: string;
  city_state: string;
  country: string;
  phone_no: string;
  whatsapp_no: string | null;
  emirates_id_no: string;
  emirates_id_expiry_date: Date;
  visa_expiry_date: Date;
  passport_no: string;
  passport_expiry_date: Date;
  driving_license_no: string | null;
  driving_license_expiry_date: Date | null;
  email: string;
  password_hash: string;
  status: EmployeeStatus;
  comments: string | null;
  role: string;
  profile_photo: string | null;
  last_login_at: Date | null;
}

export interface EmployeePublic {
  id: number;
  empName: string;
  companyName: string;
  dob: string;
  homeAddress: string;
  cityState: string;
  country: string;
  phoneNo: string;
  whatsappNo: string | null;
  emiratesIdNo: string;
  emiratesIdExpiryDate: string;
  visaExpiryDate: string;
  passportNo: string;
  passportExpiryDate: string;
  drivingLicenseNo: string | null;
  drivingLicenseExpiryDate: string | null;
  email: string;
  status: EmployeeStatus;
  comments: string | null;
  role: string;
  profilePhoto: string | null;
  lastLoginAt: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateEmployeeInput {
  empName: string;
  companyName: string;
  dob: string;
  homeAddress: string;
  cityState: string;
  country: string;
  phoneNo: string;
  whatsappNo?: string;
  emiratesIdNo: string;
  emiratesIdExpiryDate: string;
  visaExpiryDate: string;
  passportNo: string;
  passportExpiryDate: string;
  drivingLicenseNo?: string;
  drivingLicenseExpiryDate?: string | null;
  email: string;
  password: string;
  status?: EmployeeStatus;
  comments?: string;
  role?: string;
  profilePhoto?: string | null;
}

export interface UpdateEmployeeInput {
  empName?: string;
  companyName?: string;
  dob?: string;
  homeAddress?: string;
  cityState?: string;
  country?: string;
  phoneNo?: string;
  whatsappNo?: string | null;
  emiratesIdNo?: string;
  emiratesIdExpiryDate?: string;
  visaExpiryDate?: string;
  passportNo?: string;
  passportExpiryDate?: string;
  drivingLicenseNo?: string | null;
  drivingLicenseExpiryDate?: string | null;
  email?: string;
  password?: string;
  status?: EmployeeStatus;
  comments?: string | null;
  role?: string;
  profilePhoto?: string | null;
}

export interface EmployeeListQuery extends ListQueryOptions {
  country?: string;
  cityState?: string;
  companyName?: string;
  createdAtFrom?: string;
  createdAtTo?: string;
  visaExpiry?: string;
  passportExpiry?: string;
}

export interface BulkCreateResult {
  created: EmployeePublic[];
  failed: Array<{ index: number; email: string; message: string }>;
}
