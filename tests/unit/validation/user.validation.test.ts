import {
  createUserSchema,
  updateUserSchema,
  paginationQuerySchema,
} from "../../../src/modules/users/user.validation";

describe("user.validation", () => {
  describe("createUserSchema", () => {
    it("accepts valid create user input", () => {
      const result = createUserSchema.safeParse({
        name: "Jane Doe",
        email: "jane@example.com",
        password: "password123",
      });
      expect(result.success).toBe(true);
    });

    it("rejects unknown fields", () => {
      const result = createUserSchema.safeParse({
        name: "Jane",
        email: "jane@example.com",
        password: "password123",
        extra: true,
      });
      expect(result.success).toBe(false);
    });
  });

  describe("updateUserSchema", () => {
    it("accepts partial updates", () => {
      const result = updateUserSchema.safeParse({ name: "Updated Name" });
      expect(result.success).toBe(true);
    });
  });

  describe("paginationQuerySchema", () => {
    it("applies defaults for page and limit", () => {
      const result = paginationQuerySchema.safeParse({});
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.page).toBe(1);
        expect(result.data.limit).toBe(10);
        expect(result.data.order).toBe("desc");
      }
    });

    it("rejects limit above max", () => {
      const result = paginationQuerySchema.safeParse({ limit: 200 });
      expect(result.success).toBe(false);
    });
  });
});
