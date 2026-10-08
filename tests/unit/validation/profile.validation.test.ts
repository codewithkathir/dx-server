import { employeeUpdateProfileSchema } from "../../../src/modules/auth/employee-auth.validation";
import { adminUpdateProfileSchema } from "../../../src/modules/auth/admin-auth.validation";

describe("profile.validation", () => {
  describe("employeeUpdateProfileSchema", () => {
    it("accepts all self-editable fields", () => {
      const result = employeeUpdateProfileSchema.safeParse({
        empName: "Jane Doe",
        dob: "1992-05-20",
        phoneNo: "+971501234567",
        whatsappNo: "+971501234567",
        homeAddress: "456 Al Wasl Road",
        cityState: "Dubai",
        country: "UAE",
      });
      expect(result.success).toBe(true);
    });

    it("accepts a partial update", () => {
      const result = employeeUpdateProfileSchema.safeParse({ cityState: "Abu Dhabi" });
      expect(result.success).toBe(true);
    });

    it("allows clearing whatsappNo with null", () => {
      const result = employeeUpdateProfileSchema.safeParse({ whatsappNo: null });
      expect(result.success).toBe(true);
    });

    it("trims text fields", () => {
      const result = employeeUpdateProfileSchema.safeParse({ empName: "  Jane Doe  " });
      expect(result.success && result.data.empName).toBe("Jane Doe");
    });

    it("rejects an empty body", () => {
      expect(employeeUpdateProfileSchema.safeParse({}).success).toBe(false);
    });

    it.each(["email", "companyName", "role", "status", "passportNo", "emiratesIdNo"])(
      "rejects admin-managed field %s",
      (field) => {
        const result = employeeUpdateProfileSchema.safeParse({ [field]: "x" });
        expect(result.success).toBe(false);
      }
    );

    it("rejects a malformed date of birth", () => {
      expect(employeeUpdateProfileSchema.safeParse({ dob: "20/05/1992" }).success).toBe(false);
    });

    it("rejects a too-short name", () => {
      expect(employeeUpdateProfileSchema.safeParse({ empName: "J" }).success).toBe(false);
    });
  });

  describe("adminUpdateProfileSchema", () => {
    it("accepts a name", () => {
      expect(adminUpdateProfileSchema.safeParse({ name: "Super Admin" }).success).toBe(true);
    });

    it.each(["email", "role", "status"])("rejects non-editable field %s", (field) => {
      const result = adminUpdateProfileSchema.safeParse({ name: "Super Admin", [field]: "x" });
      expect(result.success).toBe(false);
    });

    it("requires a name", () => {
      expect(adminUpdateProfileSchema.safeParse({}).success).toBe(false);
    });
  });
});
