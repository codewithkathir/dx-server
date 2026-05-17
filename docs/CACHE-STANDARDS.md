# CACHE-STANDARDS.md

## Purpose
This document defines strict caching standards for a Node.js + Express + TypeScript + Knex.js + MySQL backend using Redis.

---

## Core Principle

Caching is used to improve performance by reducing database load and speeding up frequent read operations.

Cache must always be treated as a temporary layer, not a source of truth.

---

## Cache Stack

- Redis (Primary cache store)

---

## When to Use Cache

Use caching for:
- Frequently read data
- Static or semi-static data
- Heavy DB query results
- API responses with high traffic
- Configuration data
- Master data (roles, categories, settings)

---

## When NOT to Use Cache

❌ Sensitive data (passwords, tokens)  
❌ Highly dynamic real-time data  
❌ Financial transaction states (unless carefully controlled)  
❌ One-time operations  

---

## Cache Flow

Request → Cache Check → Return Cache OR DB → Store in Cache → Return Response

---

## Cache Key Naming Standard

Format:
module:entity:identifier

Examples:
- users:profile:123
- blogs:list:page1_limit10
- auth:session:userId

Rules:
- Always use consistent naming
- Avoid random keys
- Include versioning if needed

---

## Cache TTL (Time To Live)

Rules:
- Short-lived data → 1–5 minutes
- Medium data → 10–60 minutes
- Static data → hours or days

Never use infinite TTL unless explicitly required.

---

## Cache Read Strategy

- Check Redis first
- If cache miss → fetch from DB
- Store result in cache
- Return response

---

## Cache Write Strategy

- Update DB first
- Then update or invalidate cache
- Ensure consistency

---

## Cache Invalidation Rules

Cache must be invalidated when:
- Data is updated
- Data is deleted
- Related dependencies change

Strategies:
- Delete specific key
- Pattern-based invalidation
- TTL expiration fallback

---

## Cache Aside Pattern (RECOMMENDED)

Flow:
1. Check cache
2. If exists → return
3. If not → query DB
4. Store result in cache
5. Return response

---

## Write Through Pattern (Optional)

- Write to DB and cache simultaneously
- Ensures strong consistency

---

## Cache Aside vs Write Through

- Cache Aside → default recommended
- Write Through → for critical consistency use cases

---

## Performance Rules

- Avoid caching large unnecessary payloads
- Cache only optimized query results
- Compress data if needed
- Avoid frequent cache writes

---

## Security Rules

- Never store sensitive data in cache
- Protect Redis with authentication
- Restrict access to cache layer
- Do not expose cache data via API

---

## Error Handling

- Cache failure must NOT break API
- Always fallback to database
- Log cache errors silently (non-blocking)

Example:
try {
  get from cache
} catch {
  fallback to DB
}

---

## Logging Rules

- Log cache hits
- Log cache misses (optional in dev)
- Log cache failures
- Avoid noisy production logs

---

## Cache Invalidation Examples

- User update → invalidate users:profile:{id}
- Blog update → invalidate blogs:list:*

---

## Anti Patterns (DO NOT DO)

❌ Using cache as primary database  
❌ Storing sensitive data in Redis  
❌ No cache invalidation strategy  
❌ Over-caching dynamic data  
❌ Ignoring cache consistency  
❌ Blocking API when cache fails  

---

## Golden Rules

- Cache is temporary, not source of truth
- Always have DB as fallback
- Always plan invalidation strategy
- Cache only when performance benefit is clear
- Keep cache logic simple and predictable