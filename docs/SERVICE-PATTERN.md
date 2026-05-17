# SERVICE-PATTERN.md

## Purpose
This document defines strict standards for implementing Service Layer in a Node.js + Express + TypeScript + Knex.js + MySQL backend.

---

## Core Principle

Service layer is responsible for BUSINESS LOGIC ONLY.

It acts as a bridge between Controller and Repository.

---

## Service Flow

Controller → Service → Repository → Database

---

## Service Responsibilities

Services MUST:
- Contain all business logic
- Handle workflows and processes
- Coordinate multiple repositories
- Apply business rules
- Transform data before returning

Services MUST NOT:
- Handle HTTP requests/responses
- Perform validation (handled before controller)
- Contain raw database queries
- Contain routing logic

---

## Service Structure Rule

Each module must have a service file:

modules/
  users/
    user.service.ts

---

## Service Design Pattern

Service should be written as a class or functional service.

Preferred Pattern (Class-based):

class UserService {
  async createUser(data) {
    // business logic
  }
}

---

## Service Rules

- Always return clean data objects
- Never return HTTP response objects
- Never use res.json() inside service
- Always throw errors using ApiError
- Keep functions small and focused

---

## Business Logic Rules

All business logic MUST live in service layer:

Examples:
- user creation logic
- order processing logic
- payment calculations
- permission rules
- workflow orchestration

---

## Multi-Repository Handling

Services CAN call multiple repositories:

Example:
- userRepository
- profileRepository
- roleRepository

But:
- Must manage consistency
- Must use transactions when needed

---

## Transaction Handling

If multiple DB operations are required:

- Use Knex transaction
- Ensure atomic operations

Example:

await db.transaction(async (trx) => {
  await userRepo.create(trx, data);
  await profileRepo.create(trx, profile);
});

---

## Error Handling in Service

- Use ApiError for business failures
- Never return error objects
- Always throw errors upward

Example:
throw new ApiError("User not found", "NOT_FOUND", 404);

---

## Data Flow Rule

Service receives:
- validated data

Service returns:
- clean business output

---

## Dependency Rule

Services can depend on:
- repositories
- other services (via interface only)
- shared utilities

Services must NOT depend on:
- Express request/response
- validation layer
- database directly

---

## Reusability Rules

- Extract reusable business logic into helper services
- Avoid duplication across services
- Keep services single-responsibility focused

---

## Naming Standards

Service file naming:
- user.service.ts
- auth.service.ts
- order.service.ts

Function naming:
- camelCase
- action-based naming

Examples:
- createUser()
- getUserById()
- updateUserStatus()

---

## Performance Rules

- Avoid heavy computations inside service loops
- Optimize DB calls
- Use caching when needed
- Reduce unnecessary repository calls

---

## Anti Patterns (DO NOT DO)

❌ Writing SQL in service layer  
❌ Returning HTTP responses from service  
❌ Mixing validation logic in service  
❌ Writing business logic in controller instead of service  
❌ Creating fat services with unrelated logic  
❌ Skipping transactions when needed  

---

## Golden Rules

- Service = Business Logic Layer
- Service must be reusable and testable
- Service must never know HTTP exists
- Service must be framework independent
- Service must be clean and focused