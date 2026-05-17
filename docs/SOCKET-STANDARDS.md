# SOCKET-STANDARDS.md

## Purpose
This document defines strict standards for implementing real-time communication using WebSockets (Socket.io) in a Node.js + Express + TypeScript + MySQL backend.

---

## Core Principle

Sockets are used ONLY for real-time communication and must not contain business logic.

All business logic must remain in service layer.

---

## Socket Stack

- Socket.io (recommended)
- Node.js + Express server integration
- Redis (optional for scaling sockets across instances)

---

## When to Use Sockets

Use sockets for:
- Real-time notifications
- Chat systems
- Live updates
- Presence status (online/offline)
- Real-time dashboards
- Collaborative features

---

## When NOT to Use Sockets

❌ CRUD operations  
❌ Database-heavy logic  
❌ Authentication logic  
❌ Business workflows  
❌ File processing  

---

## Folder Structure

sockets/
  index.ts
  handlers/
  events/
  middlewares/
  services/

---

## Socket Initialization Rule

- Socket setup must be done in a single entry file
- Server and socket logic must be separated cleanly

Example:
server → app initialization
socket → real-time layer

---

## Connection Flow

Client → Connect → Authenticate → Join Rooms → Emit/Receive Events

---

## Authentication in Socket

- Use JWT for socket authentication
- Validate token during connection
- Attach user data to socket instance

Example:
socket.user = decodedToken

---

## Event Naming Standards

- Use lowercase with dots or camelCase
- Be consistent across system

Examples:
- user:online
- message:send
- notification:read

---

## Room Naming Standards

Format:
module:entity:id

Examples:
- chat:room:123
- user:123
- order:456

---

## Event Structure Standard

All socket events MUST follow structure:

{
  event: "eventName",
  data: {},
  timestamp: ""
}

---

## Client → Server Events

- sendMessage
- joinRoom
- leaveRoom
- markAsRead

---

## Server → Client Events

- newMessage
- notificationReceived
- userStatusChanged

---

## Business Logic Rule

- Socket handlers MUST call service layer
- No direct DB calls inside socket handlers
- No business logic inside event files

---

## Service Integration Rule

Sockets can call:
- service layer
- shared utilities
- cache layer

Sockets must NOT:
- access repository directly
- contain business logic

---

## Error Handling

- Emit error events instead of crashing
- Handle socket errors gracefully

Example:
socket.emit("error", { message: "Something went wrong" });

---

## Scaling Rules

For multi-server setup:
- Use Redis adapter for Socket.io
- Enable pub/sub communication
- Avoid storing state in memory only

---

## Performance Rules

- Avoid heavy payloads in events
- Emit only necessary data
- Batch events if needed
- Avoid frequent unnecessary emits

---

## Security Rules

- Always authenticate socket connections
- Validate all incoming events
- Do not trust client payload
- Rate limit socket events if needed

---

## Logging Rules

- Log connection events
- Log disconnections
- Log important event triggers
- Avoid logging sensitive payloads

---

## Anti Patterns (DO NOT DO)

❌ Writing business logic inside socket handlers  
❌ Direct DB calls in socket layer  
❌ Unauthenticated socket connections  
❌ Sending large payloads frequently  
❌ Ignoring disconnections and cleanup  
❌ Using sockets for CRUD APIs  

---

## Golden Rules

- Sockets are for real-time only
- Business logic must stay in service layer
- Events must be simple and consistent
- Always secure socket connections
- Design sockets for horizontal scaling