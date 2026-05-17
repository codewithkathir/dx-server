# API-STANDARDS.md

## Purpose
This document defines strict standards for designing consistent, scalable, and production-ready APIs using Express.js, TypeScript, Knex.js, and MySQL.

---

## Core API Principles

- APIs must be consistent and predictable
- Follow RESTful design principles
- Always version APIs (/api/v1)
- Keep responses standardized
- Keep controllers thin and services clean
- Never expose database structure directly

---

## Base API Structure

All APIs must follow this pattern:

/api/v1/{module}/{resource}

Examples:
- /api/v1/users
- /api/v1/auth/login
- /api/v1/blogs

---

## HTTP Method Standards

- GET → Fetch data
- POST → Create data
- PUT → Full update
- PATCH → Partial update
- DELETE → Soft delete only

---

## Response Format (STRICT)

### Success Response

{
  "success": true,
  "message": "Operation successful",
  "data": {},
  "meta": {}
}

---

### Error Response

{
  "success": false,
  "message": "Something went wrong",
  "errorCode": "ERROR_CODE",
  "errors": []
}

---

## Pagination Standards

All list APIs must support pagination:

Query params:
- page (default: 1)
- limit (default: 10)
- search (optional)
- sortBy (optional)
- order (asc | desc)

Response meta:

{
  "meta": {
    "page": 1,
    "limit": 10,
    "total": 100,
    "totalPages": 10
  }
}

---

## Filtering Standards

All list APIs must support:

- search (text search)
- filters (field-based filtering)
- date range filtering
- status filtering

Example:
/ users?search=john&status=active

---

## Naming Standards

### Endpoints

- Use plural nouns
- Use lowercase
- Use hyphens only if needed

Examples:
- /users
- /blog-posts
- /user-roles

---

## Authentication Standards

- JWT-based authentication
- Refresh token support
- Protected routes must use middleware
- Public routes must be clearly defined

---

## Authorization Standards

Use Role-Based Access Control (RBAC)

Roles:
- SUPER_ADMIN
- ADMIN
- USER
- EDITOR

Each API must validate permissions where required.

---

## Error Handling Standards

- Use centralized error handler
- Never return raw system errors
- Always use structured error codes
- Validation errors must be clearly formatted

Example error codes:
- VALIDATION_ERROR
- AUTH_FAILED
- NOT_FOUND
- FORBIDDEN
- INTERNAL_ERROR

---

## Validation Standards

- All request inputs must be validated using Zod
- Validation must run before controller execution
- Invalid requests must be rejected immediately

---

## Security Standards

- Use HTTPS in production
- Enable CORS properly
- Use Helmet security headers
- Rate limit sensitive APIs
- Sanitize all inputs
- Hash passwords using bcrypt

---

## Controller Standards

- Must only handle request/response
- Must NOT contain business logic
- Must call service layer only

---

## Service Standards

- Must contain business logic
- Can call multiple repositories
- Can manage transactions

---

## Repository Standards

- Must handle only database operations
- Must use Knex.js only
- Must NOT contain business logic

---

## API Versioning Rules

- All APIs must be versioned
- Default version: v1

Example:
/api/v1/users

---

## Soft Delete Standards

- DELETE API must never hard delete data
- Always use deleted_at field
- Deleted records must be excluded from queries by default

---

## Performance Standards

- Always use pagination for list APIs
- Avoid heavy joins in API response
- Use indexes in database
- Cache frequently used data when needed

---

## Logging Standards

- Log all API requests
- Log all errors
- Do not log sensitive data
- Use structured logging (Pino recommended)

---

## Golden Rules

- Keep APIs consistent
- Never expose DB structure directly
- Always validate inputs
- Keep controllers thin
- Keep services reusable
- Always design for scalability