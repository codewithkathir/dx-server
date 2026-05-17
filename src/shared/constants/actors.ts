export const Actors = {
  ADMIN: "admin",
  EMPLOYEE: "employee",
  USER: "user",
} as const;

export type ActorType = (typeof Actors)[keyof typeof Actors];
