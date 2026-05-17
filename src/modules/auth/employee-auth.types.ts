import type { EmployeeStatus } from "../employees/employee.types";

export interface EmployeeAuthRow {
  id: number;
  emp_name: string;
  company_name: string;
  email: string;
  password_hash: string;
  status: EmployeeStatus;
  role: string;
  profile_photo: string | null;
  phone_no: string;
  city_state: string;
  country: string;
  dob: Date;
  home_address: string;
  whatsapp_no: string | null;
  reset_token_hash: string | null;
  reset_token_expiry: Date | null;
  refresh_token_hash: string | null;
  refresh_token_expiry: Date | null;
  last_login_at: Date | null;
  created_at: Date;
  updated_at: Date;
  deleted_at: Date | null;
}

export interface EmployeeAuthPublic {
  id: number;
  empName: string;
  companyName: string;
  email: string;
  status: EmployeeStatus;
  role: string;
  profilePhoto: string | null;
  phoneNo: string;
  cityState: string;
  country: string;
  dob: string;
  homeAddress: string;
  whatsappNo: string | null;
  lastLoginAt: string | null;
}

export interface EmployeeAuthResponse {
  accessToken: string;
  refreshToken: string;
  employee: EmployeeAuthPublic;
}

export interface EmployeeLoginInput {
  email: string;
  password: string;
}

export interface EmployeeRefreshInput {
  refreshToken: string;
}

export interface EmployeeForgotPasswordInput {
  email: string;
}

export interface EmployeeResetPasswordInput {
  token: string;
  newPassword: string;
}

export interface EmployeeChangePasswordInput {
  oldPassword: string;
  newPassword: string;
}
