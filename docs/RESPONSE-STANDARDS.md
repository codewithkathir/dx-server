# RESPONSE-STANDARDS.md

## Purpose
This document defines strict standards for API response structure to ensure consistency, predictability, and scalability across all backend services using Node.js, Express.js, TypeScript, Knex.js, and MySQL.

---

## Core Principle
All API responses MUST follow a unified structure across the entire system.

No endpoint is allowed to return random or inconsistent formats.

---

## Success Response Format

All successful responses must follow this structure:

{
  "success": true,
  "message": "Operation successful",
  "data": {},
  "meta": {}
}

### Fields Explanation
- success → always true for success responses
- message → human-readable success message
- data → actual response payload
- meta → pagination or additional info (optional)

---

## Error Response Format

All error responses must follow this structure:

{
  "success": false,
  "message": "Something went wrong",
  "errorCode": "ERROR_CODE",
  "errors": []
}

### Fields Explanation
- success → always false for errors
- message → user-friendly error message
- errorCode → machine-readable error identifier
- errors → detailed validation or field errors

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

## Pagination Response Format

For list APIs, response MUST include meta object:

{
  "success": true,
  "message": "Data fetched successfully",
  "data": [],
  "meta": {
    "page": 1,
    "limit": 10,
    "total": 100,
    "totalPages": 10
  }
}

---

## API Response Rules

- Always return JSON
- Never return raw database response directly
- Always wrap response inside success/error structure
- Never expose internal system errors
- Always use consistent message format

---

## Controller Rules

- Controllers must ONLY return standardized responses
- Controllers must NOT format raw DB output
- Controllers must use response helper functions

---

## Service Rules

- Services must return clean data objects
- Services must NOT return HTTP responses
- Services must NOT handle formatting

---

## Repository Rules

- Repositories must return raw data only
- No formatting inside repository
- No response structure inside repository

---

## Response Helper Pattern (MANDATORY)

Use centralized helpers:

- successResponse()
- errorResponse()
- paginationResponse()

---

## Example Success Response

{
  "success": true,
  "message": "User fetched successfully",
  "data": {
    "id": 1,
    "name": "John"
  }
}

---

## Example Error Response

{
  "success": false,
  "message": "User not found",
  "errorCode": "NOT_FOUND",
  "errors": []
}

---

## Security Rules

- Never expose stack traces in response
- Never expose SQL errors
- Never expose internal service names
- Always sanitize error messages

---

## Logging vs Response Rule

- Logs can contain technical details
- Responses must contain safe messages only

---

## Anti Patterns (DO NOT DO)

❌ Returning raw DB results directly  
❌ Different response formats across APIs  
❌ Exposing stack traces to clients  
❌ Sending unstructured error objects  
❌ Mixing service and response logic  
❌ Returning HTML or plain text  

---

## Golden Rules

- Every API response must be predictable
- Success and error formats must never change
- Frontend should never guess response structure
- Always use centralized response handlers