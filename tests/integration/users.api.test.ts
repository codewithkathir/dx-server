import request from "supertest";
import { createTestApp } from "../helpers/app.helper";
import { resetDatabase } from "../helpers/db.helper";
import { authHeader, loginAsAdmin } from "../helpers/auth.helper";
import { createUserPublicInput } from "../mocks/user.factory";

describe("Users API", () => {
  const app = createTestApp();

  beforeEach(async () => {
    await resetDatabase();
  });

  describe("GET /api/v1/users", () => {
    it("returns UNAUTHORIZED without token", async () => {
      const res = await request(app).get("/api/v1/users").expect(401);
      expect(res.body.errorCode).toBe("UNAUTHORIZED");
    });

    it("returns paginated users for admin", async () => {
      const { accessToken } = await loginAsAdmin(app);

      const res = await request(app)
        .get("/api/v1/users")
        .set(authHeader(accessToken))
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.meta).toMatchObject({
        page: 1,
        limit: 10,
      });
    });
  });

  describe("POST /api/v1/users", () => {
    it("creates a user when admin has permission", async () => {
      const { accessToken } = await loginAsAdmin(app);
      const input = createUserPublicInput();

      const res = await request(app)
        .post("/api/v1/users")
        .set(authHeader(accessToken))
        .send(input)
        .expect(201);

      expect(res.body.data.email).toBe(input.email.toLowerCase());
    });
  });

  describe("GET /api/v1/users/:id", () => {
    it("returns NOT_FOUND for missing user", async () => {
      const { accessToken } = await loginAsAdmin(app);

      const res = await request(app)
        .get("/api/v1/users/99999")
        .set(authHeader(accessToken))
        .expect(404);

      expect(res.body.errorCode).toBe("NOT_FOUND");
    });
  });

  describe("DELETE /api/v1/users/:id", () => {
    it("soft deletes a user", async () => {
      const { accessToken } = await loginAsAdmin(app);
      const input = createUserPublicInput();

      const createRes = await request(app)
        .post("/api/v1/users")
        .set(authHeader(accessToken))
        .send(input)
        .expect(201);

      const userId = createRes.body.data.id;

      await request(app)
        .delete(`/api/v1/users/${userId}`)
        .set(authHeader(accessToken))
        .expect(200);

      await request(app)
        .get(`/api/v1/users/${userId}`)
        .set(authHeader(accessToken))
        .expect(404);
    });
  });
});
