import request from "supertest";
import { createTestApp } from "../helpers/app.helper";
import { resetDatabase } from "../helpers/db.helper";
import { authHeader, loginAsAdmin, loginAsEmployee } from "../helpers/auth.helper";

const daysAgo = (days: number) => new Date(Date.now() - days * 86_400_000).toISOString().slice(0, 10);
const addDays = (date: string, days: number) =>
  new Date(Date.parse(`${date}T00:00:00Z`) + days * 86_400_000).toISOString().slice(0, 10);

describe("Asset maintenance API", () => {
  const app = createTestApp();

  beforeEach(async () => {
    await resetDatabase();
  });

  async function setup() {
    const { accessToken: adminToken } = await loginAsAdmin(app);
    const vehicle = await request(app)
      .post("/api/v1/admin/assets")
      .set(authHeader(adminToken))
      .send({ assetNo: "DXB-A-12345", name: "Toyota Hiace", category: "vehicle", purchaseCost: 95000 })
      .expect(201);
    const types = await request(app)
      .get("/api/v1/admin/asset-service-types?category=vehicle")
      .set(authHeader(adminToken))
      .expect(200);
    const typeId = (code: string) =>
      (types.body.data as Array<{ id: number; code: string }>).find((t) => t.code === code)!.id;
    return { adminToken, vehicleId: vehicle.body.data.id as number, typeId };
  }

  it("records services with default due dates and km, and keeps the odometer moving forward", async () => {
    const { adminToken, vehicleId, typeId } = await setup();
    const auth = authHeader(adminToken);
    const base = `/api/v1/admin/assets/${vehicleId}`;

    const oil = await request(app)
      .post(`${base}/service-records`)
      .set(auth)
      .send({ serviceTypeId: typeId("OIL_CHANGE"), startDate: daysAgo(30), odometerKm: 42000, cost: 180.5 })
      .expect(201);
    expect(oil.body.data.serviceTypeCode).toBe("OIL_CHANGE");
    expect(oil.body.data.endDate).toBe(addDays(daysAgo(30), 90));
    expect(oil.body.data.nextDueKm).toBe(47000);
    expect(oil.body.data.cost).toBe(180.5);

    // Insurance has no km interval and an explicit expiry.
    const insurance = await request(app)
      .post(`${base}/service-records`)
      .set(auth)
      .send({ serviceTypeId: typeId("INSURANCE"), startDate: daysAgo(10), endDate: addDays(daysAgo(10), 364), referenceNo: "POL-77" })
      .expect(201);
    expect(insurance.body.data.nextDueKm).toBeNull();

    await request(app)
      .post(`${base}/odometer-readings`)
      .set(auth)
      .send({ readingKm: 46600, readingDate: daysAgo(1) })
      .expect(201)
      .expect((res) => expect(res.body.data).toEqual({ readingKm: 46600, readingDate: daysAgo(1) }));

    // Lower than an earlier reading, or higher than a later one.
    await request(app).post(`${base}/odometer-readings`).set(auth).send({ readingKm: 41000, readingDate: daysAgo(0) }).expect(400);
    await request(app).post(`${base}/odometer-readings`).set(auth).send({ readingKm: 50000, readingDate: daysAgo(20) }).expect(400);
    await request(app)
      .post(`${base}/odometer-readings`)
      .set(auth)
      .send({ readingKm: 120, readingDate: daysAgo(0), notes: "Odometer replaced", allowDecrease: true })
      .expect(201);

    const readings = await request(app).get(`${base}/odometer-readings`).set(auth).expect(200);
    expect(readings.body.data.map((r: { readingKm: number }) => r.readingKm)).toEqual([120, 46600, 42000]);
    const serviceReading = readings.body.data.find((r: { source: string }) => r.source === "service");
    await request(app).delete(`${base}/odometer-readings/${serviceReading.id}`).set(auth).expect(409);

    // Editing the record's odometer moves its reading too.
    const edited = await request(app)
      .put(`${base}/service-records/${oil.body.data.id}`)
      .set(auth)
      // The replaced-odometer reading (120 km) is later, so this edit needs the override too.
      .send({ odometerKm: 42500, nextDueKm: 47500, allowOdometerDecrease: true })
      .expect(200);
    expect(edited.body.data.odometerKm).toBe(42500);
    const afterEdit = await request(app).get(`${base}/odometer-readings`).set(auth).expect(200);
    expect(afterEdit.body.data.find((r: { source: string }) => r.source === "service").readingKm).toBe(42500);

    const list = await request(app).get(`${base}/service-records?serviceTypeId=${typeId("OIL_CHANGE")}`).set(auth).expect(200);
    expect(list.body.meta.total).toBe(1);

    await request(app).delete(`${base}/service-records/${oil.body.data.id}`).set(auth).expect(200);
    const afterDelete = await request(app).get(`${base}/odometer-readings`).set(auth).expect(200);
    expect(afterDelete.body.data.some((r: { source: string }) => r.source === "service")).toBe(false);
    await request(app).get(`${base}/service-records/${oil.body.data.id}`).set(auth).expect(404);
  });

  it("rejects bad service records", async () => {
    const { adminToken, vehicleId, typeId } = await setup();
    const auth = authHeader(adminToken);
    const laptop = await request(app)
      .post("/api/v1/admin/assets")
      .set(auth)
      .send({ name: "ThinkPad", category: "laptop" })
      .expect(201);

    await request(app)
      .post(`/api/v1/admin/assets/${laptop.body.data.id}/service-records`)
      .set(auth)
      .send({ serviceTypeId: typeId("OIL_CHANGE"), startDate: daysAgo(1) })
      .expect(400);
    await request(app)
      .post(`/api/v1/admin/assets/${vehicleId}/service-records`)
      .set(auth)
      .send({ serviceTypeId: typeId("SERVICE"), startDate: daysAgo(1), endDate: daysAgo(5) })
      .expect(400);
    await request(app)
      .post(`/api/v1/admin/assets/${vehicleId}/service-records`)
      .set(auth)
      .send({ serviceTypeId: typeId("SERVICE"), startDate: daysAgo(1), driver: "x" })
      .expect(400);
    await request(app)
      .post(`/api/v1/admin/assets/${vehicleId}/service-records`)
      .set(auth)
      .send({ serviceTypeId: typeId("SERVICE"), startDate: addDays(daysAgo(0), 5) })
      .expect(400);
    await request(app)
      .post("/api/v1/admin/assets/999999/service-records")
      .set(auth)
      .send({ serviceTypeId: typeId("SERVICE"), startDate: daysAgo(1) })
      .expect(404);
    await request(app).get(`/api/v1/admin/assets/${vehicleId}/service-records`).expect(401);
  });

  it("records the odometer on hand-over and return, and lets the driver report it", async () => {
    const { adminToken, vehicleId } = await setup();
    const auth = authHeader(adminToken);
    const { accessToken: employeeToken } = await loginAsEmployee(app);
    const me = await request(app).get("/api/v1/auth/employee/me").set(authHeader(employeeToken)).expect(200);
    const employeeId = me.body.data.id as number;

    await request(app)
      .post(`/api/v1/admin/assets/${vehicleId}/assign`)
      .set(auth)
      .send({ employeeId, assignedDate: daysAgo(5), odometerKm: 10000 })
      .expect(200);

    const mine = await request(app).get("/api/v1/employee/assets").set(authHeader(employeeToken)).expect(200);
    const assignmentId = mine.body.data.current[0].assignmentId as number;

    await request(app)
      .post(`/api/v1/employee/assets/${assignmentId}/odometer-readings`)
      .set(authHeader(employeeToken))
      .send({ readingKm: 9000 })
      .expect(400);
    await request(app)
      .post(`/api/v1/employee/assets/${assignmentId}/odometer-readings`)
      .set(authHeader(employeeToken))
      .send({ readingKm: 10400, readingDate: daysAgo(10) })
      .expect(400);
    await request(app)
      .post(`/api/v1/employee/assets/${assignmentId}/odometer-readings`)
      .set(authHeader(employeeToken))
      .send({ readingKm: 10400, allowDecrease: true })
      .expect(400);
    const reported = await request(app)
      .post(`/api/v1/employee/assets/${assignmentId}/odometer-readings`)
      .set(authHeader(employeeToken))
      .send({ readingKm: 10400 })
      .expect(201);
    expect(reported.body.data.readingKm).toBe(10400);

    const returned = await request(app)
      .post(`/api/v1/admin/assets/${vehicleId}/return`)
      .set(auth)
      .send({ returnedDate: daysAgo(0), condition: "good", odometerKm: 10650 })
      .expect(200);
    expect(returned.body.data.odometer.readingKm).toBe(10650);
    expect(returned.body.data.history[0]).toMatchObject({ odometerOut: 10000, odometerIn: 10650 });

    await request(app)
      .post(`/api/v1/employee/assets/${assignmentId}/odometer-readings`)
      .set(authHeader(employeeToken))
      .send({ readingKm: 10700 })
      .expect(409);
    await request(app).get(`/api/v1/admin/assets/${vehicleId}/odometer-readings`).set(authHeader(employeeToken)).expect(403);

    // Deleting the return reading clears it from the assignment.
    const readings = await request(app).get(`/api/v1/admin/assets/${vehicleId}/odometer-readings`).set(auth).expect(200);
    const sources = readings.body.data.map((r: { source: string }) => r.source);
    expect(sources).toEqual(["return", "employee", "assign"]);
    await request(app)
      .delete(`/api/v1/admin/assets/${vehicleId}/odometer-readings/${readings.body.data[0].id}`)
      .set(auth)
      .expect(200)
      .expect((res) => expect(res.body.data.readingKm).toBe(10400));
    const detail = await request(app).get(`/api/v1/admin/assets/${vehicleId}`).set(auth).expect(200);
    expect(detail.body.data.history[0].odometerIn).toBeNull();
  });

  it("manages service types", async () => {
    const { adminToken, vehicleId } = await setup();
    const auth = authHeader(adminToken);

    const created = await request(app)
      .post("/api/v1/admin/asset-service-types")
      .set(auth)
      .send({ code: "salik_tag", name: "Salik tag", category: "vehicle", intervalDays: 365 })
      .expect(201);
    expect(created.body.data).toMatchObject({ code: "SALIK_TAG", intervalKm: null, status: "active" });

    await request(app).post("/api/v1/admin/asset-service-types").set(auth).send({ code: "SALIK_TAG", name: "Again" }).expect(409);
    await request(app).post("/api/v1/admin/asset-service-types").set(auth).send({ code: "X", name: "X", extra: 1 }).expect(400);

    await request(app)
      .post(`/api/v1/admin/assets/${vehicleId}/service-records`)
      .set(auth)
      .send({ serviceTypeId: created.body.data.id, startDate: daysAgo(1) })
      .expect(201);
    await request(app).delete(`/api/v1/admin/asset-service-types/${created.body.data.id}`).set(auth).expect(409);

    await request(app)
      .put(`/api/v1/admin/asset-service-types/${created.body.data.id}`)
      .set(auth)
      .send({ status: "inactive" })
      .expect(200);
    await request(app)
      .post(`/api/v1/admin/assets/${vehicleId}/service-records`)
      .set(auth)
      .send({ serviceTypeId: created.body.data.id, startDate: daysAgo(1) })
      .expect(400);

    const laptopTypes = await request(app).get("/api/v1/admin/asset-service-types?category=laptop").set(auth).expect(200);
    expect(laptopTypes.body.data).toHaveLength(0);
  });
});
