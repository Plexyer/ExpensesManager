# Security Review

## Overview

Perform a comprehensive security review of the current code and provide specific remediation steps with code examples for each security issue identified.

## Steps

1. **Authentication & Authorization**
    - Verify proper authentication mechanisms
    - Check authorization controls and permission systems
    - Review session management and token handling
    - Ensure secure password policies and storage
2. **Input Validation & Sanitization**
    - Identify SQL injection vulnerabilities
    - Check for XSS and CSRF attack vectors
    - Validate all user inputs and API parameters
    - Review file upload and processing security
3. **Data Protection**
    - Ensure sensitive data encryption at rest and in transit
    - Check for data exposure in logs and error messages
    - Review API responses for information leakage
    - Verify proper secrets management
4. **Infrastructure Security**
    - Review dependency security and known vulnerabilities
    - Check HTTPS configuration and certificate validation
    - Analyze CORS policies and security headers
    - Review environment variable and configuration security

## Project-Specific Context

This is a **local-first Tauri 2 desktop app** — no server, no network API, no cloud.

- **Encryption at rest**: SQLCipher via `rusqlite` with `bundled-sqlcipher` feature. Key derived from master password using Argon2id (`src-tauri/src/kdf.rs`).
- **File format**: Custom EFM1 header with salt and KDF params (`src-tauri/src/file_header.rs`).
- **SQL injection**: All queries use `rusqlite::params![]` parameterized statements.
- **Password strength**: Evaluated client-side with `zxcvbn` library.
- **No network**: No CORS, HTTPS, or API security concerns. All data stays local.

## Security Review Checklist

- [ ] Master password handling: never logged, never stored in plaintext, cleared from memory when possible
- [ ] SQLCipher encryption: file unreadable without correct password
- [ ] Argon2id KDF parameters adequate (64MB memory, 3 iterations, 4 threads)
- [ ] SQL injection: all queries use parameterized statements (`rusqlite::params![]`)
- [ ] No sensitive data in console logs, error messages, or Tauri event payloads
- [ ] Input validation on all Tauri command arguments
- [ ] Dependency security: `cargo audit` and `npm audit` clean
- [ ] Tauri capability/permission configuration appropriate
- [ ] Attachment data stored securely within encrypted database
- [ ] No secrets in source code or configuration files