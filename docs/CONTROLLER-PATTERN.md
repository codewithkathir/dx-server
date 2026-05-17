# CONTROLLER-PATTERN.md

## Purpose
This document defines strict standards for implementing Controller Layer in a Node.js + Express + TypeScript + Knex.js + MySQL backend.

---

## Core Principle

Controller layer is responsible ONLY for handling HTTP requests and responses.

It is NOT allowed to contain business logic.

---

## Controller Flow

Request → Route → Validation → Controller → Service → Repository

---

## Controller Responsibilities

Controllers MUST:
- Handle incoming HTTP requests
- Extract params, body, query
- Call service layer
- Return standardized responses
- Handle HTTP status codes

Controllers MUST NOT:
- Contain business logic
- Access database directly
- Perform validation logic
- Implement complex computations

---

## Controller Structure Rule

Each module must have a controller file:

modules/
  users/
    user.controller.ts

---

## Controller Design Pattern

Preferred Pattern:

class UserController {
  async createUser(req, res, next) {
    try {
      const result = await userService.createUser(req.body);
      return res.success(result);
    } catch (err) {
      next(err);
    }
  }
}

---

## Controller Rules

- Must be thin layer only
- Must delegate logic to service layer
- Must never return raw DB data
- Must always use response helpers
- Must use try-catch OR async wrapper middleware

---

## Request Handling Rules

Controller can access:
- req.body
- req.params
- req.query
- req.user (from auth middleware)

Controller must NOT:
- Modify business logic data
- Perform transformations that belong in service layer

---

## Response Handling Rules

Controllers MUST use standardized response helpers:

Success:
res.success(data, message)

Error:
next(error)

---

## Status Code Rules

- 200 → Success GET
- 201 → Created
- 400 → Validation error
- 401 → Unauthorized
- 403 → Forbidden
- 404 → Not found
- 500 → Server error

---

## Error Handling in Controller

- Do NOT swallow errors
- Always pass errors to global error handler
- Use next(error)

Example:
catch (error) {
  next(error);
}

---

## Async Handling Rule

All controller methods must be async-safe:

- Use async/await
- Use wrapper to avoid repetitive try-catch

Example:
wrapAsync(handler)

---

## Dependency Rule

Controllers can depend on:
- services
- response helpers

Controllers must NOT depend on:
- repositories
- database
- knex
- raw queries

---

## Naming Standards

File naming:
- user.controller.ts
- auth.controller.ts

Method naming:
- createUser
- getUserById
- updateUser
- deleteUser

---

## Thin Controller Rule (STRICT)

Controllers must be extremely thin:

Bad:
- writing logic inside controller ❌
- calculating values ❌

Good:
- calling service only ✔
- returning response ✔

---

## Performance Rules

- Avoid heavy processing in controller
- Do not call multiple services unnecessarily
- Keep request handling minimal

---

## Anti Patterns (DO NOT DO)

❌ Writing business logic in controller  
❌ Direct DB access in controller  
❌ Skipping service layer  
❌ Returning raw request data without formatting  
❌ Duplicating logic across controllers  
❌ Large fat controllers  

---

## Golden Rules

- Controller = HTTP layer only
- Controller must stay thin always
- Controller must never know database exists
- Controller must only call service layer
- Controller must only handle request/response