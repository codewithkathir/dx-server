import request from "supertest";
import { createTestApp } from "../helpers/app.helper";
import { resetDatabase } from "../helpers/db.helper";
import { authHeader, loginAsAdmin } from "../helpers/auth.helper";
import { createEmployeeInput } from "../mocks/employee.factory";

describe("Employees API (Admin)", () => {
  const app = createTestApp();

  beforeEach(async () => {
    await resetDatabase();
  });

  describe("POST /api/admin/employees", () => {
    it("returns UNAUTHORIZED without token", async () => {
      const res = await request(app)
        .post("/api/admin/employees")
        .send(createEmployeeInput())
        .expect(401);

      expect(res.body.errorCode).toBe("UNAUTHORIZED");
    });

    it("creates an employee for admin", async () => {
      const { accessToken } = await loginAsAdmin(app);
      const input = createEmployeeInput();

      const res = await request(app)
        .post("/api/admin/employees")
        .set(authHeader(accessToken))
        .send(input)
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data.email).toBe(input.email.toLowerCase());
      expect(res.body.data.empName).toBe(input.empName);
      expect(res.body.data).not.toHaveProperty("password");
      expect(res.body.data).not.toHaveProperty("passwordHash");
    });
  });

  describe("GET /api/admin/employees", () => {
    it("returns paginated employees with filters", async () => {
      const { accessToken } = await loginAsAdmin(app);
      const input = createEmployeeInput({ country: "UAE" });

      await request(app)
        .post("/api/admin/employees")
        .set(authHeader(accessToken))
        .send(input)
        .expect(201);

      const res = await request(app)
        .get("/api/admin/employees")
        .query({ page: 1, limit: 10, country: "UAE", search: "John" })
        .set(authHeader(accessToken))
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.meta).toMatchObject({
        page: 1,
        limit: 10,
        total: expect.any(Number),
        totalPages: expect.any(Number),
      });
    });
  });

  describe("GET /api/admin/employees/:id", () => {
    it("returns NOT_FOUND for missing employee", async () => {
      const { accessToken } = await loginAsAdmin(app);

      const res = await request(app)
        .get("/api/admin/employees/99999")
        .set(authHeader(accessToken))
        .expect(404);

      expect(res.body.errorCode).toBe("NOT_FOUND");
    });
  });

  describe("PUT /api/admin/employees/:id", () => {
    it("updates an employee", async () => {
      const { accessToken } = await loginAsAdmin(app);
      const input = createEmployeeInput();

      const createRes = await request(app)
        .post("/api/admin/employees")
        .set(authHeader(accessToken))
        .send(input)
        .expect(201);

      const employeeId = createRes.body.data.id;

      const res = await request(app)
        .put(`/api/admin/employees/${employeeId}`)
        .set(authHeader(accessToken))
        .send({ empName: "Jane Doe", status: "inactive" })
        .expect(200);

      expect(res.body.data.empName).toBe("Jane Doe");
      expect(res.body.data.status).toBe("inactive");
    });
  });

  describe("DELETE /api/admin/employees/:id", () => {
    it("soft deletes an employee", async () => {
      const { accessToken } = await loginAsAdmin(app);
      const input = createEmployeeInput();

      const createRes = await request(app)
        .post("/api/admin/employees")
        .set(authHeader(accessToken))
        .send(input)
        .expect(201);

      const employeeId = createRes.body.data.id;

      await request(app)
        .delete(`/api/admin/employees/${employeeId}`)
        .set(authHeader(accessToken))
        .expect(200);

      await request(app)
        .get(`/api/admin/employees/${employeeId}`)
        .set(authHeader(accessToken))
        .expect(404);
    });
  });

  describe("POST /api/admin/employees/bulk-delete", () => {
    it("bulk soft deletes employees", async () => {
      const { accessToken } = await loginAsAdmin(app);

      const first = await request(app)
        .post("/api/admin/employees")
        .set(authHeader(accessToken))
        .send(createEmployeeInput())
        .expect(201);

      const second = await request(app)
        .post("/api/admin/employees")
        .set(authHeader(accessToken))
        .send(createEmployeeInput())
        .expect(201);

      const res = await request(app)
        .post("/api/admin/employees/bulk-delete")
        .set(authHeader(accessToken))
        .send({ ids: [first.body.data.id, second.body.data.id] })
        .expect(200);

      expect(res.body.data.affected).toBe(2);
    });
  });

  describe("POST /api/admin/employees/bulk-status", () => {
    it("bulk updates employee status", async () => {
      const { accessToken } = await loginAsAdmin(app);

      const created = await request(app)
        .post("/api/admin/employees")
        .set(authHeader(accessToken))
        .send(createEmployeeInput())
        .expect(201);

      const res = await request(app)
        .post("/api/admin/employees/bulk-status")
        .set(authHeader(accessToken))
        .send({ ids: [created.body.data.id], status: "suspended" })
        .expect(200);

      expect(res.body.data.affected).toBe(1);

      const getRes = await request(app)
        .get(`/api/admin/employees/${created.body.data.id}`)
        .set(authHeader(accessToken))
        .expect(200);

      expect(getRes.body.data.status).toBe("suspended");
    });
  });

  describe("POST /api/admin/employees/bulk-create", () => {
    it("bulk creates employees", async () => {
      const { accessToken } = await loginAsAdmin(app);
      const employees = [
        createEmployeeInput(),
        createEmployeeInput(),
      ];

      const res = await request(app)
        .post("/api/admin/employees/bulk-create")
        .set(authHeader(accessToken))
        .send({ employees })
        .expect(201);

      expect(res.body.data.created).toHaveLength(2);
      expect(res.body.data.failed).toHaveLength(0);
    });
  });

  describe("GET /api/admin/employees/export", () => {
    it("exports employees as CSV", async () => {
      const { accessToken } = await loginAsAdmin(app);

      await request(app)
        .post("/api/admin/employees")
        .set(authHeader(accessToken))
        .send(createEmployeeInput())
        .expect(201);

      const res = await request(app)
        .get("/api/admin/employees/export")
        .query({ format: "csv" })
        .set(authHeader(accessToken))
        .expect(200);

      expect(res.headers["content-type"]).toMatch(/text\/csv/);
      expect(res.text).toContain("empName");
      expect(res.text).toContain("John Doe");
    });

    it("exports employees as JSON", async () => {
      const { accessToken } = await loginAsAdmin(app);

      await request(app)
        .post("/api/admin/employees")
        .set(authHeader(accessToken))
        .send(createEmployeeInput())
        .expect(201);

      const res = await request(app)
        .get("/api/admin/employees/export")
        .query({ format: "json" })
        .set(authHeader(accessToken))
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });
  });
});
