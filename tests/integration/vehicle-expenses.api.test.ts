import request from "supertest";
import { createTestApp } from "../helpers/app.helper";
import { resetDatabase } from "../helpers/db.helper";
import { authHeader, loginAsAdmin, loginAsEmployee } from "../helpers/auth.helper";

const daysAgo = (days: number) => new Date(Date.now() - days * 86_400_000).toISOString().slice(0, 10);

describe("Vehicle expenses", () => {
  const app = createTestApp();

  beforeEach(async () => {
    await resetDatabase();
  });

  async function setup() {
    const { accessToken: adminToken } = await loginAsAdmin(app);
    const { accessToken: employeeToken } = await loginAsEmployee(app);
    const admin = authHeader(adminToken);
    const employee = authHeader(employeeToken);
    const me = await request(app).get("/api/v1/auth/employee/me").set(employee).expect(200);

    const vehicle = await request(app)
      .post("/api/v1/admin/assets")
      .set(admin)
      .send({ assetNo: "DXB-T-1001", name: "Test Van", category: "vehicle" })
      .expect(201);
    const other = await request(app)
      .post("/api/v1/admin/assets")
      .set(admin)
      .send({ assetNo: "DXB-T-2002", name: "Other Van", category: "vehicle" })
      .expect(201);
    await request(app)
      .post(`/api/v1/admin/assets/${vehicle.body.data.id}/assign`)
      .set(admin)
      .send({ employeeId: me.body.data.id, assignedDate: daysAgo(10), odometerKm: 10000 })
      .expect(200);

    const types = await request(app).get("/api/v1/admin/asset-service-types?category=vehicle").set(admin).expect(200);
    const oilType = (types.body.data as Array<{ id: number; code: string }>).find((t) => t.code === "OIL_CHANGE")!.id;

    const category = await request(app)
      .post("/api/v1/admin/categories")
      .set(admin)
      .send({ name: "Fleet", isVehicleExpense: true })
      .expect(201);
    expect(category.body.data.isVehicleExpense).toBe(true);
    const oil = await request(app)
      .post("/api/v1/admin/sub-categories")
      .set(admin)
      .send({ categoryId: category.body.data.id, name: "Oil Change", serviceTypeId: oilType })
      .expect(201);
    const fuel = await request(app)
      .post("/api/v1/admin/sub-categories")
      .set(admin)
      .send({ categoryId: category.body.data.id, name: "Petrol" })
      .expect(201);
    const methods = await request(app).get("/api/v1/employee/dropdowns/payment-methods").set(employee).expect(200);

    const claim = (subCategoryId: number, extra: Record<string, unknown>) => ({
      date: daysAgo(2),
      amount: 180,
      categoryId: category.body.data.id,
      subCategoryId,
      paymentMethodId: methods.body.data[0].id,
      ...extra,
    });

    return {
      admin,
      employee,
      vehicleId: vehicle.body.data.id as number,
      otherId: other.body.data.id as number,
      oilSub: oil.body.data.id as number,
      fuelSub: fuel.body.data.id as number,
      claim,
    };
  }

  it("turns an approved oil-change claim into a service record, and undoes it on reject", async () => {
    const { admin, employee, vehicleId, otherId, oilSub, claim } = await setup();

    const mine = await request(app).get("/api/v1/employee/dropdowns/my-vehicles").set(employee).expect(200);
    expect(mine.body.data).toEqual([{ id: vehicleId, assetNo: "DXB-T-1001", name: "Test Van", odometerKm: 10000 }]);

    await request(app).post("/api/v1/employee/expenses").set(employee).send(claim(oilSub, {})).expect(400);
    await request(app).post("/api/v1/employee/expenses").set(employee).send(claim(oilSub, { assetId: vehicleId })).expect(400);
    await request(app)
      .post("/api/v1/employee/expenses")
      .set(employee)
      .send(claim(oilSub, { assetId: otherId, odometerKm: 10500 }))
      .expect(400);
    await request(app)
      .post("/api/v1/employee/expenses")
      .set(employee)
      .send(claim(oilSub, { assetId: vehicleId, odometerKm: 9000 }))
      .expect(400);

    const created = await request(app)
      .post("/api/v1/employee/expenses")
      .set(employee)
      .send(claim(oilSub, { assetId: vehicleId, odometerKm: 10500 }))
      .expect(201);
    expect(created.body.data).toMatchObject({ assetId: vehicleId, odometerKm: 10500, vehicle: { assetNo: "DXB-T-1001" } });
    const expenseId = created.body.data.id as number;

    const pending = await request(app).get(`/api/v1/admin/assets/${vehicleId}/expenses`).set(admin).expect(200);
    expect(pending.body.data).toHaveLength(1);
    expect(pending.body.data[0]).toMatchObject({ id: expenseId, stage: "pending", serviceRecordId: null });

    await request(app).post(`/api/v1/admin/employee-expenses/${expenseId}/approve`).set(admin).send({}).expect(200);

    const records = await request(app).get(`/api/v1/admin/assets/${vehicleId}/service-records`).set(admin).expect(200);
    expect(records.body.data).toHaveLength(1);
    expect(records.body.data[0]).toMatchObject({
      serviceTypeCode: "OIL_CHANGE",
      expenseId,
      odometerKm: 10500,
      nextDueKm: 15500,
      cost: 180,
    });
    const summary = await request(app).get(`/api/v1/admin/assets/${vehicleId}/expenses/summary`).set(admin).expect(200);
    expect(summary.body.data.allTime).toEqual({ count: 1, amount: 180 });
    expect(summary.body.data.pending.count).toBe(0);

    await request(app)
      .post(`/api/v1/admin/employee-expenses/${expenseId}/reject`)
      .set(admin)
      .send({ note: "Wrong vehicle" })
      .expect(200);
    const afterReject = await request(app).get(`/api/v1/admin/assets/${vehicleId}/service-records`).set(admin).expect(200);
    expect(afterReject.body.data).toHaveLength(0);
    const readings = await request(app).get(`/api/v1/admin/assets/${vehicleId}/odometer-readings`).set(admin).expect(200);
    expect(readings.body.data.map((r: { source: string }) => r.source)).toEqual(["assign"]);
  });

  it("keeps a fuel claim's km as a reading that follows admin corrections", async () => {
    const { admin, employee, vehicleId, otherId, fuelSub, claim } = await setup();

    const created = await request(app)
      .post("/api/v1/employee/expenses")
      .set(employee)
      .send(claim(fuelSub, { assetId: vehicleId, odometerKm: 10400 }))
      .expect(201);
    const expenseId = created.body.data.id as number;
    await request(app).post(`/api/v1/admin/employee-expenses/${expenseId}/approve`).set(admin).send({}).expect(200);

    const readings = await request(app).get(`/api/v1/admin/assets/${vehicleId}/odometer-readings`).set(admin).expect(200);
    const reading = (readings.body.data as Array<{ id: number; source: string; readingKm: number; expenseId: number }>)[0]!;
    expect(reading).toMatchObject({ source: "expense", readingKm: 10400, expenseId });
    await request(app).delete(`/api/v1/admin/assets/${vehicleId}/odometer-readings/${reading.id}`).set(admin).expect(409);

    await request(app)
      .put(`/api/v1/admin/employee-expenses/${expenseId}/vehicle`)
      .set(admin)
      .send({ assetId: vehicleId, odometerKm: 10450 })
      .expect(200);
    const fixed = await request(app).get(`/api/v1/admin/assets/${vehicleId}/odometer-readings`).set(admin).expect(200);
    expect(fixed.body.data[0]).toMatchObject({ source: "expense", readingKm: 10450 });

    // Moved to another vehicle: the reading moves with it.
    const moved = await request(app)
      .put(`/api/v1/admin/employee-expenses/${expenseId}/vehicle`)
      .set(admin)
      .send({ assetId: otherId, odometerKm: 300 })
      .expect(200);
    expect(moved.body.data.vehicle.assetNo).toBe("DXB-T-2002");
    const left = await request(app).get(`/api/v1/admin/assets/${vehicleId}/expenses`).set(admin).expect(200);
    expect(left.body.data).toHaveLength(0);
    const arrived = await request(app).get(`/api/v1/admin/assets/${otherId}/odometer-readings`).set(admin).expect(200);
    expect(arrived.body.data[0]).toMatchObject({ readingKm: 300, source: "expense" });

    const list = await request(app).get(`/api/v1/admin/employee-expenses?assetId=${otherId}`).set(admin).expect(200);
    expect(list.body.data.map((e: { id: number }) => e.id)).toEqual([expenseId]);
  });

  it("drops the vehicle from claims in other categories", async () => {
    const { employee, vehicleId } = await setup();
    const categories = await request(app).get("/api/v1/employee/dropdowns/categories").set(employee).expect(200);
    const plain = (categories.body.data as Array<{ id: number; isVehicleExpense: boolean }>).find((c) => !c.isVehicleExpense)!;
    const subs = await request(app).get(`/api/v1/employee/dropdowns/sub-categories?categoryId=${plain.id}`).set(employee).expect(200);
    const methods = await request(app).get("/api/v1/employee/dropdowns/payment-methods").set(employee).expect(200);

    const created = await request(app)
      .post("/api/v1/employee/expenses")
      .set(employee)
      .send({
        date: daysAgo(1),
        amount: 50,
        categoryId: plain.id,
        subCategoryId: subs.body.data[0].id,
        paymentMethodId: methods.body.data[0].id,
        assetId: vehicleId,
        odometerKm: 10100,
      })
      .expect(201);
    expect(created.body.data).toMatchObject({ assetId: null, odometerKm: null, vehicle: null });
  });
});
