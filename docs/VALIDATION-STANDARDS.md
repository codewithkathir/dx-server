# VALIDATION-STANDARDS.md

## Purpose
This document defines strict validation standards for all incoming API requests in a Node.js + Express + TypeScript + Knex.js + MySQL backend.

---

## Core Principle

All incoming requests MUST be validated before reaching controller logic.  
No request is allowed to bypass validation.

---

## Validation Flow

Request → Route → Validation Middleware → Controller → Service → Repository → Database

---

## Validation Library

- Use Zod as the standard validation library
- All schemas must be strongly typed and reusable
- Validation must be centralized per module

---

## Validation Rules (STRICT)

- Validate request body
- Validate query parameters
- Validate route parameters
- Reject invalid requests immediately
- Never validate inside controllers
- Never trust frontend validation

---

## Module Validation Structure

Each module must include:

modules/
  users/
    user.validation.ts

Rules:
- Each feature must have its own validation file
- Shared validations must be placed in shared validators

---

## Schema Standards

- Use strict Zod schemas
- Disallow unknown fields unless explicitly required

Example:
z.object({...}).strict()

---

## Example Validation Schema

const createUserSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6)
});

---

## Request Types Validation

### 1. Body Validation
Used for POST, PUT, PATCH requests

### 2. Query Validation
Used for filtering, search, pagination

### 3. Params Validation
Used for route parameters like /users/:id

---

## Pagination Validation

All list APIs MUST validate:

- page (default 1)
- limit (default 10)
- search (optional)
- sortBy (optional)
- order (asc | desc)

---

## Security Validation Rules

- Sanitize all inputs
- Prevent XSS payloads in text fields
- Prevent unexpected fields injection
- Only allow whitelisted fields

---

## Validation Error Response

{
  "success": false,
  "message": "Validation failed",
  "errorCode": "VALIDATION_ERROR",
  "errors": [
    {
      "field": "email",
      "message": "Invalid email format"
    }
  ]
}

---

## Controller Rule

- Controllers MUST NOT perform validation
- Controllers receive already validated data only

---

## Service Rule

- Services must assume data is valid
- No validation logic inside service layer

---

## Repository Rule

- Repository layer must never validate input
- Only execute database operations

---

## Reusability Rules

- Common validations must be reused
- Avoid duplicating schema logic
- Create shared validators for:
  - email
  - password
  - pagination
  - id validation

---

## Field Standards

### Email
- Must be valid format

### Password
- Minimum 6–8 characters
- Can include strength rules if required

### ID
- Must be number or UUID depending on system design

---

## Performance Rules

- Validation must be lightweight
- Avoid heavy computations in schema
- Reuse schemas instead of recreating

---

## Anti Patterns (DO NOT DO)

❌ Validating inside controller  
❌ Skipping validation for simple APIs  
❌ Allowing unknown fields without restriction  
❌ Duplicating schemas across modules  
❌ Mixing validation with business logic  
❌ Trusting frontend validation only  

---

## Golden Rules

- Every request must be validated
- Backend is the final authority of data integrity
- Invalid data must never reach service layer
- Validation must be strict and reusable