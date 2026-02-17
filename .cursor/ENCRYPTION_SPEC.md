# Encryption Specification — IMPLEMENTED

## Status: IMPLEMENTED

All encryption features are fully implemented and working:
- **Encryption**: rusqlite + SQLCipher (`bundled-sqlcipher` feature) — IMPLEMENTED
- **Password Hashing**: Argon2id exclusively (no SHA256) — IMPLEMENTED
- **Target Platform**: Windows 11 only for MVP (MacOS/Linux deferred to post-MVP)
- **Implementation Files**: `src-tauri/src/kdf.rs`, `src-tauri/src/file_header.rs`, `src-tauri/src/encrypted_db.rs`

---

## Overview

The MVP uses encrypted portable finance files (`.financedb`). Each file contains a plaintext header (magic bytes, salt, KDF params, optional password hint) followed by a SQLCipher-encrypted SQLite database.

---

## Master Password UX Expectations

### Create Finance File Flow
1. User selects file location via file picker
2. User enters master password (with strength indicator)
3. User confirms master password
4. User optionally enters password hint
5. System creates encrypted database file

### Unlock Finance File Flow
1. User selects finance file via file picker
2. User enters master password
3. System verifies password and decrypts database
4. If wrong password: Show error, allow retry (with hint if available)

### Change Password Flow (Future)
1. User navigates to Settings → Security
2. User enters current password
3. User enters new password (with confirmation)
4. System re-encrypts database with new password
5. **Note**: Not in MVP scope, document for future

---

## Encryption Implementation

### SQLCipher via rusqlite

SQLCipher is an SQLite extension providing transparent AES-256 encryption, used by Signal, WhatsApp, and similar. The app uses `rusqlite` with the `bundled-sqlcipher` feature.

```toml
# Actual Cargo.toml dependencies
[dependencies]
rusqlite = { version = "0.35", features = ["bundled-sqlcipher"] }
argon2 = "0.5"           # Argon2id key derivation
hex = "0.4"              # Hex encoding for raw keys
rand = "0.9"             # Secure random for salt generation
```

**Key points**:
- Bundles SQLCipher from source (no external dependencies on Windows)
- First build takes +5–15 minutes (cached thereafter)
- Binary size increases ~5–10 MB (acceptable for desktop)
- `rusqlcipher` crate is outdated — do not use

**Build Requirements (Windows 11)**:
- Rust toolchain (rustup)
- MSVC C++ compiler (Visual Studio Build Tools)

### Key Derivation Function (KDF)

**Implementation file**: `src-tauri/src/kdf.rs`

SQLCipher uses PBKDF2 by default, but the app bypasses it using the raw hex key format to use Argon2id instead.

```rust
// src-tauri/src/kdf.rs — actual constants
pub const MEMORY_COST_KIB: u32 = 65_536; // 64 MB
pub const TIME_COST: u32 = 3;             // 3 iterations
pub const PARALLELISM: u32 = 4;           // 4 threads
pub const OUTPUT_LENGTH: usize = 32;      // 32 bytes = 256 bits (AES-256)
pub const SALT_LENGTH: usize = 32;        // 32 bytes from OS CSPRNG
```

### SQLCipher Key Setting

**Critical**: The app uses raw hex key format (`x'hex'`) to bypass SQLCipher's internal PBKDF2 and use the Argon2id-derived key directly.

```rust
// Simplified pattern from src-tauri/src/encrypted_db.rs
let key_hex = hex::encode(derived_key);
conn.pragma_update(None, "key", format!("x'{}'", key_hex))?;
// Verify key works (will error if wrong password)
conn.query_row("SELECT count(*) FROM sqlite_master", [], |_| Ok(()))?;
```

- The `x'...'` syntax tells SQLCipher to use the bytes directly as the encryption key
- No PBKDF2 is performed by SQLCipher when using this format
- Key must be exactly 32 bytes (256 bits) for AES-256
- The `SELECT count(*) FROM sqlite_master` query verifies decryption succeeded

---

## File Format Specification (Implemented)

**Implementation file**: `src-tauri/src/file_header.rs`

### File Header (plaintext, before the encrypted SQLite data)

```rust
// src-tauri/src/file_header.rs — actual constants
pub const MAGIC: &[u8; 4] = b"EFM1";       // ExpensesManager File v1
pub const VERSION: u8 = 1;                   // File format version
pub const MAX_HINT_LENGTH: usize = 255;      // Max password hint bytes
pub const FIXED_HEADER_SIZE: usize = 50;     // Fixed portion size
```

### Binary Layout

```
Offset  Size     Field
------  -------  ---------------------------------
0       4        Magic bytes: b"EFM1"
4       1        Version: 1
5       32       Salt (random, from OS CSPRNG)
37      4        memory_cost (u32 LE) = 65536
41      4        time_cost (u32 LE) = 3
45      4        parallelism (u32 LE) = 4
49      1        hint_length (u8, 0–255)
50      0–255    password_hint (UTF-8, optional)
50+N    ...      SQLCipher-encrypted SQLite database
```

### FileHeader Struct

```rust
pub struct FileHeader {
    pub salt: [u8; 32],
    pub memory_cost: u32,
    pub time_cost: u32,
    pub parallelism: u32,
    pub password_hint: Option<String>,  // None if hint_length == 0
}
```

### Platform Support
- **MVP**: Windows 11 only
- **Post-MVP**: MacOS and Linux can be added later (SQLCipher is cross-platform)

---

## Threat Model

### Threat 1: Wrong Password
**Scenario**: Attacker tries to unlock file with wrong password  
**Mitigation**: 
- Rate limiting (max 5 attempts, then lockout)
- Show generic error ("Incorrect password")
- Don't reveal if file exists or is encrypted

