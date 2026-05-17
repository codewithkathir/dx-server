# LOGGING-STANDARDS.md

## Purpose
This document defines strict logging standards for a Node.js + Express.js + TypeScript + Knex.js + MySQL backend to ensure observability, debugging capability, and production safety.

---

## Core Principle

Logging must be:
- Structured
- Consistent
- Secure
- Non-sensitive
- Production-safe

---

## Logging Library

- Use Pino (recommended) or equivalent structured logger
- Avoid console.log in production

---

## Logging Levels

- info → normal operations
- warn → suspicious or unexpected behavior
- error → failures and exceptions
- debug → development-only logs

---

## What MUST Be Logged

### API Requests
- Request method
- Request URL
- Status code
- Response time
- User ID (if available)

### Errors
- Error message
- Stack trace (internal only)
- Error code
- Context (module, function)

### Critical Actions
- Login attempts
- Failed login attempts
- Password changes
- Role changes
- Payment or sensitive operations

---

## What MUST NOT Be Logged

❌ Passwords  
❌ JWT tokens  
❌ Refresh tokens  
❌ Sensitive personal data  
❌ Payment card details  
❌ Full request body with secrets  

---

## Log Format Standard

All logs must be structured JSON:

{
  "level": "info",
  "message": "User created successfully",
  "timestamp": "2026-01-01T10:00:00Z",
  "service": "user-service",
  "meta": {}
}

---

## Request Logging Middleware

Every request must be logged automatically:

- Incoming request
- Response status
- Execution time

---

## Error Logging Standard

Errors must include:

- error message
- stack trace (internal only)
- request context
- user context (if available)

Example:

{
  "level": "error",
  "message": "Database query failed",
  "errorCode": "DB_ERROR",
  "stack": "..."
}

---

## Service Layer Logging

- Log important business events only
- Avoid excessive logging
- Keep logs meaningful

Example:
- "User created"
- "Order placed"
- "Payment initiated"

---

## Repository Logging

- Only log database errors
- Do NOT log every query in production (unless debug mode)

---

## Controller Logging

- Minimal logging only
- Prefer middleware logging instead

---

## Security Logging Rules

- Never log sensitive data
- Mask user identifiers when needed
- Avoid logging full payloads in auth routes

---

## Environment Rules

### Development
- Allow debug logs
- Verbose logging enabled

### Production
- Only info, warn, error logs
- No debug logs

---

## Performance Rules

- Logging must be asynchronous
- Avoid blocking operations
- Do not log inside tight loops

---

## Audit Logging (Optional but Recommended)

Track:
- user actions
- role changes
- data modifications

Format:
{
  "action": "USER_UPDATED",
  "userId": 1,
  "performedBy": 2,
  "timestamp": ""
}

---

## Anti Patterns (DO NOT DO)

❌ Using console.log in production  
❌ Logging sensitive data  
❌ Logging entire request bodies  
❌ Logging inside loops  
❌ Inconsistent log formats  
❌ Blocking synchronous logging  

---

## Golden Rules

- Logs must be useful, not noisy
- Never log secrets or sensitive data
- Always use structured logging
- Logs should help debugging, not confuse systems
- Production logs must be safe and minimal