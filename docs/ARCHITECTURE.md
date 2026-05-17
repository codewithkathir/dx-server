# ARCHITECTURE.md

## 1. Overview

This backend follows a modular, scalable, and enterprise-grade architecture built using:

- Node.js (Runtime)
- Express.js (Web Framework)
- TypeScript (Type Safety)
- Knex.js (Query Builder)
- MySQL (Database)

Designed for:
- Admin dashboards
- User applications
- SaaS platforms
- Long-term scalability

---

## 2. Architecture Principles

### 2.1 Modular Design (Feature-Based)

Each feature is isolated into modules:

modules/
  users/
  auth/
  blogs/

Each module contains:
- controller
- service
- repository
- routes
- validation
- types

---

### 2.2 Layered Architecture Flow

Request → Routes → Validation → Controller → Service → Repository → Knex → MySQL → Response

---

## 3. Layer Responsibilities

### Controller Layer
- Handles request/response
- Calls service layer
- NO business logic

### Service Layer
- Business logic
- Workflows
- Transactions

### Repository Layer
- Database operations only
- Uses Knex.js
- NO business logic

### Validation Layer
- Uses Zod
- Validates request data

---

## 4. Folder Structure

src/
  app/
  config/
  database/
  modules/
  shared/
  routes/
  jobs/
  queues/
  cron/
  sockets/

---

## 5. Module Structure

Each module must follow:

users/
  user.controller.ts
  user.service.ts
  user.repository.ts
  user.routes.ts
  user.validation.ts
  user.types.ts

---

## 6. Database Standards

- Use MySQL relational design
- Use indexes for performance
- Use soft delete instead of hard delete

### Standard Columns

id
created_at
updated_at
deleted_at
created_by
updated_by

---

## 7. Query Standards (Knex.js)

- All DB access inside repository only
- No SQL in controllers
- No duplicate queries
- Use reusable query patterns

---

## 8. Authentication

- JWT Authentication
- Refresh Token system
- Role-Based Access Control (RBAC)

Roles:
SUPER_ADMIN
ADMIN
USER
EDITOR

---

## 9. API Response Format

### Success
{
  "success": true,
  "message": "Success",
  "data": {},
  "meta": {}
}

### Error
{
  "success": false,
  "message": "Error occurred",
  "errorCode": "ERROR_CODE",
  "errors": []
}

---

## 10. Error Handling

- Centralized error handler
- Custom ApiError class
- Standard error codes
- No raw errors exposed

---

## 11. Security

- Input validation (Zod)
- JWT auth
- RBAC
- Rate limiting
- Helmet security headers
- Password hashing (bcrypt)

---

## 12. Performance

- Pagination for all list APIs
- Index frequently used columns
- Optimize Knex queries
- Use Redis caching when needed

---

## 13. Background Jobs

Uses BullMQ + Redis

Use cases:
- Emails
- Notifications
- Reports
- Heavy tasks

---

## 14. Logging

- Use Pino logger
- No console.log in production
- Log errors and requests

---

## 15. Scalability

Supports:
- Microservices
- SaaS multi-tenant apps
- WebSockets
- Queues
- Docker/Kubernetes
- Horizontal scaling

---

## 16. Golden Rules

DO:
- Use modular architecture
- Use repository pattern
- Keep controllers thin
- Validate everything
- Use centralized responses

DON’T:
- Write DB logic in controllers
- Duplicate queries
- Skip validation
- Return raw DB data
- Mix business logic in controller