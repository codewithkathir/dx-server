import express from "express";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import cookieParser from "cookie-parser";
import { config } from "../config";
import apiRouter from "../routes";
import { requestLogger } from "../middlewares/logger.middleware";
import { generalRateLimiter } from "../middlewares/rate-limit.middleware";
import {
  errorHandler,
  notFoundHandler,
} from "../middlewares/error.middleware";

export interface CreateAppOptions {
  enableRateLimit?: boolean;
}

export function createApp(options: CreateAppOptions = {}): express.Application {
  const { enableRateLimit = true } = options;
  const app = express();

  app.set("trust proxy", 1);

  app.use(helmet());
  app.use(
    cors({
      origin: ["http://localhost:3000", "http://localhost:5173, *"],// config.cors.origin,
      credentials: true,
    })
  );
  app.use(compression());
  app.use(express.json({ limit: "10mb" }));
  app.use(express.urlencoded({ extended: true }));
  app.use(cookieParser());
  app.use(requestLogger);

  if (enableRateLimit) {
    app.use(generalRateLimiter);
  }

  app.use("/api", apiRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
