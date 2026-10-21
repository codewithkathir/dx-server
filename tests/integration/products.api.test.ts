import request from "supertest";
import { createTestApp } from "../helpers/app.helper";
import { getTestDb, resetDatabase } from "../helpers/db.helper";
import { authHeader, loginAsAdmin } from "../helpers/auth.helper";

describe("Products API", () => {
  const app = createTestApp();

  beforeEach(async () => {
    await resetDatabase();
    await getTestDb()("products").del();
  });

  it("creates, lists, updates and offers active products for invoices", async () => {
    const { accessToken } = await loginAsAdmin(app);
    const admin = authHeader(accessToken);

    await request(app).get("/api/v1/admin/products").expect(401);

    const created = await request(app)
      .post("/api/v1/admin/products")
      .set(admin)
      .send({ code: "VEG-001", name: "Tomatoes", unit: "kg", unitPrice: 4.5 })
      .expect(201);
    expect(created.body.data).toMatchObject({ code: "VEG-001", name: "Tomatoes", unit: "kg", unitPrice: 4.5, status: "active" });
    const id = created.body.data.id as number;

    await request(app).post("/api/v1/admin/products").set(admin).send({ name: "tomatoes", unitPrice: 1 }).expect(409);
    await request(app).post("/api/v1/admin/products").set(admin).send({ name: "X", unitPrice: 1, price: 2 }).expect(400);

    const list = await request(app).get("/api/v1/admin/products").query({ search: "tom" }).set(admin).expect(200);
    expect(list.body.data).toHaveLength(1);
    expect(list.body.meta).toMatchObject({ page: 1, total: 1 });

    await request(app).put(`/api/v1/admin/products/${id}`).set(admin).send({ unitPrice: 5.25, status: "inactive" }).expect(200);
    const options = await request(app).get("/api/v1/admin/dropdowns/products").set(admin).expect(200);
    expect(options.body.data).toEqual([]);

    // Products are never deleted.
    await request(app).delete(`/api/v1/admin/products/${id}`).set(admin).expect(404);
  });
});
