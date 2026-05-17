# CODE-STANDARDS.md

## Purpose
This document defines strict coding standards for a Node.js + Express + TypeScript + Knex.js + MySQL backend to ensure clean, scalable, and maintainable code.

---

## Core Principle

Code must be:
- Clean
- Consistent
- Modular
- Readable
- Testable

---

## Architecture Rule

Follow layered architecture strictly:

Request → Controller → Service → Repository → Database

---

## Layer Responsibility Rules

### Controller
- Handle HTTP only
- Call service only
- No business logic

### Service
- Business logic only
- Orchestration layer
- No HTTP or DB logic

### Repository
- Database only (Knex)
- No business logic

---

## TypeScript Rules

- Always use strong typing
- Avoid `any` type
- Define interfaces for all models
- Use DTOs for request/response mapping

---

## Naming Conventions

### Variables
- camelCase

### Constants
- UPPER_SNAKE_CASE

### Files
- feature.layer.ts
  Example:
  user.service.ts
  user.controller.ts

### Database
- snake_case

---

## Function Rules

- Functions must be small and focused
- One function = one responsibility
- Avoid deeply nested logic
- Max complexity should be low

---

## Code Structure Rules

- Keep files under 300–500 lines
- Split large logic into helpers/services
- Avoid duplication (DRY principle)

---

## Import Rules

- Group imports:
  1. Node modules
  2. Internal modules
  3. Types
- Avoid circular dependencies

---

## Error Handling Rules

- Always throw ApiError
- Never return raw errors
- Use global error handler

---

## Validation Rules

- Never validate inside controller
- Use Zod schemas only
- Keep validation reusable

---

## Logging Rules

- Use structured logging
- No console.log in production
- Never log sensitive data

---

## Database Rules

- Use Knex only
- No raw SQL in services/controllers
- Use repository pattern strictly

---

## Performance Rules

- Avoid unnecessary loops
- Optimize DB queries
- Use caching where needed
- Avoid repeated DB calls

---

## Security Rules

- Never trust client input
- Sanitize all inputs
- Avoid exposing internal errors
- Use JWT securely

---

## Code Reusability Rules

- Extract reusable logic into utils/shared
- Avoid duplication across modules
- Use base classes where needed

---

## API Response Rules

Always follow consistent format:

Success:
{
  success: true,
  message: "",
  data: {}
}

Error:
{
  success: false,
  message: "",
  errorCode: ""
}

---

## Async/Await Rules

- Always use async/await
- Avoid callback-based logic
- Handle errors using try-catch or wrapper

---

## Anti Patterns (DO NOT DO)

❌ Business logic in controller  
❌ Direct DB access in controller/service  
❌ Using `any` type  
❌ Large monolithic functions  
❌ Duplicate code  
❌ Unstructured responses  
❌ Ignoring error handling  

---

## Golden Rules

- Keep code simple and readable
- Always follow layered architecture
- Reuse code wherever possible
- Never bypass validation or error handling
- Write code as if multiple developers will maintain it