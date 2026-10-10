import type { CreateEmployeeBody } from "../../src/modules/employees/employee.validation";

// Date.now() alone repeats within the same millisecond (e.g. bulk create), so add a counter.
let sequence = 0;

export function createEmployeeInput(
  overrides: Partial<CreateEmployeeBody> = {}
): CreateEmployeeBody {
  const suffix = `${Date.now()}${++sequence}`;
  return {
    empName: "John Doe",
    companyName: "Acme Corp",
    dob: "1990-01-15",
    homeAddress: "123 Main Street",
    cityState: "Dubai",
    country: "UAE",
    phoneNo: "+971501234567",
    whatsappNo: "+971501234567",
    emiratesIdNo: `784-${suffix}`,
    emiratesIdExpiryDate: "2027-12-31",
    visaExpiryDate: "2026-06-30",
    passportNo: `P${suffix}`,
    passportExpiryDate: "2028-01-01",
    drivingLicenseNo: `DL${suffix}`,
    drivingLicenseExpiryDate: "2027-06-30",
    email: `employee-${suffix}@example.com`,
    password: "SecurePass123",
    status: "active",
    comments: "Test employee",
    ...overrides,
  };
}
