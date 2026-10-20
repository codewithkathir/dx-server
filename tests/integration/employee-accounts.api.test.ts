import request from "supertest";
import { createTestApp } from "../helpers/app.helper";
import { resetDatabase } from "../helpers/db.helper";
import { authHeader, loginAsAdmin, loginAsEmployee } from "../helpers/auth.helper";

const today = () => new Date().toISOString().slice(0, 10);

describe("Employee accounts (advances)", () => {
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
    const categories = await request(app).get("/api/v1/employee/dropdowns/categories").set(employee).expect(200);
    const category = (categories.body.data as Array<{ id: number; isVehicleExpense: boolean }>).find((c) => !c.isVehicleExpense)!;
    const subs = await request(app).get(`/api/v1/employee/dropdowns/sub-categories?categoryId=${category.id}`).set(employee).expect(200);
    const methods = await request(app).get("/api/v1/employee/dropdowns/payment-methods").set(employee).expect(200);
    const paymentMethodId = methods.body.data[0].id as number;

    const claim = async (amount: number) => {
      const res = await request(app)
        .post("/api/v1/employee/expenses")
        .set(employee)
        .send({ date: today(), amount, categoryId: category.id, subCategoryId: subs.body.data[0].id, paymentMethodId })
        .expect(201);
      return res.body.data.id as number;
    };
    return { admin, employee, employeeId: me.body.data.id as number, paymentMethodId, claim };
  }

  it("draws approved claims from the advance and reimburses only the rest", async () => {
    const { admin, employee, employeeId, paymentMethodId, claim } = await setup();
    const base = `/api/v1/admin/employee-accounts/${employeeId}`;

    await request(app).get("/api/v1/admin/employee-accounts").set(employee).expect(401);
    const given = await request(app)
      .post(`${base}/advances`)
      .set(admin)
      .send({ amount: 500, entryDate: today(), paymentMethodId, reference: "TT-1" })
      .expect(201);
    expect(given.body.data.balance).toBe(500);

    // Fully covered: settled straight away, no bill.
    const small = await claim(300);
    const preview = await request(app).get(`/api/v1/admin/employee-expenses/${small}/approval-preview`).set(admin).expect(200);
    expect(preview.body.data).toMatchObject({ amount: 300, balanceBefore: 500, fromAdvance: 300, reimbursable: 0, balanceAfter: 200 });
    const settled = await request(app).post(`/api/v1/admin/employee-expenses/${small}/approve`).set(admin).send({}).expect(200);
    expect(settled.body.data).toMatchObject({ adminStatus: "paid", advanceAmount: 300, reimbursableAmount: 0, reimbursement: null });

    // Partly covered: the advance pays 200, a bill for 250.
    const big = await claim(450);
    const split = await request(app).post(`/api/v1/admin/employee-expenses/${big}/approve`).set(admin).send({}).expect(200);
    expect(split.body.data).toMatchObject({ adminStatus: "pending", advanceAmount: 200, reimbursableAmount: 250 });
    expect(split.body.data.reimbursement.totalAmount).toBe(250);
    let account = await request(app).get(base).set(admin).expect(200);
    expect(account.body.data).toMatchObject({ balance: 0, owedToEmployee: 250, totalAdvanced: 500 });

    // Rejecting gives the advance share back and cancels the bill.
    await request(app).post(`/api/v1/admin/employee-expenses/${big}/reject`).set(admin).send({ note: "Duplicate" }).expect(200);
    account = await request(app).get(base).set(admin).expect(200);
    expect(account.body.data).toMatchObject({ balance: 200, owedToEmployee: 0 });

    // "Reimburse in full" leaves the advance alone.
    const ownCard = await claim(80);
    const full = await request(app)
      .post(`/api/v1/admin/employee-expenses/${ownCard}/approve`)
      .set(admin)
      .send({ reimburseInFull: true })
      .expect(200);
    expect(full.body.data).toMatchObject({ advanceAmount: 0, reimbursableAmount: 80 });

    // Returns can't exceed what the employee holds; voiding the advance would go negative.
    await request(app).post(`${base}/returns`).set(admin).send({ amount: 300, entryDate: today(), paymentMethodId }).expect(400);
    await request(app).post(`${base}/returns`).set(admin).send({ amount: 150, entryDate: today(), paymentMethodId }).expect(201);
    const entries = await request(app).get(`${base}/entries?includeVoided=true`).set(admin).expect(200);
    const types = entries.body.data.map((e: { type: string; voidedAt: string | null }) => `${e.type}${e.voidedAt ? "×" : ""}`);
    expect(types).toEqual(["return", "expense×", "expense", "advance"]);
    expect(entries.body.data[0].runningBalance).toBe(50);
    const advanceEntry = entries.body.data.find((e: { type: string }) => e.type === "advance");
    await request(app)
      .post(`/api/v1/admin/employee-accounts/entries/${advanceEntry.id}/void`)
      .set(admin)
      .send({ reason: "Test" })
      .expect(409);
    const claimEntry = entries.body.data.find((e: { type: string; voidedAt: string | null }) => e.type === "expense" && !e.voidedAt);
    await request(app)
      .post(`/api/v1/admin/employee-accounts/entries/${claimEntry.id}/void`)
      .set(admin)
      .send({ reason: "Test" })
      .expect(409);

    // Adjustments can't push the balance below zero.
    await request(app).post(`${base}/adjustments`).set(admin).send({ amount: -60, entryDate: today(), notes: "x" }).expect(400);
    await request(app).post(`${base}/adjustments`).set(admin).send({ amount: -50, entryDate: today(), notes: "Write-off" }).expect(201);

    // The employee sees their own balance and statement.
    const mine = await request(app).get("/api/v1/employee/account").set(employee).expect(200);
    expect(mine.body.data.balance).toBe(0);
    const myEntries = await request(app).get("/api/v1/employee/account/entries").set(employee).expect(200);
    expect(myEntries.body.data).toHaveLength(4);

    const list = await request(app).get("/api/v1/admin/employee-accounts?show=owed").set(admin).expect(200);
    expect(list.body.data.map((a: { employeeId: number }) => a.employeeId)).toEqual([employeeId]);
    const summary = await request(app).get("/api/v1/admin/employee-accounts/summary").set(admin).expect(200);
    expect(summary.body.data).toMatchObject({ advancedThisMonth: 500, returnedThisMonth: 150, owedToEmployees: 80 });
  });
});
