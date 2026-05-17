import type { Knex } from "knex";
import bcrypt from "bcrypt";

const SAMPLE_EMAILS = [
  "john.doe@example.com",
  "jane.smith@example.com",
  "ahmed.hassan@example.com",
] as const;

const SAMPLE_EMPLOYEES = [
  {
    employee_code: "EMP001",
    emp_name: "John Doe",
    company_name: "Acme Corporation",
    dob: "1990-01-15",
    home_address: "123 Sheikh Zayed Road, Building 5",
    city_state: "Dubai",
    country: "UAE",
    phone_no: "+971501234567",
    whatsapp_no: "+971501234567",
    emirates_id_no: "784-1990-1234567-1",
    emirates_id_expiry_date: "2027-12-31",
    visa_expiry_date: "2026-06-30",
    passport_no: "P1234567",
    passport_expiry_date: "2028-01-01",
    driving_license_no: "DL123456",
    driving_license_expiry_date: "2027-06-30",
    email: SAMPLE_EMAILS[0],
    status: "active" as const,
    comments: "Sample employee – seed data",
    role: "employee",
  },
  {
    employee_code: "EMP002",
    emp_name: "Jane Smith",
    company_name: "Global Tech LLC",
    dob: "1992-05-20",
    home_address: "456 Al Wasl Road",
    city_state: "Dubai",
    country: "UAE",
    phone_no: "+971509876543",
    whatsapp_no: "+971509876543",
    emirates_id_no: "784-1992-9876543-2",
    emirates_id_expiry_date: "2028-03-15",
    visa_expiry_date: "2027-01-15",
    passport_no: "P7654321",
    passport_expiry_date: "2029-05-20",
    driving_license_no: null,
    driving_license_expiry_date: null,
    email: SAMPLE_EMAILS[1],
    status: "active" as const,
    comments: "Sample employee – seed data",
    role: "employee",
  },
  {
    employee_code: "EMP003",
    emp_name: "Ahmed Hassan",
    company_name: "Desert Logistics",
    dob: "1988-11-08",
    home_address: "789 Industrial Area 2",
    city_state: "Sharjah",
    country: "UAE",
    phone_no: "+971507654321",
    whatsapp_no: null,
    emirates_id_no: "784-1988-5555555-3",
    emirates_id_expiry_date: "2026-11-30",
    visa_expiry_date: "2026-08-01",
    passport_no: "P9988776",
    passport_expiry_date: "2027-11-08",
    driving_license_no: "DL998877",
    driving_license_expiry_date: "2026-12-31",
    email: SAMPLE_EMAILS[2],
    status: "inactive" as const,
    comments: "Inactive sample for filter testing",
    role: "employee",
  },
];

export interface EmployeeSeedOptions {
  /** Replace existing sample employees (same emails) and re-insert */
  force?: boolean;
}

export async function seed(
  knex: Knex,
  options: EmployeeSeedOptions = {}
): Promise<{ inserted: number; skipped: boolean }> {
  const { force = false } = options;

  const existingCount = await knex("employees")
    .whereIn("email", [...SAMPLE_EMAILS])
    .whereNull("deleted_at")
    .count("* as c");

  const hasSampleData = Number((existingCount[0] as { c: number }).c) > 0;

  if (hasSampleData && !force) {
    return { inserted: 0, skipped: true };
  }

  if (force && hasSampleData) {
    await knex("employees").whereIn("email", [...SAMPLE_EMAILS]).del();
  }

  const stillExists = await knex("employees")
    .where({ email: SAMPLE_EMAILS[0] })
    .whereNull("deleted_at")
    .first();

  if (stillExists) {
    return { inserted: 0, skipped: true };
  }

  const admin = await knex("users")
    .where({ email: "admin@example.com" })
    .whereNull("deleted_at")
    .first();

  const createdBy = admin?.id ?? null;
  const passwordHash = await bcrypt.hash("Employee@12345", 12);

  const rows = SAMPLE_EMPLOYEES.map((emp) => ({
    employee_code: emp.employee_code,
    emp_name: emp.emp_name,
    company_name: emp.company_name,
    dob: emp.dob,
    home_address: emp.home_address,
    city_state: emp.city_state,
    country: emp.country,
    phone_no: emp.phone_no,
    whatsapp_no: emp.whatsapp_no,
    emirates_id_no: emp.emirates_id_no,
    emirates_id_expiry_date: emp.emirates_id_expiry_date,
    visa_expiry_date: emp.visa_expiry_date,
    passport_no: emp.passport_no,
    passport_expiry_date: emp.passport_expiry_date,
    driving_license_no: emp.driving_license_no,
    driving_license_expiry_date: emp.driving_license_expiry_date,
    email: emp.email,
    password_hash: passwordHash,
    status: emp.status,
    comments: emp.comments,
    role: emp.role,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: knex.fn.now(),
    updated_at: knex.fn.now(),
  }));

  await knex("employees").insert(rows);
  return { inserted: rows.length, skipped: false };
}
