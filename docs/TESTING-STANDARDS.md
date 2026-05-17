# TESTING-STANDARDS.md

## Purpose
This document defines strict testing standards for a Node.js + Express + TypeScript + Knex.js + MySQL backend to ensure reliability, stability, and maintainability.

---

## Core Principle

All critical business logic MUST be testable and tested.

Testing is mandatory for service layer and important API flows.

---

## Testing Stack

- Jest (Unit Testing)
- Supertest (API Testing)
- ts-jest (TypeScript support)

Optional:
- Cypress (E2E testing)
- Mock libraries (jest mocks)

---

## Testing Levels

### 1. Unit Tests
- Test service layer logic
- Test utility functions
- Test business rules

### 2. Integration Tests
- Test API endpoints
- Test controller → service → repository flow

### 3. End-to-End Tests (Optional)
- Full user flow testing
- Real system behavior validation

---

## Testing Scope Rules

Must test:
- Authentication logic
- Business rules in services
- Validation rules
- Critical API endpoints

Avoid over-testing:
- Simple getters/setters
- Pure framework code
- Trivial utility wrappers

---

## Folder Structure

tests/
  unit/
  integration/
  e2e/
  mocks/
  helpers/

OR per module:

modules/
  users/
    __tests__/
      user.service.test.ts
      user.controller.test.ts

---

## Unit Testing Rules

- Must test service layer only
- No DB calls (mock repositories)
- Focus on business logic
- Use mocks for dependencies

---

## Integration Testing Rules

- Test API endpoints using Supertest
- Include real request/response flow
- Use test database or in-memory DB
- Seed test data before tests

---

## Database Testing Rules

- Use separate test database
- Never use production DB
- Reset DB before each test run
- Use migrations for test DB setup

---

## Mocking Rules

Mock:
- repositories
- external APIs
- email services
- queue systems

Do NOT mock:
- service logic in unit tests
- validation logic

---

## Test Data Rules

- Use factories or seeders for test data
- Avoid hardcoding test data everywhere
- Keep test data reusable

Example:
createUserFactory()

---

## Naming Standards

Test files must follow:

*.test.ts

Examples:
- user.service.test.ts
- auth.controller.test.ts

---

## Assertion Rules

- Use clear and strict assertions
- Validate both success and failure cases
- Always test edge cases

---

## Coverage Standards

Minimum coverage targets:

- Services: 80%+
- Controllers: 70%+
- Critical modules: 90%+

---

## CI/CD Integration

- Tests must run on every push
- Block deployment if tests fail
- Generate coverage reports

---

## Error Testing Rules

Must test:
- Validation errors
- Authentication failures
- Authorization failures
- Not found cases
- Unexpected system errors

---

## Performance Testing (Optional)

- Load testing for high traffic APIs
- Stress testing for critical endpoints
- Use tools like Artillery or k6

---

## Anti Patterns (DO NOT DO)

❌ Skipping service layer tests  
❌ Testing only controllers without logic coverage  
❌ Using production DB in tests  
❌ Writing flaky tests  
❌ Ignoring edge cases  
❌ No separation between unit and integration tests  

---

## Golden Rules

- Testing ensures system reliability
- Service layer must always be testable
- Tests must be repeatable and deterministic
- Mock external dependencies
- Never rely on production data for testing