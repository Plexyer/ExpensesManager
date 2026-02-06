# Encryption Specification (CONFIRMED)

## Status: CONFIRMED

Key decisions from user answers:
- **Encryption**: Use rusqlite + SQLCipher (CONFIRMED)
- **Password Hashing**: Use Argon2id exclusively (CONFIRMED - no backward compatibility with SHA256)
- **Target Platform**: Windows 11 only for MVP (CONFIRMED - MacOS/Linux deferred to post-MVP)

---

## ⚠️ Temporary Stub Format (MVP Testing)

Before SQLCipher is implemented, we use a **temporary plaintext JSON stub file** to enable testing of the create/open/unlock UI flows.

**See**: `.cursor/FINANCEDB_STUB_SPEC.md` for the stub file specification.

| Aspect | Stub (Current) | SQLCipher (Target) |
|--------|----------------|-------------------|
| Format | JSON text | SQLite binary |
| Password | Stored in plaintext | Not stored (implicit) |
| Encryption | None | AES-256 via SQLCipher |
| Purpose | UI testing | Production |

**When SQLCipher is ready**, the stub format will be replaced. Stub files contain no financial data, so no migration is needed.

---

## Overview

The MVP requires encrypted portable finance files. This document outlines the encryption strategy, threat model, and implementation approach.

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

## Encryption Strategy

### Option 1: SQLCipher (Preferred)

#### Overview
SQLCipher is an SQLite extension that provides transparent 256-bit AES encryption.

#### Advantages
- ✅ Transparent to application code (same SQL interface)
- ✅ Industry standard (used by Signal, WhatsApp, etc.)
- ✅ Good performance
- ✅ Well-maintained

#### Disadvantages
- ❌ Requires SQLCipher library integration
- ❌ May need custom Rust bindings
- ❌ Larger binary size

#### Implementation Approach
1. **Key Derivation**: Use Argon2id to derive encryption key from master password
2. **Key Storage**: Store salt + KDF params in file metadata (not in database)
3. **Database Encryption**: SQLCipher encrypts entire database file
4. **Key Management**: Keep encryption key in memory only, clear on app close

#### Rust Integration (CONFIRMED - from TASK-1.4 Research)

**Recommended Approach**: Use `rusqlite` with `bundled-sqlcipher-vendored-openssl` feature.

```toml
# Cargo.toml
[dependencies]
rusqlite = { version = "0.38", features = ["bundled-sqlcipher-vendored-openssl"] }
argon2 = "0.5"           # Argon2id key derivation
hex = "0.4"              # Hex encoding for raw keys
rand = "0.8"             # Secure random for salt generation
```

**Why this approach**:
- ✅ Bundles SQLCipher + OpenSSL from source (no external dependencies)
- ✅ Eliminates Windows OpenSSL installation issues
- ✅ Actively maintained (rusqlite 0.38.0)
- ✅ Compatible with Tauri 2
- ⚠️ First build takes +5-15 minutes (cached thereafter)
- ⚠️ Binary size increases ~5-10 MB (acceptable for desktop)

**Alternative crates NOT recommended**:
- `rusqlcipher` crate exists but is **outdated (7+ years)** - do not use
- Non-bundled `sqlcipher` feature requires manual SQLCipher installation

**Build Requirements (Windows 11)**:
- Rust toolchain (rustup)
- MSVC C++ compiler (Visual Studio Build Tools)

#### Key Derivation Function (KDF)

**Important**: SQLCipher uses PBKDF2 by default, but we bypass it using the raw hex key format to use Argon2id instead.

```rust
use argon2::{Argon2, Algorithm, Version, Params};

fn derive_key(password: &str, salt: &[u8]) -> Result<Vec<u8>, argon2::Error> {
    let params = Params::new(
        65536,  // memory_cost (64 MB)
        3,      // time_cost (3 iterations)
        4,      // parallelism (4 threads)
        Some(32), // output_length (32 bytes = 256 bits)
    )?;
    
    let argon2 = Argon2::new(Algorithm::Argon2id, Version::V0x13, params);
    
    let mut key = vec![0u8; 32];
    argon2.hash_password_into(password.as_bytes(), salt, &mut key)?;
    Ok(key)
}
```

#### SQLCipher Key Setting Pattern (CONFIRMED - from TASK-1.4 Research)

**Critical**: Use raw hex key format (`x'hex'`) to bypass SQLCipher's internal PBKDF2 and use our Argon2id-derived key directly.

