import pino from "pino";
import { config } from "../../config";

export const logger = pino({
  level: config.isProduction ? "info" : "debug",
  transport: config.isDevelopment
    ? {
        target: "pino/file",
        options: { destination: 1 },
      }
    : undefined,
  redact: {
    paths: [
      "req.headers.authorization",
      "password",
      "refreshToken",
      "accessToken",
    ],
    remove: true,
  },
});
