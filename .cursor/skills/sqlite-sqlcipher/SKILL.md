# Skill: SQLite Encryption (SQLCipher) — Implemented

## Purpose
Reference guide for the **implemented** encrypted SQLite database system using SQLCipher with Argon2id key derivation and a custom file header format.

## When to Use
- Modifying or extending encryption behavior
- Troubleshooting encrypted file issues
- Understanding the key derivation and file format
- Adding password change / key rotation features

## Implementation Status: COMPLETE

Encryption is fully operational since Phase 1:
- **SQLCipher** via `rusqlite` 0.35 with `bundled-sqlcipher` feature
- **KDF**: Argon2id (64MB memory, 3 iterations, 4 threads, 32-byte output key)
- **File header**: Custom `EFM1` magic bytes + salt + KDF params
- **Key format**: Raw hex key (`PRAGMA key = "x'hex'"`) bypasses SQLCipher's internal PBKDF2

## Architecture

### Rust Module Layout (flat in `src-tauri/src/`)
| File | Responsibility |
|---|---|
| `kdf.rs` | Argon2id key derivation |
| `file_header.rs` | EFM1 header read/write (magic, salt, KDF params) |
| `encrypted_db.rs` | `create_encrypted_db`, `open_encrypted_db`, `close_db` + all 38 Tauri commands |
| `lib.rs` | `DbState` definition, command registration |

### Dependencies (`Cargo.toml`)
```toml
argon2 = "0.5"
rand = "0.8"
hex = "0.4"
rusqlite = { version = "0.35", features = ["bundled-sqlcipher"] }
```

### File Structure
```
[EFM1 Header: 4 magic + salt + KDF params] [SQLCipher encrypted SQLite DB]
```

### Key Derivation Flow
```
Master Password
    ↓
Argon2id(password, salt, 64MB, 3 iter, 4 threads)
    ↓
32-byte raw key
    ↓
hex encode → PRAGMA key = "x'<hex>'"
```

The raw hex key format bypasses SQLCipher's internal PBKDF2, giving full control
over key derivation parameters via Argon2id.

## Key Derivation (kdf.rs)

### Implementation
```rust
use argon2::{Argon2, Algorithm, Version, Params};

fn derive_key(password: &str, salt: &[u8]) -> Result<Vec<u8>, Error> {
    let params = Params::new(65536, 3, 4, Some(32))?; // 64MB, 3 iter, 4 threads, 32 bytes
    let argon2 = Argon2::new(Algorithm::Argon2id, Version::V0x13, params);

    let mut key = [0u8; 32];
    argon2.hash_password_into(password.as_bytes(), salt, &mut key)?;
    Ok(key.to_vec())
}
```

### Parameters
| Parameter | Value | Rationale |
|---|---|---|
| Memory cost | 65536 KB (64 MB) | Resistant to GPU attacks |
| Time cost | 3 iterations | Good security/performance balance |
| Parallelism | 4 threads | Matches typical desktop CPUs |
| Output length | 32 bytes (256 bits) | Matches AES-256 key size |

### Salt
- **Length**: 16 bytes
- **Source**: OS CSPRNG (`rand::thread_rng()`)
- **Storage**: File header (plaintext — OK to be public)

## File Header (file_header.rs)

### Structure
```rust
struct FileHeader {
    magic: [u8; 4],        // "EFM1"
    salt: [u8; 16],
    memory_cost: u32,
    time_cost: u32,
    parallelism: u32,
}
```

### Read/Write
- `write_header(path, &header)` — writes header before encrypted DB
- `read_header(path)` — reads header to extract salt and KDF params
- Magic bytes `EFM1` identify the file as an ExpensesManager finance file

## Database Lifecycle (encrypted_db.rs)

### Create New File
```
1. Generate random salt (16 bytes)
2. Derive key: Argon2id(password, salt) → 32-byte key
3. Write EFM1 header to file
4. Create SQLite DB at temp path
5. Set PRAGMA key = "x'<hex>'"
6. Run migrations (schema v5)
7. Write _meta table (created_at, format_version)
8. Copy encrypted DB after header
```

### Open Existing File
```
1. Read EFM1 header → extract salt + KDF params
2. Derive key: Argon2id(password, salt) → 32-byte key
3. Extract encrypted DB portion to temp file
4. Open with PRAGMA key = "x'<hex>'"
5. Verify schema version, run pending migrations
```

### Close / Save
- `save_db`: writes current DB state back to file (header + encrypted DB)
- `close_db`: saves, then drops the connection

## Security Considerations

### Threat Model
1. **Wrong password**: Generic error message, no information leakage
2. **Brute force**: Argon2id KDF (slow, memory-hard) makes attacks expensive
3. **Memory exposure**: Keys should be cleared on app close
4. **File corruption**: Header integrity check via magic bytes

### Best Practices
- Never log passwords or derived keys
- Clear keys from memory on close (improvement opportunity)
- Use secure random for salt generation
- KDF params stored in header (plaintext OK)
- Password strength checked on frontend via `zxcvbn` library

## Testing

### Existing Tests
- Rust inline `#[cfg(test)]` modules in `kdf.rs` and `file_header.rs`
- Test key derivation produces consistent results for same input
- Test header read/write roundtrip

### Manual Verification
1. Create encrypted finance file with password
2. Close and reopen with correct password — data intact
3. Attempt open with wrong password — error shown
4. Verify file is not readable by standard SQLite tools without key

## References
- **`src-tauri/src/kdf.rs`**: Argon2id key derivation implementation
- **`src-tauri/src/file_header.rs`**: EFM1 header format implementation
- **`src-tauri/src/encrypted_db.rs`**: Database lifecycle and all Tauri commands
- **`.cursor/ENCRYPTION_SPEC.md`**: Detailed encryption specification
- **SQLCipher**: https://www.zetetic.net/sqlcipher/
- **Argon2**: https://github.com/P-H-C/phc-winner-argon2
- **Rust Argon2 crate**: https://docs.rs/argon2/

## Output
Use this guide when modifying encryption, adding password change, or troubleshooting file access issues.