```rust
use rusqlite::Connection;

fn open_encrypted_db(path: &str, derived_key: &[u8]) -> rusqlite::Result<Connection> {
    let conn = Connection::open(path)?;
    
    // Convert 32-byte key to hex and set as raw key (bypasses SQLCipher PBKDF2)
    let key_hex = hex::encode(derived_key);
    conn.execute(&format!("PRAGMA key = \"x'{}'\"", key_hex), [])?;
    
    // Verify key works (will error if wrong password)
    conn.execute("SELECT count(*) FROM sqlite_master", [])?;
    
    Ok(conn)
}
```

**Key Points**:
- The `x'...'` syntax tells SQLCipher to use the bytes directly as the encryption key
- No PBKDF2 is performed by SQLCipher when using this format
- Key must be exactly 32 bytes (256 bits) for AES-256
- The `SELECT count(*) FROM sqlite_master` query verifies decryption succeeded

#### File Structure
```
finance_file.encrypted
├── Header (plaintext metadata)
│   ├── Magic number (identifies file format)
│   ├── Version (file format version)
│   ├── Salt (32 bytes, random)
│   ├── KDF params (memory_cost, time_cost, parallelism)
│   └── Password hint (optional, encrypted or plaintext)
└── Database (encrypted SQLite via SQLCipher)
    └── All tables encrypted with AES-256
```

---

### Option 2: App-Level Encryption (Fallback)

#### Overview
Encrypt database file at application level before writing to disk.

#### Advantages
- ✅ No external dependencies
- ✅ Full control over encryption
- ✅ Works with standard SQLite

#### Disadvantages
- ❌ More complex implementation
- ❌ Performance overhead (encrypt/decrypt on every write/read)
- ❌ Need to handle partial writes

#### Implementation Approach
1. **Key Derivation**: Same as SQLCipher (Argon2id)
2. **Encryption**: Use AES-256-GCM for authenticated encryption
3. **File Format**: Encrypted blob containing SQLite database
4. **Caching**: Keep decrypted database in memory, encrypt on save

#### Rust Implementation
```rust
use aes_gcm::{
    aead::{Aead, KeyInit},
    Aes256Gcm, Nonce
};

fn encrypt_database(db_bytes: &[u8], key: &[u8]) -> Vec<u8> {
    let cipher = Aes256Gcm::new_from_slice(key).unwrap();
    let nonce = generate_nonce(); // 12 bytes for GCM
    let ciphertext = cipher.encrypt(&nonce, db_bytes).unwrap();
    // Prepend nonce to ciphertext
    [nonce.as_slice(), ciphertext.as_slice()].concat()
}

fn decrypt_database(encrypted: &[u8], key: &[u8]) -> Vec<u8> {
    let cipher = Aes256Gcm::new_from_slice(key).unwrap();
    let nonce = &encrypted[0..12];
    let ciphertext = &encrypted[12..];
    cipher.decrypt(nonce.into(), ciphertext).unwrap()
}
```

---

## Confirmed Approach: SQLCipher (CONFIRMED)

### Rationale
- Industry standard for encrypted SQLite
- Better performance (encryption at SQLite level)
- Less application code complexity
- Well-tested and secure

### Implementation Steps (CONFIRMED - from TASK-1.4 Research)

| Step | Task | Status |
|------|------|--------|
| 1 | Add dependencies to `src-tauri/Cargo.toml` | TASK-1.5 |
| 2 | Implement Argon2id key derivation | TASK-1.5 |
| 3 | Design file header format (magic, salt, KDF params) | TASK-1.6 |
| 4 | Integrate SQLCipher with `DbState` | TASK-1.6 |
| 5 | Test encryption/decryption, wrong password | TASK-1.6 |

**Cargo.toml Configuration (Ready to Apply)**:
```toml
[dependencies]
rusqlite = { version = "0.38", features = ["bundled-sqlcipher-vendored-openssl"] }
argon2 = "0.5"
hex = "0.4"
rand = "0.8"
```

**Implementation Order**:
1. **TASK-1.5**: Add dependencies, implement `derive_key()` function, add unit tests
2. **TASK-1.6**: Implement `open_encrypted_db()`, file header, replace stub format

### Platform Support (CONFIRMED)
- **MVP**: Windows 11 only
- **Post-MVP**: MacOS and Linux support can be added later

### Fallback Plan (CONFIRMED - from TASK-1.4 Research)

If SQLCipher integration encounters issues on Windows 11:

**Alternative Dependencies**:
```toml
[dependencies]
rusqlite = { version = "0.38", features = ["bundled"] }  # Standard SQLite (no SQLCipher)
aes-gcm = "0.10"         # AES-256-GCM encryption (security audited by NCC Group)
argon2 = "0.5"
hex = "0.4"
rand = "0.8"
```

