import request from "supertest";
import { createTestApp } from "../helpers/app.helper";
import { resetDatabase } from "../helpers/db.helper";
import { authHeader, loginAsAdmin, loginAsEmployee } from "../helpers/auth.helper";

describe("Employee Expenses API", () => {
  const app = createTestApp();

  beforeEach(async () => {
    await resetDatabase();
  });

  async function getCatalogIds(accessToken: string) {
    const categories = await request(app)
      .get("/api/v1/employee/dropdowns/categories")
      .set(authHeader(accessToken))
      .expect(200);

    const categoryId = categories.body.data[0].id as number;

    const subCategories = await request(app)
      .get(`/api/v1/employee/dropdowns/sub-categories?categoryId=${categoryId}`)
      .set(authHeader(accessToken))
      .expect(200);

    const subCategoryId = subCategories.body.data[0].id as number;

    const paymentMethods = await request(app)
      .get("/api/v1/employee/dropdowns/payment-methods")
      .set(authHeader(accessToken))
      .expect(200);

    const whom = await request(app)
      .get("/api/v1/employee/dropdowns/whom")
      .set(authHeader(accessToken))
      .expect(200);

    return {
      categoryId,
      subCategoryId,
      paymentMethodId: paymentMethods.body.data[0].id as number,
      whomId: whom.body.data[0].id as number,
    };
  }

  it("creates and lists own expenses", async () => {
    const { accessToken } = await loginAsEmployee(app);
    const ids = await getCatalogIds(accessToken);

    const createRes = await request(app)
      .post("/api/v1/employee/expenses")
      .set(authHeader(accessToken))
      .send({
        date: "2026-05-10",
        amount: 120.5,
        whom: ids.whomId,
        categoryId: ids.categoryId,
        subCategoryId: ids.subCategoryId,
        paymentMethodId: ids.paymentMethodId,
        description: "Integration test expense",
      })
      .expect(201);

    expect(createRes.body.data.employeeStatus).toBe("pending");
    expect(createRes.body.data.employeeId).toBeDefined();

    const listRes = await request(app)
      .get("/api/v1/employee/expenses")
      .set(authHeader(accessToken))
      .expect(200);

    expect(listRes.body.data.length).toBeGreaterThanOrEqual(1);
    expect(listRes.body.meta).toBeDefined();
  });

  it("rejects admin token on employee expense routes", async () => {
    const { accessToken } = await loginAsAdmin(app);

    await request(app)
      .get("/api/v1/employee/expenses")
      .set(authHeader(accessToken))
      .expect(403);
  });

  it("rejects employee_status in create body", async () => {
    const { accessToken } = await loginAsEmployee(app);
    const ids = await getCatalogIds(accessToken);

    await request(app)
      .post("/api/v1/employee/expenses")
      .set(authHeader(accessToken))
      .send({
        date: "2026-05-10",
        amount: 50,
        whom: ids.whomId,
        categoryId: ids.categoryId,
        subCategoryId: ids.subCategoryId,
        paymentMethodId: ids.paymentMethodId,
        employeeStatus: "approved",
      })
      .expect(400);
  });
});
