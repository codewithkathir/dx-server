import rateLimit from "express-rate-limit";
import type { Request } from "express";
import { config } from "../config";

// CORS preflights shouldn't consume quota; dev reloads/polling exhaust it quickly.
const skipGeneral = (req: Request): boolean =>
  req.method === "OPTIONS" || config.isDevelopment;

export const generalRateLimiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.max,
  skip: skipGeneral,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many requests, please try again later",
    errorCode: "RATE_LIMIT_EXCEEDED",
    errors: [],
  },
});

export const authRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: config.rateLimit.authMax,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many authentication attempts",
    errorCode: "RATE_LIMIT_EXCEEDED",
    errors: [],
  },
});
