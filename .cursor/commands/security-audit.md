# Security Audit

## Overview

Comprehensive security review to identify and fix vulnerabilities in the
codebase.

## Steps

1. **Dependency audit**
    - Check for known vulnerabilities
    - Update outdated packages
    - Review third-party dependencies
2. **Code security review**
    - Check for common vulnerabilities
    - Review authentication/authorization
    - Audit data handling practices
3. **Infrastructure security**
    - Review environment variables
    - Check access controls
    - Audit network security

## Project-Specific Security Notes

This is a **local-first desktop app** (Tauri 2). There is no server, no network API, and no cloud storage.

- **Encryption**: SQLCipher encrypts the database file at rest. Key derivation uses Argon2id (implemented in `src-tauri/src/kdf.rs`).
- **Custom file header**: EFM1 magic bytes + salt + KDF params stored in `src-tauri/src/file_header.rs`.
- **Password handling**: Master password is used to derive the encryption key. It must never be logged, stored in plaintext, or written to disk.
- **Tauri commands**: All 38 commands in `src-tauri/src/encrypted_db.rs` use parameterized queries (`rusqlite::params![]`) to prevent SQL injection.
- **Attachments**: Stored as base64 in the encrypted database (no external file references).

## Security Checklist

- [ ] Dependencies updated and secure (`cargo audit`, `npm audit`)
- [ ] No hardcoded secrets or passwords
- [ ] Input validation implemented (parameterized SQL queries)
- [ ] Master password never logged or persisted in plaintext
- [ ] SQLCipher encryption verified (file is unreadable without password)
- [ ] No sensitive data in console logs or error messages
- [ ] Tauri `allowlist` properly configured