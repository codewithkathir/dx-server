# MIDDLEWARE-STANDARDS.md

## Purpose
This document defines strict standards for middleware usage in a Node.js + Express + TypeScript + Knex.js + MySQL backend to ensure security, consistency, and scalability.

---

## Core Principle

Middleware is responsible for request interception, preprocessing, and cross-cutting concerns only.

It must NOT contain business logic.

---

## Middleware Flow

Request → Middleware → Validation → Controller → Service → Repository

---

## Middleware Responsibilities

Middleware MUST:
- Handle authentication checks
- Handle authorization checks
- Validate requests (via validation middleware)
- Log requests and responses
- Handle errors globally
- Parse request data safely

Middleware MUST NOT:
- Contain business logic
- Access database directly (except auth lookup if required)
- Replace service layer logic
- Perform feature-specific processing

---

## Types of Middleware

### 1. Authentication Middleware
- Verifies JWT token
- Attaches user to request object
- Rejects unauthorized requests

---

### 2. Authorization Middleware
- Checks user roles (RBAC)
- Validates permissions
- Blocks unauthorized access

---

### 3. Validation Middleware
- Uses Zod schemas
- Validates body, query, params
- Rejects invalid requests early

---

### 4. Error Middleware (GLOBAL)
- Catches all application errors
- Formats error response
- Prevents stack trace leakage

---

### 5. Logging Middleware
- Logs incoming requests
- Logs response status and time
- Captures request metadata

---

### 6. Rate Limiting Middleware
- Prevents abuse
- Limits API requests per IP/user
- Applied on sensitive endpoints

---

## Middleware Structure Rule

All middleware must be placed in:

middlewares/

Examples:
- auth.middleware.ts
- role.middleware.ts
- validation.middleware.ts
- error.middleware.ts
- logger.middleware.ts

---

## Authentication Middleware Rules

- Extract token from header or cookie
- Verify JWT signature
- Attach decoded user to req.user
- Return 401 if invalid or missing

Example:
req.user = decodedToken

---

## Authorization Middleware Rules

- Must run after authentication middleware
- Must validate roles/permissions
- Must use RBAC system

Example roles:
- SUPER_ADMIN
- ADMIN
- USER
- EDITOR

---

## Validation Middleware Rules

- Must use Zod schemas
- Must validate before controller execution
- Must return structured validation error

---

## Error Middleware Rules

- Must be global and last middleware
- Must catch all thrown errors
- Must return safe error response
- Must NOT expose stack trace in production

---

## Logging Middleware Rules

- Log request method, URL, status, response time
- Do NOT log sensitive data
- Must be non-blocking

---

## Rate Limiting Rules

- Apply on auth routes
- Apply on sensitive endpoints
- Prevent brute force attacks

---

## Security Rules

- Never trust request headers without validation
- Always verify JWT in auth middleware
- Never attach sensitive data to req object
- Sanitize request inputs

---

## Execution Order Rule

Middleware must execute in correct order:

1. Logger middleware
2. Auth middleware
3. Authorization middleware
4. Validation middleware
5. Controller
6. Error middleware (global)

---

## Anti Patterns (DO NOT DO)

❌ Writing business logic in middleware  
❌ Accessing database in middleware unnecessarily  
❌ Skipping auth checks in protected routes  
❌ Mixing validation with controller logic  
❌ Logging sensitive data  
❌ Multiple conflicting middleware layers  

---

## Golden Rules

- Middleware must be reusable
- Middleware must be generic, not feature-specific
- Middleware must not contain business logic
- Middleware must be predictable and isolated
- Middleware must improve request pipeline, not complicate it