import type { ActorType } from "../constants/actors";
import type { RoleName } from "../constants/roles";

export interface AuthUser {
  id: number;
  email: string;
  role: RoleName | string;
  permissions: string[];
  actor: ActorType;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
      validated?: {
        body?: unknown;
        query?: unknown;
        params?: unknown;
      };
    }
  }
}

export {};
