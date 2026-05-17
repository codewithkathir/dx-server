# AUTH-STANDARDS.md

## Purpose
This document defines strict authentication and authorization standards for a secure, scalable backend using Node.js, Express.js, TypeScript, Knex.js, and MySQL.

## Core Authentication Strategy
- Use JWT-based authentication
- Use Access Token + Refresh Token model
- Stateless authentication for APIs
- Secure session handling using tokens

## Token Strategy
Access Token:
- Short-lived (15m–60m)
- Used for API authentication
- Sent in Authorization header

Refresh Token:
- Long-lived (7–30 days)
- Used to generate new access tokens
- Stored securely (httpOnly cookie recommended)

## Login Flow
- Validate input (Zod)
- Verify user exists
- Compare password using bcrypt
- Generate access + refresh tokens
- Return tokens securely

## Registration Flow
- Validate user input
- Hash password using bcrypt
- Store user in database
- Assign default role USER
- Return success response

## Password Rules
- Always hash passwords using bcrypt
- Never store plain text passwords
- Never return password in API response
- Use strong salt rounds (10+)

## Authorization (RBAC)
Roles:
- SUPER_ADMIN
- ADMIN
- USER
- EDITOR

Rules:
- All protected routes must use auth middleware
- Authorization must be handled in backend only

## Auth Middleware Rules
- Extract token from header or cookie
- Verify JWT signature
- Decode user payload
- Attach user to request object
- Return 401 if invalid

## Refresh Token Flow
- Access token expires
- Client sends refresh token
- Server validates refresh token
- Generate new access token
- Optional: rotate refresh token

## Logout Flow
- Invalidate refresh token (DB or blacklist)
- Clear cookies if used
- Remove token from client

## Security Rules
- Never expose JWT secret
- Always use HTTPS in production
- Use httpOnly cookies for refresh tokens
- Apply rate limiting on auth routes
- Block brute force attacks

## Password Reset Flow
- Generate reset token
- Store hashed token in DB with expiry
- Send reset link via email
- Validate token
- Update password

## Email Verification Flow
- Generate verification token
- Store hashed token in DB
- Send verification email link
- Verify token on click
- Activate user account

## Error Codes
- AUTH_FAILED
- UNAUTHORIZED
- FORBIDDEN
- TOKEN_EXPIRED
- INVALID_CREDENTIALS

## API Response Example (Login)
{
  "success": true,
  "message": "Login successful",
  "data": {
    "accessToken": "",
    "refreshToken": "",
    "user": {}
  }
}

## Middleware Flow
Request → Auth Middleware → Role Check → Controller → Service → Repository

## Anti Patterns (DO NOT DO)
❌ Store JWT secret in code  
❌ Return password in API response  
❌ Skip token validation  
❌ Trust frontend roles  
❌ Store tokens insecurely  
❌ Use long-lived access tokens  
❌ Skip password hashing  

## Golden Rules
- Authentication must be secure by default
- Authorization must always be backend controlled
- Tokens must be short-lived
- Passwords must always be hashed
- Never trust client-side security