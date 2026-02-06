# Encryption Specification (CONFIRMED)

## Status: CONFIRMED

Key decisions from user answers:
- **Encryption**: Use rusqlite + SQLCipher (CONFIRMED)
- **Password Hashing**: Use Argon2id exclusively (CONFIRMED - no backward compatibility with SHA256)
- **Target Platform**: Windows 11 only for MVP (CONFIRMED - MacOS/Linux deferred to post-MVP)

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

#### Rust Integration
- Use `rusqlite` with SQLCipher feature flag (if available)
- Or use `sqlcipher` crate (if exists)
- Or compile SQLCipher from source and link statically

#### Key Derivation Function (KDF)
```rust
// Pseudocode
fn derive_key(password: &str, salt: &[u8]) -> Vec<u8> {
    // Argon2id parameters
    let config = Argon2::new(
        Algorithm::Argon2id,
        Version::V0x13,
        Params::new(
            65536,  // memory_cost (64 MB)
            3,      // time_cost (3 iterations)
            4,      // parallelism (4 threads)
            32,     // output_length (32 bytes = 256 bits)
        )?,
    );
    
    let mut key = [0u8; 32];
    config.hash_password_into(password.as_bytes(), salt, &mut key)?;
    key.to_vec()
}
```

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

### Implementation Steps (CONFIRMED)
1. **Use rusqlite with SQLCipher feature flag** - Target Windows 11 only for MVP
2. **Key Derivation**: Implement Argon2id KDF exclusively (use `argon2` crate)
3. **File Format**: Design header format (magic number, salt, KDF params)
4. **Integration**: Modify `DbState` to handle encrypted connections
5. **Testing**: Test encryption/decryption, wrong password handling

### Platform Support (CONFIRMED)
- **MVP**: Windows 11 only
- **Post-MVP**: MacOS and Linux support can be added later

### Fallback Plan
If SQLCipher integration encounters issues on Windows 11:
1. Use app-level encryption (AES-256-GCM)
2. Keep decrypted database in memory
3. Encrypt on save, decrypt on load
4. Document performance implications

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

1. **SQLCipher Rust bindings**: Use rusqlite with SQLCipher feature flag (CONFIRMED)
2. **Password Hashing**: Use Argon2id exclusively - no SHA256 backward compatibility (CONFIRMED)
3. **Target Platform**: Windows 11 only for MVP (CONFIRMED)
4. **Cross-platform**: MacOS/Linux support deferred to post-MVP (CONFIRMED)

**Status**: CONFIRMED - Ready for implementation