### Threat 2: Brute Force Attack
**Scenario**: Attacker tries many passwords to crack encryption  
**Mitigation**:
- Argon2id KDF (slow, memory-hard)
- High iteration count (3+ iterations, 64MB+ memory)
- Rate limiting on unlock attempts

### Threat 3: Memory Exposure
**Scenario**: Encryption key or plaintext data in memory  
**Mitigation**:
- Keep key in memory only during active session
- Clear key on app close/minimize
- Use secure memory allocation (if available)
- Don't log sensitive data

### Threat 4: File Corruption
**Scenario**: Encrypted file corrupted, can't decrypt  
**Mitigation**:
- Backup guidance (user should backup file)
- File integrity checks (magic number, version)
- Error handling with recovery guidance

### Threat 5: Key Loss
**Scenario**: User forgets master password  
**Mitigation**:
- Password hint (optional, stored in file header)
- Clear warning: "If you forget your password, your data cannot be recovered"
- No password recovery mechanism (by design)

---

## KDF Parameters (Implemented)

### Argon2id Parameters
- **Algorithm**: Argon2id (resistant to both GPU and side-channel attacks)
- **Memory Cost**: 65,536 KiB (64 MB)
- **Time Cost**: 3 iterations
- **Parallelism**: 4 threads
- **Output Length**: 32 bytes (256 bits for AES-256)
- **Salt Length**: 32 bytes from OS CSPRNG (stored plaintext in file header)

---

## UX Details (Implemented)

### Password Strength
- **Minimum length**: 8 characters (recommended: 12+)
- **Strength indicator**: `zxcvbn` library shows password strength (weak/medium/strong) in real time
- **Recommendations**: Mix of uppercase, lowercase, numbers, symbols

### Password Hint
- **Optional**: User can provide a hint during file creation
- **Storage**: Plaintext in file header (max 255 bytes UTF-8)
- **Display**: Shown alongside "Incorrect password" error on unlock

### Error Handling
- **Wrong password**: "Incorrect password" error with optional hint shown, allows retry
- **Corrupted/invalid file**: "Invalid file format" error with guidance
- **Non-EFM1 file**: Magic-byte check rejects non-finance files immediately

---

## Testing Strategy

### Unit Tests
- Key derivation (Argon2id)
- Encryption/decryption (SQLCipher or app-level)
- File format (header read/write)

### Integration Tests
- Create encrypted file
- Unlock encrypted file
- Wrong password handling
- File corruption handling

### Performance Tests
- Encryption/decryption speed
- KDF performance (should be < 1 second)
- Large database encryption

---

## OS Secure Storage / Keychain (Post-MVP)

### Purpose
- Store database password for "Remember password on this device" feature
- Store lease tokens for subscription plans (post-MVP)

### Implementation
- Use OS-provided secure storage:
  - **Windows**: Windows Credential Manager (via `keyring` crate or equivalent)
  - **macOS**: Keychain (post-MVP)
  - **Linux**: Secret Service / libsecret (post-MVP)

### Password Remember Feature (CONFIRMED)
- Prompt for password on every database open
- Offer "Remember password on this device" checkbox
- If enabled: store password in OS secure storage
- On next open: retrieve from secure storage, auto-unlock
- User can clear stored password in Settings

### Lease Token Storage (Post-MVP)
- Store subscription lease tokens in OS secure storage
- More secure than file system storage
- Auto-refresh token when network available

---

## Recovery Secret Handling (CONFIRMED from LICENSING.md)

### Privacy-First Recovery
- No email/account required for perpetual licenses
- Recovery Secret issued at purchase time
- User must save Recovery Secret securely (we don't store it)

### Server-Side Storage
- **Stored**: `license_id`, `hash(recovery_secret)` (Argon2/bcrypt)
- **NEVER store plaintext** Recovery Secret
- Also stores: `feature_updates_until`, other entitlements

### Recovery Flow
1. User provides `license_id` + `recovery_secret`
2. Server verifies: `hash(provided_secret) == stored_hash`
3. If valid: reissue license file with new `generation`
4. User imports new license file into app

### Security Notes
- Rate-limit recovery attempts (prevent brute force)
- Rate-limit reissues per `license_id` (e.g., 1 per X days)
- Log recovery attempts for fraud detection

---

## References

- **SQLCipher**: https://www.zetetic.net/sqlcipher/
- **Argon2**: https://github.com/P-H-C/phc-winner-argon2
- **Rust Argon2**: https://docs.rs/argon2/
- **AES-GCM**: https://docs.rs/aes-gcm/
- **Licensing Spec**: `.cursor/LICENSING.md`

---

## Resolved Questions

1. **SQLCipher Rust bindings**: `rusqlite` with `bundled-sqlcipher` feature — IMPLEMENTED
2. **Password Hashing**: Argon2id exclusively, no SHA256 — IMPLEMENTED
3. **Target Platform**: Windows 11 only for MVP — IMPLEMENTED
4. **Cross-platform**: MacOS/Linux deferred to post-MVP
5. **Bypassing SQLCipher KDF**: Raw hex key format `PRAGMA key = "x'hex'"` — IMPLEMENTED
6. **Alternative crates**: `rusqlcipher` is outdated (7+ years) — confirmed, not used
7. **Build requirements**: Rust + MSVC C++ compiler on Windows

**Research Document**: See `.cursor/archive/TASK-1.4_SQLCIPHER_RESEARCH.md` for historical details.

**Database Schema**: Migrations v1–v5 implemented in `src-tauri/src/migrations.rs` (see `DATA_MODEL.md` for details).
