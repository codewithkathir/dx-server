# NAMING-CONVENTIONS.md

## Purpose
This document defines strict naming conventions for a Node.js + Express + TypeScript + Knex.js + MySQL backend to ensure consistency, readability, and scalability.

---

## Core Principle

Naming must be consistent, predictable, and self-explanatory across the entire codebase.

---

## File Naming Conventions

### Backend Files
Use:
feature.layer.ts

Examples:
- user.controller.ts
- user.service.ts
- user.repository.ts
- user.routes.ts
- user.validation.ts
- user.types.ts

---

## Folder Naming

- lowercase only
- feature-based naming
- no spaces or special characters

Examples:
- users/
- auth/
- blog-posts/
- payments/

---

## Database Naming (MySQL)

### Tables
- snake_case
- plural form preferred

Examples:
- users
- user_roles
- blog_posts
- order_items

---

### Columns
- snake_case only

Examples:
- created_at
- updated_at
- user_id
- is_active

---

## API Naming Conventions

### REST Endpoints

Use plural nouns:

- GET /users
- GET /users/:id
- POST /users
- PUT /users/:id
- DELETE /users/:id

---

## Variable Naming

- Use camelCase

Examples:
- userName
- emailAddress
- createdAt
- isActive

---

## Constant Naming

- Use UPPER_SNAKE_CASE

Examples:
- JWT_SECRET
- MAX_FILE_SIZE
- DEFAULT_PAGE_LIMIT

---

## Function Naming

- Use camelCase
- Must be action-based

Examples:
- createUser()
- getUserById()
- updateUserStatus()
- deleteUserAccount()

---

## Service Naming Rules

- Service classes must use PascalCase

Examples:
- UserService
- AuthService
- PaymentService

---

## Controller Naming Rules

- Controller classes must use PascalCase

Examples:
- UserController
- AuthController

---

## Repository Naming Rules

- Repository classes must use PascalCase

Examples:
- UserRepository
- OrderRepository

---

## Enum Naming

- Use PascalCase for enum names
- Use UPPER_CASE for values

Example:

enum UserRole {
  SUPER_ADMIN,
  ADMIN,
  USER
}

---

## Interface Naming

- Use PascalCase
- Prefix optional with "I" (optional standard)

Examples:
- IUser
- IUserService
- CreateUserRequest

---

## Boolean Naming Rules

- Must start with is, has, can, should

Examples:
- isActive
- hasPermission
- canEdit
- shouldRetry

---

## Event Naming (Sockets)

- Use lowercase with colon separation

Examples:
- user:online
- message:send
- notification:read

---

## Queue Naming

- lowercase with hyphen or camelCase

Examples:
- email-queue
- notificationQueue
- report-generation

---

## Cron Job Naming

- descriptive and time-based

Examples:
- daily-report.cron.ts
- cleanup-expired-tokens.cron.ts

---

## Error Code Naming

- UPPER_SNAKE_CASE

Examples:
- VALIDATION_ERROR
- AUTH_FAILED
- NOT_FOUND
- INTERNAL_ERROR

---

## Middleware Naming

- suffix with .middleware.ts

Examples:
- auth.middleware.ts
- role.middleware.ts
- error.middleware.ts

---

## Utility Naming

- descriptive helper names

Examples:
- formatDate()
- generateToken()
- hashPassword()

---

## Anti Patterns (DO NOT DO)

❌ Mixed naming styles  
❌ Using spaces in file names  
❌ camelCase for DB tables  
❌ snake_case for JS variables  
❌ Inconsistent API naming  
❌ Vague function names like handleData()  

---

## Golden Rules

- Naming must be consistent across entire project
- Names must describe purpose clearly
- Follow conventions strictly
- No mixed casing styles
- Prefer readability over brevity