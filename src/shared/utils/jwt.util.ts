import jwt from "jsonwebtoken";
import { jwtConfig } from "../../config/jwt.config";
import type { ActorType } from "../constants/actors";
import type { AuthUser } from "../types/express";

export interface TokenPayload {
  sub: number;
  email: string;
  role: string;
  actor: ActorType;
}

export function generateAccessToken(user: AuthUser): string {
  const payload: TokenPayload = {
    sub: user.id,
    email: user.email,
    role: user.role,
    actor: user.actor,
  };
  return jwt.sign(payload, jwtConfig.secret, {
    expiresIn: jwtConfig.expiresIn,
  } as jwt.SignOptions);
}

export function generateRefreshToken(userId: number): string {
  return jwt.sign({ sub: userId }, jwtConfig.refreshSecret, {
    expiresIn: jwtConfig.refreshExpiresIn,
  } as jwt.SignOptions);
}

export function verifyAccessToken(token: string): TokenPayload {
  const decoded = jwt.verify(token, jwtConfig.secret);
  if (typeof decoded === "string") {
    throw new Error("Invalid token payload");
  }
  if (!decoded.actor) {
    throw new Error("Invalid token: missing actor");
  }
  return {
    sub: Number(decoded.sub),
    email: String(decoded.email),
    role: String(decoded.role),
    actor: String(decoded.actor) as ActorType,
  };
}

export function verifyRefreshToken(token: string): { sub: number } {
  const decoded = jwt.verify(token, jwtConfig.refreshSecret);
  if (typeof decoded === "string") {
    throw new Error("Invalid token payload");
  }
  return { sub: Number(decoded.sub) };
}
