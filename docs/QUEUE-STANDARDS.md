# QUEUE-STANDARDS.md

## Purpose
This document defines strict standards for implementing background job queues in a Node.js + Express + TypeScript + Knex.js + MySQL backend using Redis and BullMQ.

---

## Core Principle

Queues must be used for heavy, async, and non-blocking operations.

They must never block API response flow.

---

## Queue Stack

- Redis (Message broker)
- BullMQ (Queue management)

---

## When to Use Queues

Use queues for:
- Email sending
- Notifications
- Report generation
- File processing
- Background data sync
- Heavy computations
- Retryable tasks

---

## When NOT to Use Queues

❌ Simple CRUD operations  
❌ Fast database queries  
❌ Synchronous business logic  
❌ Real-time validation logic  

---

## Queue Architecture Flow

API Request → Service → Queue Producer → Redis → Worker → Processor → Database / External API

---

## Folder Structure

queues/
  producers/
  workers/
  jobs/
  config/

Example:
queues/
  email/
  email.producer.ts
  email.worker.ts

---

## Queue Naming Standards

- Use feature-based queue names
- Use lowercase with hyphens or camelCase

Examples:
- email-queue
- notificationQueue
- report-generation-queue

---

## Producer Rules

Producers are responsible for:
- Adding jobs to queue
- Passing minimal required data
- Never containing business logic

Example:

await emailQueue.add("sendWelcomeEmail", {
  userId,
  email
});

---

## Worker Rules

Workers are responsible for:
- Processing jobs
- Executing business logic
- Calling services/repositories
- Handling retries and failures

Workers MUST NOT:
- Handle HTTP requests
- Contain route logic

---

## Job Structure Standards

Each job must include:

- job name
- payload data
- retry config
- delay (optional)

Example:
{
  name: "sendEmail",
  data: {},
  attempts: 3
}

---

## Retry Strategy

- Default retries: 3
- Exponential backoff recommended
- Failed jobs must be logged

---

## Failure Handling

- Failed jobs must be tracked
- Use dead-letter queue (optional)
- Log all failures in structured format

---

## Idempotency Rule

All queue jobs must be idempotent:
- Same job must not cause duplicate side effects
- Safe to retry multiple times

---

## Queue Worker Lifecycle

1. Pick job from queue
2. Validate payload
3. Execute business logic
4. Update database / external service
5. Mark success or failure

---

## Logging Rules

- Log job start
- Log job success
- Log job failure
- Do not log sensitive data

---

## Performance Rules

- Workers must be scalable horizontally
- Avoid heavy synchronous loops
- Process jobs in batches when possible

---

## Security Rules

- Do not expose queue internals to API layer
- Validate all job payloads
- Avoid injecting unsafe data into jobs

---

## Monitoring Rules

- Track queue length
- Monitor failed jobs
- Alert on repeated failures
- Use dashboard tools if available

---

## Anti Patterns (DO NOT DO)

❌ Using queues for simple API logic  
❌ Putting business logic inside producers  
❌ Blocking API with heavy tasks  
❌ Ignoring job failures  
❌ Non-idempotent jobs  
❌ No retry handling  

---

## Golden Rules

- Queues must be async only
- Producers must be lightweight
- Workers must be reliable and idempotent
- Always design for retry safety
- Never block API requests with heavy tasks