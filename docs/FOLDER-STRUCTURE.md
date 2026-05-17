# FOLDER-STRUCTURE.md

## Purpose
This document defines the standard folder structure for a scalable, modular, and enterprise-grade Node.js + Express + TypeScript + Knex + MySQL backend.

---

## Core Principle

- Feature-based modular architecture
- Separation of concerns
- Reusable shared layer
- Scalable for microservices in future

---

## Root Project Structure

src/
  app/
  config/
  database/
  modules/
  shared/
  routes/
  middlewares/
  utils/
  jobs/
  queues/
  cron/
  sockets/

---

## Folder Responsibilities

### app/
- App initialization
- Express setup
- Middleware registration

---

### config/
- Environment configuration
- DB config
- External service configs

---

### database/
- Knex configuration
- Migrations
- Seeds

---

### modules/
Feature-based modules (core business logic)

Example:
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

### shared/
Global reusable logic:
- response handlers
- error handlers
- base repository
- helpers
- constants

---

### routes/
- API route aggregation
- Versioning (/v1)

---

### middlewares/
- auth middleware
- validation middleware
- error middleware
- logging middleware

---

### utils/
- helper functions
- formatting utilities
- reusable logic

---

### jobs/
- background job definitions
- business job handlers

---

### queues/
- BullMQ queue setup
- queue producers/consumers

---

### cron/
- scheduled jobs
- time-based tasks

---

### sockets/
- websocket handlers
- real-time event logic

---

## Module Structure (STRICT)

Each module MUST follow this pattern:

modules/
  users/
    user.controller.ts
    user.service.ts
    user.repository.ts
    user.routes.ts
    user.validation.ts
    user.types.ts

---

## Layer Separation Rule

- Controller → HTTP layer only
- Service → business logic only
- Repository → database only

---

## Shared Layer Rule

shared/
Must include:
- response handlers
- error handlers
- base repository
- constants
- reusable utilities

---

## Naming Conventions

- folders → lowercase
- files → feature-name.layer.ts
- example:
  user.service.ts
  user.controller.ts

---

## Scalability Rules

This structure supports:
- microservices migration
- multi-tenant SaaS
- queue-based architecture
- real-time systems (WebSockets)
- horizontal scaling

---

## Anti Patterns (DO NOT DO)

❌ Mixing business logic in controllers  
❌ Direct DB access outside repository  
❌ No module separation  
❌ Duplicating shared logic  
❌ Flat unstructured project  
❌ Skipping shared utilities layer  

---

## Golden Rules

- Everything must be modular
- Every feature must be independent
- Shared logic must be reused
- Layers must never mix responsibilities
- Structure must support scaling without rewrite