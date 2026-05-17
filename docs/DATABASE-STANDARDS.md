# DATABASE-STANDARDS.md

## Purpose
This document defines strict standards for database design and usage in a scalable MySQL + Knex.js backend.

## Core Stack
- MySQL (Database)
- Knex.js (Query Builder)
- Redis (Optional caching layer)

## Database Design Rules
- Use relational database design
- Follow normalization (1NF, 2NF, 3NF where needed)
- Avoid duplicate data
- Use indexes for performance
- Prefer soft delete instead of hard delete
- Keep schema clean and consistent

## Table Naming Rules
- Use snake_case
- Use plural names

Example:
users, blog_posts, user_roles

## Column Naming Rules
- Use snake_case
- Use meaningful names only

Example:
user_id, created_at, updated_at, deleted_at

## Mandatory Columns (EVERY TABLE)
- id
- created_at
- updated_at
- deleted_at
- created_by
- updated_by

## Soft Delete Rule
- Never hard delete in production
- Use deleted_at timestamp instead

## Indexing Rules
- Add indexes for primary keys
- Add indexes for foreign keys
- Add indexes for frequently filtered columns
- Add indexes for sorting columns like created_at

## Relationship Rules
- Use proper foreign keys
- Maintain referential integrity
- Avoid unnecessary deep nesting

Example relations:
users → posts (1:M)
posts → comments (1:M)

## Query Rules (Knex.js)
- All queries must be inside repository layer only
- No raw SQL in controllers or services
- Use Knex query builder only
- Avoid duplicate query logic
- Prefer reusable query functions

Example:
db("users").where({ id }).first()

## Migration Rules
- All schema changes must use migrations
- Never modify DB manually in production
- Keep migrations reversible when possible

Naming:
create_users_table
add_status_to_users
create_blog_posts_table

## Seed Rules
- Use seeds only for development/testing
- Never overwrite production data
- Use seeds for default admin, roles, config

## Performance Rules
- Always use indexes on large tables
- Use pagination for list APIs
- Avoid full table scans
- Optimize joins carefully
- Avoid heavy nested queries

## Data Integrity Rules
- Use correct data types
- Enforce NOT NULL where needed
- Avoid storing unnecessary JSON
- Maintain referential integrity

## Security Rules
- Never store plain passwords
- Use bcrypt for hashing
- Never expose sensitive DB columns in API
- Use soft delete instead of hard delete

## Golden Rules
- Keep database simple and scalable
- Prefer normalization over duplication
- Always design for future scaling
- Treat DB as core architecture, not storage only