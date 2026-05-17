# PERMISSION-SYSTEM.md

## Purpose
This document defines a strict Role-Based Access Control (RBAC) permission system for a Node.js + Express + TypeScript + Knex.js + MySQL backend.

---

## Core Principle

Permissions must be enforced strictly in the backend.

Frontend role checks are NOT secure and must never be trusted.

---

## Permission Model

System uses RBAC (Role-Based Access Control):

User → Role → Permissions → Access Control

---

## Roles

Default system roles:

- SUPER_ADMIN
- ADMIN
- EDITOR
- USER

---

## Role Hierarchy

SUPER_ADMIN > ADMIN > EDITOR > USER

Higher roles inherit lower role permissions unless explicitly restricted.

---

## Permission Types

Permissions are defined as granular actions:

Examples:
- user.create
- user.read
- user.update
- user.delete

- blog.create
- blog.publish
- blog.delete

---

## Permission Assignment

Permissions are assigned to roles, not directly to users.

User inherits permissions from assigned role.

---

## Access Control Flow

Request → Auth Middleware → Role Middleware → Permission Middleware → Controller → Service

---

## Middleware Enforcement Rule

All protected routes MUST use permission middleware.

Example:
requirePermission("user.create")

---

## Permission Middleware Rules

Middleware must:
- Check authenticated user
- Retrieve user role
- Validate required permission
- Allow or deny request

If unauthorized:
- Return 403 FORBIDDEN

---

## Database Design (Recommended)

Tables:

roles
permissions
role_permissions
user_roles

---

## Permission Check Logic

- Fetch role permissions
- Compare required permission
- Allow only if matched

---

## Dynamic Permissions Rule

System must support:
- Adding new permissions without code changes
- Assigning permissions via admin panel
- Updating role permissions dynamically

---

## Module-Level Permissions

Each module defines its own permissions:

Example:

users:
- user.create
- user.read
- user.update
- user.delete

blogs:
- blog.create
- blog.publish
- blog.delete

---

## Controller Rule

- Controllers must not check permissions directly
- Permission must be handled in middleware only

---

## Service Rule

- Services assume permission already validated
- No role checks inside service layer

---

## Security Rules

- Never trust frontend role checks
- Always enforce backend permission check
- Always validate user role from DB or token
- Never bypass permission middleware

---

## Admin Rules

- SUPER_ADMIN has full access
- ADMIN can manage users but not system settings (optional restriction)
- EDITOR can manage content only
- USER has limited access

---

## Audit Rules

Track permission-sensitive actions:
- role changes
- permission updates
- user access denial attempts

---

## Error Handling

Permission errors must return:

{
  "success": false,
  "message": "Forbidden",
  "errorCode": "FORBIDDEN"
}

---

## Anti Patterns (DO NOT DO)

❌ Checking roles in frontend only  
❌ Skipping permission middleware  
❌ Hardcoding permissions in controller  
❌ Giving all users admin access  
❌ Mixing permissions with business logic  
❌ Duplicating permission logic across modules  

---

## Golden Rules

- Permissions must be centralized
- Backend is the only source of truth
- Roles must be hierarchical
- Middleware must enforce all access rules
- Permissions must be scalable and dynamic