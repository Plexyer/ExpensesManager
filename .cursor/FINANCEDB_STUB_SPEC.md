# FinanceDB Stub File Specification

## ⚠️ MVP STUB ONLY — NOT FOR PRODUCTION ⚠️

> **WARNING**: This file format stores passwords in PLAINTEXT. It is intended ONLY for MVP testing and development. It WILL be replaced by SQLCipher-encrypted SQLite before any production release.
>
> **DO NOT** use this format with real financial data or real passwords.

---

## Overview

Before implementing the full SQLCipher encryption layer, we need a simple testable file format to:
- Verify the create/open/unlock UI flows work correctly
- Test file I/O operations
- Enable development of features that require an existing finance file
- Provide a foundation for later migration to encrypted SQLite

---

## File Extension

**Extension**: `.financedb`

We keep the `.financedb` extension even for the stub format so that:
1. UX remains consistent when we switch to the real format
2. File dialogs and filters don't need changes
3. Users don't need to re-learn file associations

---

## Stub File Format

### Format Type

**JSON text file** — easy to parse, debug, and inspect during development.

### Schema (Version 1)

```json
{
  "format": "financedb_stub",
  "version": 1,
  "created_at": "2026-02-06T14:30:00Z",
  "master_password": "user_password_here",
  "password_hint": "optional hint text",
  "metadata": {
    "app_version": "0.1.0",
    "platform": "windows"
  }
}
```

### Field Definitions

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `format` | string | YES | Always `"financedb_stub"`. Identifies this as a stub file, not real encrypted DB. |
| `version` | integer | YES | Schema version. Start at `1`. Increment if format changes. |
| `created_at` | string (ISO 8601) | YES | UTC timestamp when file was created. |
| `master_password` | string | YES | **PLAINTEXT password** — for MVP testing only. |
| `password_hint` | string | NO | Optional user-provided hint. Empty string or omitted if not set. |
| `metadata` | object | NO | Optional metadata for debugging/tracking. |
| `metadata.app_version` | string | NO | App version that created this file. |
| `metadata.platform` | string | NO | Platform that created this file (windows/macos/linux). |

### Example Files

#### Minimal Valid File
```json
{
  "format": "financedb_stub",
  "version": 1,
  "created_at": "2026-02-06T14:30:00Z",
  "master_password": "MySecurePassword123"
}
```

#### Full File with All Fields
```json
{
  "format": "financedb_stub",
  "version": 1,
  "created_at": "2026-02-06T14:30:00Z",
  "master_password": "MySecurePassword123",
  "password_hint": "My favorite pet's name + birth year",
  "metadata": {
    "app_version": "0.1.0",
    "platform": "windows"
  }
}
```

---

## Operations

### Create Finance File

**Flow**:
1. User clicks "Create New Finance File"
2. File picker dialog opens (save)
3. User selects location and filename
4. Password creation modal appears
5. User enters password (+ optional hint)
6. User clicks "Create File"
7. System writes stub JSON file to selected path
8. System marks file as "open" in app state

**File Content Written**:
```json
{
  "format": "financedb_stub",
  "version": 1,
  "created_at": "<current UTC timestamp>",
  "master_password": "<user entered password>",
  "password_hint": "<user entered hint or empty>",
  "metadata": {
    "app_version": "<current app version>",
    "platform": "windows"
  }
}
```

### Open Finance File

**Flow**:
1. User clicks "Open Finance File"
2. File picker dialog opens (open)
3. User selects `.financedb` file
4. System reads and parses JSON file
5. System validates format field is `"financedb_stub"`
6. Unlock modal appears (shows hint if available)
7. User enters password
8. System compares password to stored `master_password`
9. If match → file unlocked, app state updated
10. If mismatch → show error, allow retry

### Unlock Verification

**Algorithm** (stub version):
```typescript
function verifyPassword(inputPassword: string, storedPassword: string): boolean {
  return inputPassword === storedPassword;
}
```

> **Note**: In the final SQLCipher implementation, password verification will be implicit — if the password is wrong, decryption fails and SQLite returns an error.

### Display Password Hint

**Flow**:
1. After 1+ failed password attempts, show "Show Hint" button
2. User clicks "Show Hint"
3. Display `password_hint` from file (if present)
4. If no hint stored, show "No hint available"

---

## Validation Rules

### On File Create
1. `format` must be set to `"financedb_stub"`
2. `version` must be set to `1`
3. `created_at` must be valid ISO 8601 UTC timestamp
4. `master_password` must be non-empty (minimum 12 characters per existing UI validation)

### On File Open
1. File must be valid JSON
2. `format` field must equal `"financedb_stub"`
3. `version` field must be recognized (currently only `1`)
4. `master_password` field must exist and be non-empty

### Error Handling

