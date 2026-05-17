import request from "supertest";
import { createTestApp } from "../helpers/app.helper";
import { resetDatabase } from "../helpers/db.helper";
import { authHeader, loginAsAdmin, loginAsEmployee } from "../helpers/auth.helper";

describe("Employee Auth API", () => {
  const app = createTestApp();

  beforeEach(async () => {
    await resetDatabase();
  });

  describe("POST /api/v1/auth/employee/login", () => {
    it("returns tokens and employee profile", async () => {
      const res = await request(app)
        .post("/api/v1/auth/employee/login")
        .send({ email: "john.doe@example.com", password: "Employee@12345" })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.accessToken).toBeDefined();
      expect(res.body.data.refreshToken).toBeDefined();
      expect(res.body.data.employee.email).toBe("john.doe@example.com");
      expect(res.body.data.employee.role).toBe("employee");
    });

    it("returns 401 for invalid password", async () => {
      const res = await request(app)
        .post("/api/v1/auth/employee/login")
        .send({ email: "john.doe@example.com", password: "wrong" })
        .expect(401);

      expect(res.body.errorCode).toBe("INVALID_CREDENTIALS");
    });

    it("returns 403 for inactive employee", async () => {
      await request(app)
        .post("/api/v1/auth/employee/login")
        .send({ email: "ahmed.hassan@example.com", password: "Employee@12345" })
        .expect(403);
    });
  });

  describe("GET /api/v1/auth/employee/me", () => {
    it("returns profile when authenticated as employee", async () => {
      const { accessToken } = await loginAsEmployee(app);

      const res = await request(app)
        .get("/api/v1/auth/employee/me")
        .set(authHeader(accessToken))
        .expect(200);

      expect(res.body.data.email).toBe("john.doe@example.com");
    });

    it("rejects admin token on employee route", async () => {
      const { accessToken } = await loginAsAdmin(app);

      await request(app)
        .get("/api/v1/auth/employee/me")
        .set(authHeader(accessToken))
        .expect(403);
    });
  });

  describe("GET /api/v1/auth/admin/me", () => {
    it("rejects employee token on admin route", async () => {
      const { accessToken } = await loginAsEmployee(app);

      await request(app)
        .get("/api/v1/auth/admin/me")
        .set(authHeader(accessToken))
        .expect(403);
    });
  });

  describe("POST /api/v1/auth/employee/refresh-token", () => {
    it("issues new tokens", async () => {
      const { refreshToken } = await loginAsEmployee(app);

      const res = await request(app)
        .post("/api/v1/auth/employee/refresh-token")
        .send({ refreshToken })
        .expect(200);

      expect(res.body.data.accessToken).toBeDefined();
      expect(res.body.data.refreshToken).toBeDefined();
    });
  });

  describe("Admin employee management", () => {
    it("rejects employee token on admin employees list", async () => {
      const { accessToken } = await loginAsEmployee(app);

      await request(app)
        .get("/api/admin/employees")
        .set(authHeader(accessToken))
        .expect(403);
    });
  });
});
