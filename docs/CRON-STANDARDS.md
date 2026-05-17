# CRON-STANDARDS.md

## Purpose
This document defines strict standards for implementing scheduled (cron) jobs in a Node.js + Express + TypeScript + Knex.js + MySQL backend.

---

## Core Principle

Cron jobs are time-based background tasks that must run automatically and independently from API requests.

They must be predictable, safe, and idempotent.

---

## Cron Stack

- Node Cron / Bree / Agenda (any scheduler)
- Redis (optional for coordination)
- MySQL (data source)
- BullMQ (optional for heavy cron tasks)

---

## When to Use Cron Jobs

Use cron jobs for:
- Daily reports
- Scheduled emails
- Data cleanup
- Syncing external APIs
- Database maintenance
- Archiving old data
- Periodic analytics updates

---

## When NOT to Use Cron Jobs

❌ Real-time processing  
❌ User-triggered operations  
❌ Heavy synchronous API logic  
❌ Instant response workflows  

---

## Folder Structure

cron/
  jobs/
  tasks/
  config/
  index.ts

Example:
cron/
  jobs/
    daily-report.cron.ts
    cleanup.cron.ts

---

## Cron Job Design Rules

Each cron job must:
- Have a clear name
- Have a single responsibility
- Be reusable and isolated
- Be idempotent (safe to rerun)

---

## Cron Scheduling Rules

Use standard cron expressions:

Format:
* * * * *
| | | | |
| | | | └── Day of week (0 - 6)
| | | └──── Month (1 - 12)
| | └────── Day of month (1 - 31)
| └──────── Hour (0 - 23)
└────────── Minute (0 - 59)

---

## Example Schedules

- Every minute → * * * * *
- Every hour → 0 * * * *
- Daily at midnight → 0 0 * * *
- Weekly → 0 0 * * 0

---

## Execution Flow

Cron Trigger → Job Handler → Service Layer → Repository → Database / External API

---

## Business Logic Rule

- Cron jobs must call service layer only
- No business logic inside cron file itself
- Cron files act only as triggers

---

## Error Handling

- Wrap all cron jobs in try-catch
- Log errors properly
- Never crash the process

Example:
try {
  await service.runTask();
} catch (err) {
  logger.error(err);
}

---

## Logging Rules

- Log job start
- Log job completion
- Log failures
- Include execution time

---

## Performance Rules

- Avoid heavy computation inside cron main thread
- Use batching for large datasets
- Avoid overlapping executions

---

## Overlapping Prevention

- Use locking mechanism (Redis lock recommended)
- Prevent duplicate cron execution

---

## Security Rules

- Cron jobs must not expose endpoints
- Sensitive operations must be internal only
- Validate all data used in cron jobs

---

## Monitoring Rules

- Track execution success/failure
- Monitor execution time
- Alert on repeated failures

---

## Retry Strategy

- Retry failed cron jobs if safe
- Avoid infinite retry loops
- Log retry attempts

---

## Anti Patterns (DO NOT DO)

❌ Writing business logic inside cron file  
❌ Running heavy tasks without batching  
❌ Allowing overlapping executions  
❌ No error handling in cron jobs  
❌ Direct DB logic without service layer  
❌ Untracked cron executions  

---

## Golden Rules

- Cron jobs must be predictable
- Cron jobs must be idempotent
- Cron jobs must be lightweight
- Cron jobs must always use service layer
- Cron jobs must never block system performance