| Condition | Error Message |
|-----------|---------------|
| Invalid JSON | "Unable to read file. The file may be corrupted." |
| Missing `format` field | "Invalid finance file format." |
| Wrong `format` value | "This file is not a valid finance file." |
| Missing `master_password` | "File is corrupted: missing password data." |
| Unknown `version` | "This file was created by a newer version of the app." |

---

## Security Considerations

### ⚠️ PLAINTEXT PASSWORD WARNING

This stub format stores the master password in **plaintext**. This is acceptable for MVP testing because:

1. No real financial data is stored yet
2. Development/testing environment only
3. Temporary — will be replaced by SQLCipher

**NEVER SHIP THIS TO PRODUCTION**.

### Future: Password Hashing Option

If we need slightly better security during extended MVP testing, we could optionally store a password hash instead:

```json
{
  "format": "financedb_stub",
  "version": 2,
  "created_at": "2026-02-06T14:30:00Z",
  "password_hash": {
    "algorithm": "argon2id",
    "hash": "base64_encoded_hash_here",
    "salt": "base64_encoded_salt_here",
    "params": {
      "memory_cost": 65536,
      "time_cost": 3,
      "parallelism": 4
    }
  },
  "password_hint": "optional hint"
}
```

**Decision**: OPEN — Currently defaulting to plaintext for simplicity (no new dependencies). If user prefers hashing, this can be implemented but would require the `argon2` crate earlier.

---

## Migration Path to SQLCipher

When we implement the real SQLCipher database (TASK-1.6), we need to handle existing stub files:

### Migration Strategy

**Option A: Fresh Start (Recommended for MVP)**
- Stub files are development/testing only
- When SQLCipher is ready, users simply create new real files
- Old stub files become obsolete
- No migration code needed

**Option B: In-Place Migration (If needed)**
1. Detect stub file by `format` field
2. Read `master_password` from stub
3. Create new SQLCipher DB with same password
4. Write any existing data (if any) to new DB
5. Rename/backup old stub file
6. Replace with real encrypted DB

### File Format Detection

```typescript
async function detectFileFormat(path: string): Promise<'stub' | 'sqlcipher' | 'unknown'> {
  try {
    // Try reading as JSON
    const content = await readFile(path, 'utf-8');
    const parsed = JSON.parse(content);
    if (parsed.format === 'financedb_stub') {
      return 'stub';
    }
  } catch {
    // Not JSON, might be SQLCipher
  }
  
  // Try opening as SQLite/SQLCipher
  // (Implementation depends on backend)
  
  return 'unknown';
}
```

---

## Implementation Notes

### Frontend Changes Needed

1. **`fileService.ts`**: Add functions to read/write stub files
   - `writeStubFile(path, password, hint)`
   - `readStubFile(path)` → returns `{ password_hint, ... }`
   - `verifyStubPassword(path, inputPassword)` → boolean

2. **`fileSlice.ts`**: No major changes needed (already tracks path/state)

3. **`PasswordCreationModal.tsx`**: On "Create File", call stub write function

4. **`PasswordUnlockModal.tsx`**: Call stub verify function, display hint

### Backend (Rust) Changes Needed

The stub file I/O can be done in TypeScript via Tauri FS APIs, OR in Rust:

**Option A: TypeScript (Simpler for stub)**
- Use `@tauri-apps/plugin-fs` for file read/write
- JSON parsing in TypeScript
- Less Rust code to write

**Option B: Rust (More consistent)**
- Create Tauri commands for stub file operations
- Consistent with future SQLCipher commands
- Better error handling

**Recommendation**: TypeScript for stub (simpler), Rust for real SQLCipher later.

---

## Testing Scenarios

### Create Flow
1. ✅ Create file with password only → stub file created
2. ✅ Create file with password + hint → stub file created with hint
3. ✅ Create file fails if path is invalid → error shown
4. ✅ Create file fails if path is read-only → error shown

### Open Flow
1. ✅ Open valid stub file → unlock modal appears
2. ✅ Open with correct password → file unlocked
3. ✅ Open with wrong password → error shown, can retry
4. ✅ Open with wrong password, show hint → hint displayed
5. ✅ Open corrupted file → appropriate error shown
6. ✅ Open non-stub file → appropriate error shown

### Edge Cases
1. ✅ Open file created by newer version → warning about version
2. ✅ File path with spaces works correctly
3. ✅ Unicode characters in password work correctly
4. ✅ Unicode characters in hint work correctly
5. ✅ Very long password works correctly

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1 | 2026-02-06 | Initial stub format. Plaintext password storage. |

---

## References

- **MVP_PLAN.md**: Phase 1 - Foundation
- **BACKLOG.md**: TASK-STUB-1 (new)
- **ENCRYPTION_SPEC.md**: Target SQLCipher implementation
- **UI_FLOWS.md**: Flow 1 (Create) and Flow 2 (Open)
