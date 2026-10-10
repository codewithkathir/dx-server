import request from "supertest";
import { createTestApp } from "../helpers/app.helper";
import { resetDatabase } from "../helpers/db.helper";
import { authHeader, loginAsAdmin, loginAsEmployee } from "../helpers/auth.helper";

const today = () => new Date().toISOString().slice(0, 10);

describe("Assets API", () => {
  const app = createTestApp();

  beforeEach(async () => {
    await resetDatabase();
  });

  it("assigns an asset, lets the employee confirm it, and records the return", async () => {
    const { accessToken: adminToken } = await loginAsAdmin(app);
    const { accessToken: employeeToken } = await loginAsEmployee(app);
    const me = await request(app).get("/api/v1/auth/employee/me").set(authHeader(employeeToken)).expect(200);
    const employeeId = me.body.data.id as number;

    const created = await request(app)
      .post("/api/v1/admin/assets")
      .set(authHeader(adminToken))
      .send({ name: "ThinkPad X1", category: "laptop", serialNo: "PF-123", purchaseCost: 4999.5 })
      .expect(201);
    const assetId = created.body.data.id as number;
    expect(created.body.data.assetNo).toMatch(/^AST-\d{4}-\d{4}$/);
    expect(created.body.data.status).toBe("available");

    await request(app)
      .post("/api/v1/admin/assets")
      .set(authHeader(adminToken))
      .send({ name: "Duplicate", serialNo: "PF-123" })
      .expect(409);

    const assigned = await request(app)
      .post(`/api/v1/admin/assets/${assetId}/assign`)
      .set(authHeader(adminToken))
      .send({ employeeId, assignedDate: today() })
      .expect(200);
    expect(assigned.body.data.status).toBe("assigned");
    expect(assigned.body.data.currentAssignment.employeeId).toBe(employeeId);

    await request(app)
      .post(`/api/v1/admin/assets/${assetId}/assign`)
      .set(authHeader(adminToken))
      .send({ employeeId, assignedDate: today() })
      .expect(409);
    await request(app).delete(`/api/v1/admin/assets/${assetId}`).set(authHeader(adminToken)).expect(409);

    const mine = await request(app).get("/api/v1/employee/assets").set(authHeader(employeeToken)).expect(200);
    expect(mine.body.data.current).toHaveLength(1);
    const assignmentId = mine.body.data.current[0].assignmentId as number;
    expect(mine.body.data.current[0].acknowledgedAt).toBeNull();

    const ack = await request(app)
      .post(`/api/v1/employee/assets/${assignmentId}/acknowledge`)
      .set(authHeader(employeeToken))
      .expect(200);
    expect(ack.body.data.acknowledgedAt).toBeTruthy();

    await request(app).get("/api/v1/admin/assets").set(authHeader(employeeToken)).expect(403);

    const returned = await request(app)
      .post(`/api/v1/admin/assets/${assetId}/return`)
      .set(authHeader(adminToken))
      .send({ returnedDate: today(), condition: "fair", nextStatus: "in_repair", notes: "Loose hinge" })
      .expect(200);
    expect(returned.body.data.status).toBe("in_repair");
    expect(returned.body.data.currentAssignment).toBeNull();
    expect(returned.body.data.history).toHaveLength(1);
    expect(returned.body.data.history[0].returnNotes).toBe("Loose hinge");

    const after = await request(app).get("/api/v1/employee/assets").set(authHeader(employeeToken)).expect(200);
    expect(after.body.data.current).toHaveLength(0);
    expect(after.body.data.past).toHaveLength(1);

    const summary = await request(app).get("/api/v1/admin/assets/summary").set(authHeader(adminToken)).expect(200);
    expect(summary.body.data.byStatus.in_repair).toBe(1);
  });

  it("rejects list filters the schema doesn't know", async () => {
    const { accessToken: adminToken } = await loginAsAdmin(app);
    const res = await request(app).get("/api/v1/admin/assets?unknown=1").set(authHeader(adminToken));
    expect([400, 422]).toContain(res.status);
  });
});
