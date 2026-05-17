import request from "supertest";
import { createTestApp } from "../helpers/app.helper";

describe("Health API", () => {
  const app = createTestApp();

  it("GET /api/health returns success", async () => {
    const res = await request(app).get("/api/health").expect(200);

    expect(res.body).toMatchObject({
      success: true,
      message: "Server is healthy",
      data: { status: "ok" },
    });
    expect(res.body.data.timestamp).toBeDefined();
  });
});