**App-Level Encryption Pattern**:
1. Keep decrypted SQLite database in memory (or temp file)
2. On save: encrypt entire database with AES-256-GCM, write to disk
3. On load: read from disk, decrypt, load into memory
4. Delete temp files securely on app close

**Trade-offs**:
- ⚠️ Higher memory usage (entire DB in memory)
- ⚠️ More complex implementation
- ✅ Full control over encryption
- ✅ No external library compilation issues

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

## KDF Parameters (Recommended)

### Argon2id Parameters
- **Algorithm**: Argon2id (resistant to both GPU and side-channel attacks)
- **Memory Cost**: 65536 KB (64 MB) - adjust based on system capabilities
- **Time Cost**: 3 iterations - balance between security and performance
- **Parallelism**: 4 threads - adjust based on CPU cores
- **Output Length**: 32 bytes (256 bits for AES-256)

### Salt Generation
- **Length**: 32 bytes (256 bits)
- **Source**: Cryptographically secure random number generator (OS CSPRNG)
- **Storage**: Stored in file header (plaintext, OK to be public)

### KDF Params Storage
Store in file header (plaintext):
```rust
struct FileHeader {
    magic: [u8; 4],           // "EFM1" (ExpensesManager File v1)
    version: u8,               // File format version
    salt: [u8; 32],           // Random salt
    memory_cost: u32,         // Argon2id memory cost
    time_cost: u32,           // Argon2id time cost
    parallelism: u32,        // Argon2id parallelism
    password_hint: String,    // Optional hint (plaintext or encrypted)
}
```

---

## File Format Specification

### File Structure
```
[Header] (plaintext, fixed size ~100 bytes)
  - Magic number: "EFM1" (4 bytes)
  - Version: 1 (1 byte)
  - Salt: 32 bytes
  - KDF params: 12 bytes (memory_cost, time_cost, parallelism)
  - Password hint length: 1 byte (0-255)
  - Password hint: variable length (0-255 bytes)

[Database] (encrypted SQLite via SQLCipher)
  - Entire SQLite database encrypted with AES-256
  - Key derived from master password + salt + KDF params
```

### Magic Number
- **Value**: `"EFM1"` (ExpensesManager File v1)
- **Purpose**: Identify file format
- **Location**: First 4 bytes of file

### Version
- **Value**: `1` (for MVP)
- **Purpose**: File format versioning (for future migrations)
- **Location**: Byte 5

---

## Implementation Notes

### Password Strength
- **Minimum length**: 8 characters (recommended: 12+)
- **Strength indicator**: Show password strength (weak/medium/strong)
- **Recommendations**: Mix of uppercase, lowercase, numbers, symbols

### Password Hint
- **Optional**: User can provide hint
- **Storage**: Plaintext in file header (or encrypted with separate key)
- **Purpose**: Help user remember password (not for security)

### Error Handling
- **Wrong password**: Generic error, don't reveal if file is encrypted
- **Corrupted file**: Show error with recovery guidance
- **Locked file**: Show error if file is locked by another instance

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

## Migration from Unencrypted

### Strategy
1. **Option 1**: Create new encrypted file, export/import data
2. **Option 2**: In-place encryption (encrypt existing database file)
3. **Option 3**: One-time migration tool

### Recommended: Option 1
- User creates new encrypted file
- User sets master password
- System exports data from old file (if exists)
- System imports data into new encrypted file
- User deletes old unencrypted file

---

## OS Secure Storage / Keychain (CONFIRMED from LICENSING.md)

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

## Resolved Questions (CONFIRMED)

1. **SQLCipher Rust bindings**: Use `rusqlite` with `bundled-sqlcipher-vendored-openssl` feature (CONFIRMED - TASK-1.4)
2. **Password Hashing**: Use Argon2id exclusively - no SHA256 backward compatibility (CONFIRMED)
3. **Target Platform**: Windows 11 only for MVP (CONFIRMED)
4. **Cross-platform**: MacOS/Linux support deferred to post-MVP (CONFIRMED)
5. **Bypassing SQLCipher KDF**: Use `PRAGMA key = "x'hex'"` raw key format (CONFIRMED - TASK-1.4)
6. **Alternative crates**: `rusqlcipher` is outdated (7+ years) - do not use (CONFIRMED - TASK-1.4)
7. **Fallback approach**: `aes-gcm` crate for app-level encryption if needed (CONFIRMED - TASK-1.4)
8. **Build requirements**: Rust + MSVC C++ compiler on Windows (CONFIRMED - TASK-1.4)

**Research Document**: See `.cursor/TASK-1.4_SQLCIPHER_RESEARCH.md` for full details.

**Status**: CONFIRMED - Ready for implementation (TASK-1.5, TASK-1.6)
