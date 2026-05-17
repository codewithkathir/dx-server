# QUERY-STANDARDS.md

## Purpose
This document defines strict standards for writing scalable, reusable, and optimized database queries using Knex.js in a Node.js + Express + TypeScript + MySQL backend.

## Core Principles
- All queries must use Knex.js only
- All queries must be inside repository layer only
- No business logic inside queries
- Avoid duplicate query logic
- Always optimize for performance
- Use reusable query utilities for complex filtering

## Query Flow (STRICT)
Controller → Service → Repository → Query Builder → Database

## Repository Rule
- Only repository layer can access database
- Service must never write queries
- Controller must never write queries

Example:
db("users").where({ id }).first()

## Reusable Query Builder
All modules must use a shared query builder for:
- search
- filtering
- pagination
- sorting
- date range filtering
- soft delete handling

## Search Rules
- Use LIKE queries for basic search
- Use indexed columns for performance
- Always whitelist searchable fields

Example:
db("users")
.where(function () {
  this.where("name", "like", `%${search}%`)
      .orWhere("email", "like", `%${search}%`);
})

## Filter Rules
- Filters must be dynamic
- Only allow predefined fields
- Never accept raw column names from request

Example:
if (status) {
  query.where("status", status)
}

## Pagination Rules
- Mandatory for all list APIs
- Default page = 1
- Default limit = 10

Example:
const offset = (page - 1) * limit
query.limit(limit).offset(offset)

## Sorting Rules
- Default sorting: created_at DESC
- Only allow safe fields for sorting

Example:
const allowed = ["created_at", "name"]

if (allowed.includes(sortBy)) {
  query.orderBy(sortBy, order)
}

## Date Range Filtering
Use created_at for filtering ranges

Example:
if (startDate && endDate) {
  query.whereBetween("created_at", [startDate, endDate])
}

## Soft Delete Rule
- Never return deleted records by default
- Always apply:

query.whereNull("deleted_at")

## Join Rules
- Use joins only when necessary
- Avoid deep nested joins
- Always use aliases

Example:
db("users as u")
.join("profiles as p", "u.id", "p.user_id")
.select("u.*", "p.avatar")

## Transaction Rules
Use transactions for multiple operations

Example:
await db.transaction(async (trx) => {
  await trx("users").insert(userData)
  await trx("profiles").insert(profileData)
})

## Performance Rules
- Always index frequently used columns
- Always use pagination
- Avoid full table scans
- Limit large dataset queries
- Avoid unnecessary joins

## Anti Patterns (DO NOT DO)
❌ Raw SQL in services  
❌ Duplicate query logic  
❌ Missing pagination  
❌ Unrestricted sorting  
❌ No soft delete filtering  
❌ Fetching large datasets without limit  

## Best Practices
✔ Use repository pattern  
✔ Use reusable query builder  
✔ Validate all inputs  
✔ Whitelist filter fields  
✔ Optimize queries for performance  
✔ Always apply soft delete rule  

## Golden Rules
- Queries must be reusable
- Queries must be predictable
- Queries must be optimized
- Queries must never contain business logic
- Queries must always respect soft delete