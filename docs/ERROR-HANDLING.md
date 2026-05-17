# ERROR-HANDLING.md

## Purpose
This document defines a centralized, consistent, and scalable error handling strategy for Node.js + Express.js + TypeScript + Knex.js backend.

---

## Core Principle
All errors MUST be handled in a centralized way.

No API is allowed to throw unstructured or raw errors to the client.

---

## Error Flow

Request → Controller → Service → Repository → Error Thrown → Global Error Handler → Response Formatter

---

## Error Types

### 1. Operational Errors (Expected)
- Validation errors
- Authentication errors
- Not found errors
- Business rule violations

### 2. Programming Errors (Unexpected)
- Null reference errors
- Database connection failures
- Undefined variables
- System crashes

---

## Central Error Handler (MANDATORY)

All errors must pass through a global error middleware.

Responsibilities:
- Catch all thrown errors
- Format error response
- Hide internal system details
- Log technical error details

---

## Standard Error Response Format

{
  "success": false,
  "message": "Something went wrong",
  "errorCode": "ERROR_CODE",
  "errors": []
}

---

## Custom Error Class (ApiError)

All application errors must use a custom error class.

Properties:
- message
- errorCode
- statusCode
- details (optional)

Example:
throw new ApiError("User not found", "NOT_FOUND", 404)

---

## Standard Error Codes

- VALIDATION_ERROR
- AUTH_FAILED
- UNAUTHORIZED
- FORBIDDEN
- NOT_FOUND
- INTERNAL_ERROR
- TOKEN_EXPIRED
- INVALID_CREDENTIALS
- DATABASE_ERROR

---

## Controller Error Rule

- Controllers MUST NOT handle try-catch individually for business logic
- Controllers should call services and pass errors upward

---

## Service Error Rule

- Services can throw ApiError for business rules
- Services must NOT format responses
- Services must NOT swallow errors

---

## Repository Error Rule

- Repository errors must be thrown upward
- Do NOT handle business logic errors in repository
- Wrap database errors if needed

---

## Validation Error Handling

- Use Zod for validation
- Validation errors must be converted into VALIDATION_ERROR format

Example:
{
  "field": "email",
  "message": "Invalid email format"
}

---

## Database Error Handling

- Catch Knex/MySQL errors in global handler
- Convert raw DB errors into safe messages
- Never expose SQL queries to client

---

## Async Error Handling Rule

- All async routes must be handled properly
- Use async wrapper middleware

Example pattern:
wrapAsync(fn)

---

## Logging Rules

- Log full technical error internally
- Do NOT expose stack traces to client
- Use Pino or similar structured logger

Logged data:
- stack trace
- request URL
- request body (sanitized)
- user ID (if available)

---

## Production Error Rules

In production:
- Never expose stack traces
- Never expose system internals
- Always return generic messages

Example:
❌ "SQL syntax error near users table"
✔ "Internal server error"

---

## Security Error Rules

- Do not leak database schema
- Do not expose authentication internals
- Do not reveal file paths or system structure

---

## Retry & Recovery Rules

- Do not retry validation errors
- Retry only transient system failures (DB, network)
- Use queue systems for retry logic when needed

---

## Middleware Error Flow

Request → Route → Controller → Service → Repository → Error → Global Error Handler → Response

---

## Anti Patterns (DO NOT DO)

❌ Returning raw errors from controller  
❌ Using multiple inconsistent error formats  
❌ Exposing stack traces to frontend  
❌ Swallowing errors silently  
❌ Logging sensitive data in errors  
❌ Writing try-catch everywhere without standardization  

---

## Golden Rules

- All errors must be centralized
- All errors must be structured
- No raw system errors exposed
- Always log internally, respond safely
- Consistency is more important than verbosity