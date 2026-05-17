import type { Application } from "express";
import { createApp } from "../../src/app/app";

export function createTestApp(): Application {
  return createApp({ enableRateLimit: false });
}
