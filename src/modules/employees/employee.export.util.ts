import type { EmployeePublic } from "./employee.types";

const CSV_HEADERS = [
  "id",
  "empName",
  "companyName",
  "dob",
  "homeAddress",
  "cityState",
  "country",
  "phoneNo",
  "whatsappNo",
  "emiratesIdNo",
  "emiratesIdExpiryDate",
  "visaExpiryDate",
  "passportNo",
  "passportExpiryDate",
  "drivingLicenseNo",
  "drivingLicenseExpiryDate",
  "email",
  "status",
  "comments",
  "role",
  "lastLoginAt",
  "createdAt",
  "updatedAt",
] as const;

function escapeCsvValue(value: unknown): string {
  if (value === null || value === undefined) {
    return "";
  }
  const str = String(value);
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function employeeToCsvRow(employee: EmployeePublic): string {
  return [
    employee.id,
    employee.empName,
    employee.companyName,
    employee.dob,
    employee.homeAddress,
    employee.cityState,
    employee.country,
    employee.phoneNo,
    employee.whatsappNo,
    employee.emiratesIdNo,
    employee.emiratesIdExpiryDate,
    employee.visaExpiryDate,
    employee.passportNo,
    employee.passportExpiryDate,
    employee.drivingLicenseNo,
    employee.drivingLicenseExpiryDate,
    employee.email,
    employee.status,
    employee.comments,
    employee.role,
    employee.lastLoginAt,
    employee.createdAt,
    employee.updatedAt,
  ]
    .map(escapeCsvValue)
    .join(",");
}

export function employeesToCsv(employees: EmployeePublic[]): string {
  const header = CSV_HEADERS.join(",");
  const rows = employees.map(employeeToCsvRow);
  return [header, ...rows].join("\n");
}
