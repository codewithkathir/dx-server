# PERFORMANCE-STANDARDS.md

## Purpose
This document defines strict performance standards for a Node.js + Express + TypeScript + Knex.js + MySQL backend to ensure scalability, speed, and efficient resource usage.

---

## Core Principle

System must be optimized for:
- Low latency
- High throughput
- Efficient database usage
- Minimal memory overhead

---

## API Performance Rules

- All list APIs MUST use pagination
- Never return unlimited datasets
- Avoid heavy synchronous processing in request lifecycle
- Keep response payload minimal and relevant

---

## Database Performance Rules

- Always use indexes for frequently queried columns
- Avoid full table scans
- Use JOINs carefully (only when needed)
- Select only required columns (avoid SELECT *)

Example:
SELECT id, name FROM users

---

## Knex Query Optimization Rules

- All queries must be optimized inside repository layer
- Avoid nested or redundant queries
- Use query builder efficiently
- Avoid multiple DB calls in loops

Bad:
loop → db query each iteration ❌

Good:
single batch query ✔

---

## Caching Strategy

- Use Redis for frequently accessed data
- Cache read-heavy endpoints
- Avoid caching dynamic or sensitive data
- Always define TTL

Cache-aside pattern is preferred.

---

## Pagination Rules

All APIs returning lists MUST include:

- page
- limit
- total (optional)
- hasNext (optional)

Default:
- page = 1
- limit = 10

---

## Memory Management Rules

- Avoid memory leaks in long-running processes
- Clear intervals and listeners properly
- Avoid storing large objects in memory globally

---

## Async Performance Rules

- Always use async/await
- Avoid blocking synchronous operations
- Use Promise.all for parallel operations

Example:
await Promise.all([task1, task2])

---

## Queue Usage for Performance

- Move heavy tasks to queue (BullMQ)
- Do not process heavy logic in request thread
- Use background workers for slow tasks

---

## File Handling Performance

- Use streaming for large file uploads/downloads
- Avoid loading entire file into memory
- Store files outside application core logic

---

## API Response Optimization

- Return only required fields
- Avoid deeply nested JSON unless necessary
- Compress responses if needed (gzip)

---

## Logging Performance Rules

- Logging must be asynchronous
- Avoid excessive logging in hot paths
- Do not log inside loops
- Disable debug logs in production

---

## Connection Pooling Rules

- Always use DB connection pooling
- Configure Knex pool properly
- Avoid opening/closing DB connections repeatedly

Example:
min: 2
max: 10

---

## Rate Limiting Rules

- Implement rate limiting on public APIs
- Protect login and auth endpoints
- Prevent abuse and DDoS-like behavior

---

## Indexing Strategy

- Index foreign keys
- Index frequently searched columns
- Avoid over-indexing (hurts writes)

---

## N+1 Query Problem Rule

- Avoid N+1 queries at all cost
- Replace with JOIN or batch queries

---

## Background Processing Rules

- Move slow operations to queues
- Do not block request lifecycle
- Use cron for scheduled heavy jobs

---

## Monitoring Rules

- Track response time
- Monitor DB query performance
- Log slow queries
- Set alerts for high latency

---

## Security vs Performance Balance

- Do not sacrifice security for speed
- Always validate inputs even if it adds overhead
- Optimize safely, not aggressively

---

## Anti Patterns (DO NOT DO)

❌ SELECT * in production  
❌ No pagination in list APIs  
❌ DB calls inside loops  
❌ Blocking synchronous operations  
❌ No indexing strategy  
❌ Heavy logic in controllers  
❌ Ignoring slow queries  
❌ No caching strategy  

---

## Golden Rules

- Optimize database first, not code
- Use caching wisely
- Keep API responses minimal
- Avoid unnecessary computations
- Design for scale from day one