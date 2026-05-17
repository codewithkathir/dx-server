import request from "supertest";
import { createTestApp } from "../helpers/app.helper";
import { resetDatabase } from "../helpers/db.helper";
import { authHeader, loginAsAdmin } from "../helpers/auth.helper";

describe("Admin Auth API", () => {
  const app = createTestApp();

  beforeEach(async () => {
    await resetDatabase();
  });

  describe("POST /api/v1/auth/admin/login", () => {
    it("returns tokens and admin profile", async () => {
      const res = await request(app)
        .post("/api/v1/auth/admin/login")
        .send({ email: "admin@example.com", password: "Admin@12345" })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.accessToken).toBeDefined();
      expect(res.body.data.refreshToken).toBeDefined();
      expect(res.body.data.admin.email).toBe("admin@example.com");
      expect(res.body.data.admin).not.toHaveProperty("password");
      expect(res.body.data.admin).not.toHaveProperty("passwordHash");
    });

    it("returns 401 for invalid password", async () => {
      const res = await request(app)
        .post("/api/v1/auth/admin/login")
        .send({ email: "admin@example.com", password: "wrong" })
        .expect(401);

      expect(res.body.errorCode).toBe("INVALID_CREDENTIALS");
    });
  });

  describe("GET /api/v1/auth/admin/me", () => {
    it("returns profile when authenticated", async () => {
      const { accessToken } = await loginAsAdmin(app);

      const res = await request(app)
        .get("/api/v1/auth/admin/me")
        .set(authHeader(accessToken))
        .expect(200);

      expect(res.body.data.role).toBe("SUPER_ADMIN");
    });
  });

  describe("POST /api/v1/auth/admin/refresh-token", () => {
    it("issues new tokens", async () => {
      const { refreshToken } = await loginAsAdmin(app);

      const res = await request(app)
        .post("/api/v1/auth/admin/refresh-token")
        .send({ refreshToken })
        .expect(200);

      expect(res.body.data.accessToken).toBeDefined();
      expect(res.body.data.refreshToken).toBeDefined();
    });
  });

  describe("POST /api/v1/auth/admin/forgot-password", () => {
    it("returns success for known email", async () => {
      const res = await request(app)
        .post("/api/v1/auth/admin/forgot-password")
        .send({ email: "admin@example.com" })
        .expect(200);

      expect(res.body.success).toBe(true);
    });
  });
});
