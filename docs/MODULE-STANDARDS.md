# MODULE-STANDARDS.md

## Purpose
This document defines strict standards for building feature-based modules in a scalable Node.js + Express + TypeScript + Knex.js + MySQL backend.

---

## Core Principle

Each module is a self-contained feature unit that includes all logic required for that feature.

No module should depend on internal implementation of another module.

---

## Module Structure (STRICT)

Every module must follow this structure:

modules/
  users/
    user.controller.ts
    user.service.ts
    user.repository.ts
    user.routes.ts
    user.validation.ts
    user.types.ts

---

## Module Rules

- Each module represents a single business feature
- Modules must be independent
- No cross-module logic inside controllers
- Shared logic must go into shared/ folder

---

## Layer Responsibilities Inside Module

### Controller
- Handle HTTP requests
- Call service layer only
- No business logic allowed

### Service
- Contains business logic
- Handles workflows
- Can call multiple repositories
- Can interact with other services (only via interfaces)

### Repository
- Handles database operations only
- Uses Knex.js only
- No business logic allowed

### Validation
- Uses Zod
- Validates all incoming requests
- Must be executed before controller

### Types
- Defines TypeScript interfaces/types
- Must be module-specific only

---

## Module Design Rules

- Each module must be self-contained
- No shared state between modules
- All dependencies must be injected or imported from shared layer
- Avoid circular dependencies

---

## Communication Between Modules

Allowed:
- Service-to-service communication (via interfaces)
- Shared utilities usage

Not allowed:
- Controller-to-controller calls
- Repository-to-repository calls across modules

---

## Module Independence Rule

Each module must be able to:
- Be tested independently
- Be moved or refactored without breaking other modules
- Be scaled into microservice if needed

---

## Naming Standards

Module naming must follow feature-based naming:

Examples:
- users/
- auth/
- blogs/
- payments/
- orders/

---

## File Naming Standards

Inside each module:

- controller → user.controller.ts
- service → user.service.ts
- repository → user.repository.ts
- routes → user.routes.ts
- validation → user.validation.ts
- types → user.types.ts

---

## Module Boundaries Rules

- No direct DB access outside repository
- No HTTP logic outside controller
- No business logic in controller
- No validation inside service or controller

---

## Shared vs Module Logic

### Shared Layer (shared/)
- reusable helpers
- base repository
- error handling
- response utilities

### Module Layer (modules/)
- feature-specific logic only

---

## Scalability Rules

Modules must support:
- microservices extraction
- independent deployment
- horizontal scaling
- multi-team development

---

## Anti Patterns (DO NOT DO)

❌ Mixing multiple features in one module  
❌ Calling repository of another module directly  
❌ Writing business logic in controller  
❌ Creating tightly coupled modules  
❌ Duplicating shared logic inside modules  
❌ Skipping validation layer  

---

## Golden Rules

- One module = one feature
- Modules must be independent
- Keep modules clean and isolated
- Always use layered architecture inside module
- Design modules for future microservices readiness