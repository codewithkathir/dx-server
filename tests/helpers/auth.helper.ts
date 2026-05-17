import request from "supertest";
import type { Application } from "express";

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export async function loginAsAdmin(app: Application): Promise<AuthTokens> {
  const res = await request(app)
    .post("/api/v1/auth/admin/login")
    .send({
      email: "admin@example.com",
      password: "Admin@12345",
    })
    .expect(200);

  return {
    accessToken: res.body.data.accessToken,
    refreshToken: res.body.data.refreshToken,
  };
}

export async function loginAsEmployee(app: Application): Promise<AuthTokens> {
  const res = await request(app)
    .post("/api/v1/auth/employee/login")
    .send({
      email: "john.doe@example.com",
      password: "Employee@12345",
    })
    .expect(200);

  return {
    accessToken: res.body.data.accessToken,
    refreshToken: res.body.data.refreshToken,
  };
}

export function authHeader(accessToken: string): { Authorization: string } {
  return { Authorization: `Bearer ${accessToken}` };
}
