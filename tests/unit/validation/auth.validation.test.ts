import {
  loginSchema,
  registerSchema,
  refreshTokenSchema,
} from "../../../src/modules/auth/auth.validation";

describe("auth.validation", () => {
  describe("registerSchema", () => {
    it("accepts valid registration input", () => {
      const result = registerSchema.safeParse({
        name: "John Doe",
        email: "john@example.com",
        password: "password123",
      });
      expect(result.success).toBe(true);
    });

    it("rejects unknown fields", () => {
      const result = registerSchema.safeParse({
        name: "John",
        email: "john@example.com",
        password: "password123",
        isAdmin: true,
      });
      expect(result.success).toBe(false);
    });

    it("rejects invalid email", () => {
      const result = registerSchema.safeParse({
        name: "John",
        email: "not-an-email",
        password: "password123",
      });
      expect(result.success).toBe(false);
    });

    it("rejects short password", () => {
      const result = registerSchema.safeParse({
        name: "John",
        email: "john@example.com",
        password: "short",
      });
      expect(result.success).toBe(false);
    });
  });

  describe("loginSchema", () => {
    it("accepts valid login input", () => {
      const result = loginSchema.safeParse({
        email: "john@example.com",
        password: "any",
      });
      expect(result.success).toBe(true);
    });

    it("rejects missing password", () => {
      const result = loginSchema.safeParse({
        email: "john@example.com",
      });
      expect(result.success).toBe(false);
    });
  });

  describe("refreshTokenSchema", () => {
    it("requires refreshToken", () => {
      const result = refreshTokenSchema.safeParse({});
      expect(result.success).toBe(false);
    });
  });
});
