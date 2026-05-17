# BACKEND-STANDARDS.md

## Purpose
This document defines strict backend development standards for building a clean, scalable, maintainable, and production-ready system using Node.js, Express.js, TypeScript, Knex.js, and MySQL.

## Core Stack
- Node.js (Runtime)
- Express.js (Framework)
- TypeScript (Language)
- Knex.js (Query Builder)
- MySQL (Database)

Optional:
- Redis (Caching / Queue)
- BullMQ (Background Jobs)

## Architecture Rule (STRICT)
Every request must follow this flow:

Request → Route → Validation → Controller → Service → Repository → Database

## Layer Responsibilities

### Controller
- Handle HTTP request and response
- Call service methods only
- Must NOT contain business logic
- Must NOT access database directly

### Service
- Contains all business logic
- Handles workflows and transactions
- Can call multiple repositories

### Repository
- Handles database operations only
- Uses Knex.js only
- Must NOT contain business logic

### Validation
- Uses Zod
- Validates all incoming requests
- Reject invalid data before controller execution

## Forbidden Rules
- No database queries in controller
- No business logic in controller
- No duplicate query logic
- No raw SQL outside repository
- No skipping validation
- No console.log in production
- No hardcoded business logic in routes

## Folder Structure Rule
Each feature must be a module:

modules/
  users/
  auth/
  blogs/

Each module must contain:
- controller
- service
- repository
- routes
- validation
- types

## Naming Conventions

Files:
- user.controller.ts
- user.service.ts
- user.repository.ts

Variables:
- camelCase

Constants:
- UPPER_CASE

Database Tables:
- snake_case

## API Standards

Base URL:
/api/v1/

Success Response:
{
  "success": true,
  "message": "Success",
  "data": {},
  "meta": {}
}

Error Response:
{
  "success": false,
  "message": "Error occurred",
  "errorCode": "ERROR_CODE",
  "errors": []
}

## Authentication Standards
- JWT Authentication
- Refresh Token mechanism
- Role-Based Access Control (RBAC)

Roles:
- SUPER_ADMIN
- ADMIN
- USER
- EDITOR

## Database Standards
- Use MySQL relational design
- Use indexes for performance
- Use soft delete instead of hard delete

Standard Columns:
- id
- created_at
- updated_at
- deleted_at
- created_by
- updated_by

## Query Standards
- All database queries must be inside repository layer
- Use Knex.js only
- No duplicate query logic
- Use reusable query helpers where needed

## Security Standards
- Input validation using Zod
- Password hashing using bcrypt
- JWT authentication
- Rate limiting
- Helmet security headers
- CORS configuration

## Error Handling Standards
- Centralized error handler
- Custom ApiError class
- Standard error codes
- No raw errors exposed to client

## Logging Standards
- Use Pino logger
- No console.log in production
- Log requests, errors, and critical actions

## Performance Standards
- Use pagination for all list APIs
- Add indexes on frequently used columns
- Optimize Knex queries
- Use Redis caching when needed

## Background Jobs
Use BullMQ + Redis for:
- Email sending
- Notifications
- Reports
- Heavy processing tasks

## Code Quality Rules
- Follow DRY principle
- Keep controllers thin
- Business logic only in service layer
- Keep files under 300–500 lines
- Reuse code via helpers and services

## Scalability Standards
Architecture must support:
- Microservices migration
- SaaS multi-tenancy
- WebSockets
- Queue systems
- Docker deployment
- Horizontal scaling

## Golden Rules

DO:
- Use modular architecture
- Use repository pattern
- Validate everything
- Use centralized response format
- Keep business logic inside service layer

DON’T:
- Write DB logic in controller
- Skip validation
- Duplicate query logic
- Return raw DB data
- Mix business logic inside routes