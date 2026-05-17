import request from "supertest";
import { createTestApp } from "../helpers/app.helper";
import { resetDatabase } from "../helpers/db.helper";
import { createUserPublicInput } from "../mocks/user.factory";

describe("Auth API", () => {
  const app = createTestApp();

  beforeEach(async () => {
    await resetDatabase();
  });

  describe("POST /api/v1/auth/register", () => {
    it("registers a new user successfully", async () => {
      const input = createUserPublicInput();

      const res = await request(app)
        .post("/api/v1/auth/register")
        .send(input)
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data.accessToken).toBeDefined();
      expect(res.body.data.refreshToken).toBeDefined();
      expect(res.body.data.user.email).toBe(input.email.toLowerCase());
    });

    it("returns VALIDATION_ERROR for invalid payload", async () => {
      const res = await request(app)
        .post("/api/v1/auth/register")
        .send({ email: "bad-email", password: "short" })
        .expect(400);

      expect(res.body).toMatchObject({
        success: false,
        errorCode: "VALIDATION_ERROR",
      });
      expect(res.body.errors.length).toBeGreaterThan(0);
    });
  });

  describe("POST /api/v1/auth/login", () => {
    it("logs in with valid admin credentials", async () => {
      const res = await request(app)
        .post("/api/v1/auth/login")
        .send({
          email: "admin@example.com",
          password: "Admin@12345",
        })
        .expect(200);

      expect(res.body.data.accessToken).toBeDefined();
      expect(res.body.data.user.role).toBe("SUPER_ADMIN");
    });

    it("returns INVALID_CREDENTIALS for wrong password", async () => {
      const res = await request(app)
        .post("/api/v1/auth/login")
        .send({
          email: "admin@example.com",
          password: "wrong-password",
        })
        .expect(401);

      expect(res.body).toMatchObject({
        success: false,
        errorCode: "INVALID_CREDENTIALS",
      });
    });
  });

  describe("GET /api/v1/auth/me", () => {
    it("returns UNAUTHORIZED without token", async () => {
      const res = await request(app).get("/api/v1/auth/me").expect(401);

      expect(res.body.errorCode).toBe("UNAUTHORIZED");
    });

    it("returns profile when authenticated", async () => {
      const loginRes = await request(app)
        .post("/api/v1/auth/login")
        .send({
          email: "admin@example.com",
          password: "Admin@12345",
        });

      const res = await request(app)
        .get("/api/v1/auth/me")
        .set("Authorization", `Bearer ${loginRes.body.data.accessToken}`)
        .expect(200);

      expect(res.body.data.email).toBe("admin@example.com");
    });
  });
});
