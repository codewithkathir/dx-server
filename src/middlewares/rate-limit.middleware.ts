import rateLimit from "express-rate-limit";
import { config } from "../config";

export const generalRateLimiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.max,
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
