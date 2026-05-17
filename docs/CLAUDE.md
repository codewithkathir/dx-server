
# CLAUDE.md

## Purpose
This file defines the AI (Claude/Cursor AI) behavior rules for generating, modifying, and maintaining this backend system.

It acts as the **single source of truth for code generation style and architecture decisions**.

---

## Core Objective

Build a production-grade, scalable, modular backend using:

- Node.js
- Express.js
- TypeScript
- Knex.js
- MySQL
- Redis (optional)
- BullMQ (queues)

---

## Non-Negotiable Architecture Rules

Always follow:

Request → Middleware → Controller → Service → Repository → Database

STRICT RULES:
- Controller = HTTP only
- Service = Business logic only
- Repository = Database only
- Middleware = Cross-cutting concerns only

---

## Module-Based Architecture

Every feature MUST be a module:

modules/
  users/
  auth/
  orders/

Each module must include:
- controller
- service
- repository
- routes
- validation
- types

No exceptions.

---

## AI Behavior Rules (VERY IMPORTANT)

When generating code:

- NEVER mix layers
- NEVER put business logic in controller
- NEVER access DB outside repository
- NEVER skip validation layer
- ALWAYS follow folder structure
- ALWAYS reuse shared utilities

---

## Code Style Rules

- Use TypeScript strictly
- Avoid `any`
- Use interfaces and DTOs
- Keep functions small and focused
- Prefer readability over clever code

---

## Response Standards

All API responses must follow:

Success:
{
  success: true,
  message: string,
  data: object,
  meta?: object
}

Error:
{
  success: false,
  message: string,
  errorCode: string,
  errors?: array
}

---

## Error Handling Rules

- Use centralized error handler
- Use ApiError class
- Never return raw errors
- Never expose stack traces to client

---

## Validation Rules

- Use Zod for validation
- Validate body, query, params
- MUST be executed before controller

---

## Security Rules

- Never trust frontend data
- Always validate inputs
- Use JWT authentication
- Use RBAC permission system
- Hash passwords using bcrypt

---

## Database Rules

- Use Knex only
- No raw SQL in controllers/services
- Use repository pattern strictly
- Use migrations for schema changes

---

## Performance Rules

- Always paginate list APIs
- Use caching for frequent reads
- Avoid N+1 queries
- Optimize DB queries before scaling servers

---

## Logging Rules

- Use structured logging (Pino)
- Never log sensitive data
- No console.log in production

---

## Queue Rules

- Use BullMQ for heavy tasks
- Keep API responses fast
- Process background jobs asynchronously

---

## Socket Rules

- Sockets only for real-time communication
- No business logic in socket layer
- Always call service layer

---

## File Upload Rules

- Store files locally in /uploads
- Validate file type and size
- Never trust file metadata

---

## Git Rules

- Use feature branches
- Small meaningful commits
- Always use PR reviews
- Never push directly to main

---

## Scalability Rules

System must be:
- modular
- stateless
- horizontally scalable
- microservice-ready

---

## AI STRICT RULE (MOST IMPORTANT)

If any instruction conflicts with architecture:

👉 ALWAYS FOLLOW THIS FILE (CLAUDE.md)

This file overrides all other design assumptions.

---

## Anti Patterns (DO NOT DO)

❌ Business logic in controller  
❌ Direct DB access outside repository  
❌ Skipping validation  
❌ Monolithic code  
❌ Hardcoded configuration  
❌ Ignoring error handling  
❌ Tightly coupled modules  

---

## Final Golden Rule

Build like this system will handle:

- millions of users
- multiple teams
- microservices migration
- long-term maintenance

Design everything for scale from day one.