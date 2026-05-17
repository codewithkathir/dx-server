# SECURITY-STANDARDS.md

## Purpose
This document defines strict security standards for building a secure, production-ready backend using Node.js, Express.js, TypeScript, Knex.js, and MySQL.

## Core Security Principles
- Security must be applied at every layer
- Never trust user input
- Validate everything before processing
- Never expose sensitive system details
- Follow least privilege access model

---

## Input Validation Security

- All inputs MUST be validated using Zod
- Reject invalid payloads before controller execution
- Never trust request body, params, or query

Rules:
- Validate body
- Validate query params
- Validate route params

---

## Authentication Security

- Use JWT authentication
- Use short-lived access tokens
- Use refresh tokens for session renewal
- Store tokens securely

Rules:
- Never expose secret keys in frontend
- Never store JWT in plain localStorage for sensitive apps (prefer httpOnly cookies)

---

## Authorization (RBAC)

Use Role-Based Access Control:

Roles:
- SUPER_ADMIN
- ADMIN
- USER
- EDITOR

Rules:
- Every protected route must verify role
- Never trust frontend role checks
- Authorization must be enforced in backend only

---

## Password Security

- Use bcrypt for hashing
- Never store plain passwords
- Use strong salt rounds (10+)

Rules:
- Never log passwords
- Never return password fields in API response

---

## Database Security

- Use parameterized queries (Knex handles this)
- Never concatenate raw SQL strings
- Use soft delete instead of hard delete for safety
- Restrict direct DB access outside repository layer

---

## API Security

- Use HTTPS in production
- Enable CORS properly (do not allow *)
- Implement rate limiting on sensitive routes
- Use helmet security headers

---

## Rate Limiting

Apply rate limits on:
- login
- register
- password reset
- OTP endpoints

Example rules:
- 100 requests per 15 minutes (general APIs)
- 5 requests per minute (auth APIs)

---

## Data Exposure Rules

Never expose:
- password
- refresh tokens
- internal IDs if sensitive
- database schema details
- stack traces in production

---

## Error Security

- Never expose raw system errors to client
- Use centralized error handler
- Return safe error messages only

Example:
❌ "SQL syntax error near users table"
✔ "Something went wrong"

---

## Logging Security

- Use Pino logger
- Do NOT log sensitive data:
  - passwords
  - tokens
  - credit card info
- Log only necessary debugging info

---

## CORS Security

Rules:
- Allow only trusted domains
- Do not use wildcard (*) in production
- Restrict methods and headers

---

## Environment Security

- Never commit .env files
- Store secrets securely
- Use different envs for dev/staging/prod

Secrets include:
- DB_PASSWORD
- JWT_SECRET
- REDIS_URL
- API_KEYS

---

## File Upload Security

- Validate file types
- Restrict file size
- Scan files if needed
- Store files in secure storage (not public server root)

---

## SQL Injection Protection

- Use Knex.js query builder only
- Never write raw SQL with string concatenation
- Always parameterize queries

---

## XSS Protection

- Sanitize user inputs
- Escape output when needed
- Avoid rendering raw HTML

---

## CSRF Protection

- Use CSRF tokens for cookie-based auth systems
- Validate origin headers for sensitive actions

---

## Security Headers (Helmet)

Must include:
- Content-Security-Policy
- X-Frame-Options
- X-XSS-Protection
- Strict-Transport-Security

---

## Dependency Security

- Regularly update packages
- Avoid vulnerable npm packages
- Use npm audit or equivalent tools

---

## Production Security Rules

- Disable debug logs
- Disable stack traces in responses
- Enable HTTPS only
- Restrict admin routes
- Use firewall rules if needed

---

## Anti Patterns (DO NOT DO)

❌ Storing secrets in code  
❌ Logging sensitive data  
❌ Exposing stack traces  
❌ Allowing open CORS in production  
❌ Writing raw SQL with string concatenation  
❌ Skipping input validation  
❌ Trusting frontend data  

---

## Golden Rules

- Never trust user input
- Validate everything
- Minimize exposed data
- Enforce security at backend level only
- Assume every request is malicious until validated