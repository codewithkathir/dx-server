import request from "supertest";
import { createTestApp } from "../helpers/app.helper";
import { resetDatabase } from "../helpers/db.helper";
import { authHeader, loginAsAdmin, loginAsEmployee } from "../helpers/auth.helper";

describe("Admin Employee Expenses API", () => {
  const app = createTestApp();

  beforeEach(async () => {
    await resetDatabase();
  });

  async function createSampleExpense() {
    const { accessToken: employeeToken } = await loginAsEmployee(app);

    const categories = await request(app)
      .get("/api/v1/employee/dropdowns/categories")
      .set(authHeader(employeeToken))
      .expect(200);

    const categoryId = categories.body.data[0].id as number;

    const subCategories = await request(app)
      .get(`/api/v1/employee/dropdowns/sub-categories?categoryId=${categoryId}`)
      .set(authHeader(employeeToken))
      .expect(200);

    const paymentMethods = await request(app)
      .get("/api/v1/employee/dropdowns/payment-methods")
      .set(authHeader(employeeToken))
      .expect(200);

    const whom = await request(app)
      .get("/api/v1/employee/dropdowns/whom")
      .set(authHeader(employeeToken))
      .expect(200);

    const createRes = await request(app)
      .post("/api/v1/employee/expenses")
      .set(authHeader(employeeToken))
      .send({
        date: "2026-05-10",
        amount: 99.99,
        whom: whom.body.data[0].id,
        categoryId,
        subCategoryId: subCategories.body.data[0].id,
        paymentMethodId: paymentMethods.body.data[0].id,
        description: "Admin module test expense",
      })
      .expect(201);

    return {
      expenseId: createRes.body.data.id as number,
      employeeToken,
    };
  }

  it("lists, summarizes, updates status, and soft-deletes expenses", async () => {
    const { accessToken: adminToken } = await loginAsAdmin(app);
    const { expenseId } = await createSampleExpense();

    const listRes = await request(app)
      .get("/api/v1/admin/employee-expenses")
      .set(authHeader(adminToken))
      .expect(200);

    expect(listRes.body.data.length).toBeGreaterThanOrEqual(1);
    expect(listRes.body.data[0].adminStatus).toBe("pending");

    const summaryRes = await request(app)
      .get("/api/v1/admin/employee-expenses/summary")
      .set(authHeader(adminToken))
      .expect(200);

    expect(summaryRes.body.data.totalCount).toBeGreaterThanOrEqual(1);

    const detailRes = await request(app)
      .get(`/api/v1/admin/employee-expenses/${expenseId}`)
      .set(authHeader(adminToken))
      .expect(200);

    expect(detailRes.body.data.id).toBe(expenseId);

    const statusRes = await request(app)
      .put(`/api/v1/admin/employee-expenses/${expenseId}/status`)
      .set(authHeader(adminToken))
      .send({ adminStatus: "paid" })
      .expect(200);

    expect(statusRes.body.data.adminStatus).toBe("paid");

    await request(app)
      .delete(`/api/v1/admin/employee-expenses/${expenseId}`)
      .set(authHeader(adminToken))
      .expect(200);

    await request(app)
      .get(`/api/v1/admin/employee-expenses/${expenseId}`)
      .set(authHeader(adminToken))
      .expect(404);
  });

  it("rejects employee token on admin expense routes", async () => {
    const { accessToken: employeeToken } = await loginAsEmployee(app);

    await request(app)
      .get("/api/v1/admin/employee-expenses")
      .set(authHeader(employeeToken))
      .expect(403);
  });

  it("exposes admin dropdowns for admin token", async () => {
    const { accessToken: adminToken } = await loginAsAdmin(app);

    await request(app)
      .get("/api/v1/admin/dropdowns/categories")
      .set(authHeader(adminToken))
      .expect(200);

    await request(app)
      .get("/api/v1/admin/dropdowns/whom")
      .set(authHeader(adminToken))
      .expect(200);
  });

  it("rejects employee token on admin dropdown routes", async () => {
    const { accessToken: employeeToken } = await loginAsEmployee(app);

    await request(app)
      .get("/api/v1/admin/dropdowns/categories")
      .set(authHeader(employeeToken))
      .expect(403);
  });
});
