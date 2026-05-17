# FILE-UPLOAD-STANDARDS.md

## Purpose
This document defines strict standards for handling file uploads in a Node.js + Express + TypeScript + Knex.js + MySQL backend where files are stored locally inside the backend server.

---

## Core Principle

File uploads must be secure, validated, and organized.

Files are stored in LOCAL STORAGE (inside backend project directory), not directly exposed to unsafe public paths.

---

## Storage Strategy (LOCAL)

All uploaded files must be stored inside:

uploads/
  images/
  documents/
  temp/
  private/

---

## Folder Rules

- images/ → profile pictures, media
- documents/ → PDFs, docs, files
- temp/ → temporary uploads (auto-cleaned)
- private/ → restricted files (not publicly accessible)

---

## File Upload Flow

Request → Middleware → Validation → Service → Storage → DB Reference

---

## Upload Middleware Rules

- Use multer (recommended)
- Validate file before storing
- Reject invalid file types immediately
- Limit file size

---

## File Naming Standards

Rules:
- Never use original file name directly
- Always generate unique name
- Use timestamp + random string

Example:
user_1700000000_x8k3p9.png

---

## Allowed File Types

Images:
- jpg
- jpeg
- png
- webp

Documents:
- pdf
- doc
- docx

Rules:
- Strict whitelist only
- Reject everything else

---

## File Size Limits

Recommended limits:

- Images → max 2MB - 5MB
- Documents → max 10MB - 20MB

---

## Security Rules

- Validate MIME type (not only extension)
- Scan file before saving if possible
- Prevent executable uploads (.exe, .sh, etc.)
- Sanitize file names

---

## Public Access Rule

- Only images and selected files can be publicly served
- Private files must not be exposed directly

Example:
✔ /uploads/images/profile.png
❌ /uploads/private/secret.pdf (must be protected via API)

---

## File Serving Strategy

Option 1 (Public folder):
- Serve images via Express static middleware

Option 2 (Secure access):
- Serve files via authenticated API endpoint

---

## Database Storage Rule

Store ONLY metadata in DB:

- file_name
- file_path
- file_type
- file_size
- uploaded_by
- created_at

DO NOT store raw binary data in DB.

---

## Upload Service Rule

All file operations must be handled in service layer:
- upload file
- validate file
- store file path
- return metadata

---

## Controller Rule

- Controller only receives file request
- Controller must NOT process file logic
- Controller calls upload service only

---

## Error Handling

Common errors:
- FILE_TYPE_NOT_ALLOWED
- FILE_TOO_LARGE
- UPLOAD_FAILED
- INVALID_FILE

Return format:
{
  "success": false,
  "message": "File upload failed",
  "errorCode": "FILE_UPLOAD_ERROR"
}

---

## Cleanup Rules

- Temporary files must be cleaned periodically
- Failed uploads must be removed automatically
- Orphan files should be tracked and deleted

---

## Performance Rules

- Avoid large file uploads blocking API
- Use streaming for large files if needed
- Limit concurrent uploads

---

## Logging Rules

- Log upload success
- Log upload failure
- Do NOT log file content

---

## Anti Patterns (DO NOT DO)

❌ Storing files in database  
❌ Using original file name directly  
❌ Allowing all file types  
❌ No size limits  
❌ Public access to sensitive files  
❌ Mixing file logic inside controller  

---

## Golden Rules

- Always validate files before storing
- Always use unique filenames
- Always restrict file types and size
- Always separate public and private files
- Never trust client file metadata