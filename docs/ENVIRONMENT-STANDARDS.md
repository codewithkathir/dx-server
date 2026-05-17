# ENVIRONMENT-STANDARDS.md

## Purpose
This document defines strict standards for managing environment variables and configuration in a Node.js + Express + TypeScript + Knex.js + MySQL backend.

---

## Core Principle

All configuration must be environment-based.

No secrets or environment-specific values should be hardcoded in the codebase.

---

## Environment Files Structure

- .env (local development only)
- .env.example (shared template)
- .env.production (production config reference)
- .env.staging (staging config reference)

---

## Mandatory Rule

- NEVER commit .env files to Git
- ONLY commit .env.example

---

## Required Environment Variables

### Server
PORT=5000
NODE_ENV=development

---

### Database
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=secret
DB_NAME=app_db

---

### JWT
JWT_SECRET=strong_secret_key
JWT_EXPIRES_IN=15m
REFRESH_TOKEN_SECRET=refresh_secret_key
REFRESH_TOKEN_EXPIRES_IN=7d

---

### Redis
REDIS_HOST=localhost
REDIS_PORT=6379

---

### Email (Optional)
SMTP_HOST=
SMTP_PORT=
SMTP_USER=
SMTP_PASS=

---

### File Upload
UPLOAD_PATH=uploads
MAX_FILE_SIZE=5242880

---

## Environment Loading Rules

- Use dotenv package
- Load environment variables at app startup
- Validate environment variables before server start

---

## Environment Validation (STRICT)

- Validate all required env variables
- Fail app startup if missing variables

Example rule:
- If DB_PASSWORD missing → stop server

---

## Configuration Pattern

All env usage must go through config layer:

config/
  index.ts
  db.config.ts
  jwt.config.ts

---

## Access Rule

- Do NOT use process.env directly everywhere
- Use centralized config file instead

Example:
config.db.host instead of process.env.DB_HOST

---

## Security Rules

- Never expose secrets in logs
- Never print env variables
- Never commit credentials
- Rotate secrets periodically

---

## Environment Types

### Development
- Debug enabled
- Verbose logging
- Local database

### Staging
- Production-like setup
- Testing environment

### Production
- Optimized performance
- Strict security
- No debug logs

---

## Deployment Rules

- Each environment must have separate config
- No shared production and dev variables
- Use CI/CD secrets management if possible

---

## Validation Rules

On startup:
- Validate DB config
- Validate JWT secrets
- Validate Redis config (if used)

If invalid:
- Exit process immediately

---

## Anti Patterns (DO NOT DO)

❌ Hardcoding secrets in code  
❌ Committing .env files  
❌ Using process.env everywhere directly  
❌ Missing env validation  
❌ Sharing same env for all environments  
❌ Logging sensitive env variables  

---

## Golden Rules

- Environment variables define system behavior
- Code must never depend on hardcoded config
- All secrets must be externalized
- Validation must happen at startup
- Separate environments strictly