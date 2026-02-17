# TASK-1.4: SQLCipher Rust Integration Research

**Date**: 2026-02-06  
**Subagent**: sqlite_encryption_designer  
**Target Platform**: Windows 11 MVP  
**Status**: Research Complete

---

## CONFIRMED

### rusqlite SQLCipher Feature Flags
- ✅ **`bundled-sqlcipher`** feature exists in rusqlite 0.38.0 (latest)
  - Source: https://crates.io/crates/rusqlite
  - Bundles SQLCipher source code for compilation
  - Requires `bundled` feature (automatically enabled)
  - Links against system crypto library (OpenSSL/LibreSSL) by default
  - On Windows: Searches `OPENSSL_LIB_DIR`, `OPENSSL_INCLUDE_DIR`, `OPENSSL_DIR` env vars
  - If crypto library not found, build will fail

- ✅ **`bundled-sqlcipher-vendored-openssl`** feature exists
  - Source: https://crates.io/crates/rusqlite
  - Bundles SQLCipher WITH vendored OpenSSL (via `openssl-sys` crate)
  - Automatically enables `bundled-sqlcipher`
  - **RECOMMENDED for Windows** - eliminates OpenSSL dependency issues
  - Uses `openssl-sys` with `vendored` feature enabled
  - Compiles OpenSSL from source during build

- ✅ **`sqlcipher`** feature exists (non-bundled)
  - Requires system-installed SQLCipher library
  - Overrides `bundled` feature
  - Not recommended for Windows MVP (requires manual SQLCipher installation)

### Alternative: rusqlcipher Crate
- ✅ **`rusqlcipher` crate exists** (v0.14.9)
  - Source: https://crates.io/crates/rusqlcipher
  - **CRITICAL**: Last updated **over 7 years ago** (2019)
  - Depends on `libsqlcipher-sys` (separate crate)
  - **NOT RECOMMENDED** - outdated, likely incompatible with modern Rust/Tauri
  - rusqlite with `bundled-sqlcipher-vendored-openssl` is the modern approach

### SQLCipher Key Derivation
- ✅ **SQLCipher uses PBKDF2 by default** (not Argon2id)
  - SQLCipher 4.0.0+: PBKDF2-HMAC-SHA512 with 256,000 iterations
  - Earlier versions: PBKDF2-HMAC-SHA256 with 64,000 iterations
  - Source: SQLCipher CHANGELOG

- ✅ **Can bypass SQLCipher KDF with raw keys**
  - Use `PRAGMA key = "x'hexvalue'"` syntax
  - Provide 32-byte (256-bit) pre-derived key as hex BLOB
  - SQLCipher bypasses PBKDF2 and uses bytes directly
  - **This enables Argon2id key derivation** - derive key with Argon2id, then pass raw hex to SQLCipher
  - Source: https://www.zetetic.net/blog/2019/06/07/technical-guidance-using-random-values-as-sqlcipher-keys/

### Windows Compilation Requirements
- ✅ **Bundled features handle compilation automatically**
  - No manual SQLCipher compilation needed with `bundled-sqlcipher-vendored-openssl`
  - Build script uses `cc` crate to compile from source
  - Requires: Rust toolchain, C compiler (MSVC on Windows)
  - OpenSSL compiled from source (vendored)

- ⚠️ **Manual compilation is complex** (only if NOT using bundled)
  - Requires: Visual Studio 2022 C++ Tools, OpenSSL dev libraries, Tcl
  - Not needed for MVP if using `bundled-sqlcipher-vendored-openssl`

### App-Level Encryption Fallback
- ✅ **`aes-gcm` crate available** (v0.10.3)
  - Source: https://docs.rs/aes-gcm/
  - Security audited by NCC Group (no significant findings)
  - Constant-time implementation
  - Cross-platform (Windows, macOS, Linux, ARM)
  - Hardware acceleration available (AES-NI) via RUSTFLAGS
  - Apache-2.0/MIT licensed
  - Suitable for Tauri apps

---

## INFERRED

### rusqlite SQLCipher Integration
- **Inference**: `bundled-sqlcipher-vendored-openssl` is the best choice for Windows 11 MVP
  - Eliminates external dependencies
  - Handles OpenSSL compilation automatically
  - No system library conflicts
  - Larger binary size (acceptable trade-off)

- **Inference**: Key setting via `PRAGMA key` after opening connection
  - Standard SQLCipher pattern: `conn.execute("PRAGMA key = ?", [key_hex])?`
  - Works with rusqlite Connection API
  - Must be called before any database operations

### Performance Implications
- **Inference**: Bundled compilation will increase build time
  - SQLCipher + OpenSSL compilation adds 5-15 minutes to initial build
  - Subsequent builds cached (only rebuilds on dependency changes)
  - Acceptable for MVP development

- **Inference**: Binary size increase ~5-10 MB
  - SQLCipher + OpenSSL statically linked
  - Acceptable for desktop app (not mobile)

### Key Derivation Flow
- **Inference**: Recommended flow:
  1. User enters password
  2. Read salt + KDF params from file header
  3. Derive 32-byte key using Argon2id (via `argon2` crate)
  4. Convert key to hex string: `hex::encode(key)`
  5. Open SQLCipher connection
  6. Set key: `PRAGMA key = "x'<hex>"` (raw key mode, bypasses PBKDF2)
  7. Verify key works (try a query, catch error if wrong)

---

## RECOMMENDATIONS

### 1. Use rusqlite with bundled-sqlcipher-vendored-openssl (PRIMARY)
**Rationale**: 
- Simplest Windows 11 setup (no external dependencies)
- Actively maintained (rusqlite 0.38.0, updated regularly)
- Handles compilation automatically
- Compatible with Tauri 2

**Implementation**:
```toml
[dependencies]
rusqlite = { version = "0.38", features = ["bundled-sqlcipher-vendored-openssl"] }
argon2 = "0.5"
hex = "0.4"  # For key hex encoding
```

**Key Setting Pattern**:
```rust
use rusqlite::Connection;
use hex;

fn open_encrypted_db(path: &str, key: &[u8]) -> rusqlite::Result<Connection> {
    let conn = Connection::open(path)?;
    // Convert 32-byte key to hex and set as raw key (bypasses PBKDF2)
    let key_hex = hex::encode(key);
    conn.execute(&format!("PRAGMA key = \"x'{}'\"", key_hex), [])?;
    // Verify key works (will error if wrong)
    conn.execute("SELECT count(*) FROM sqlite_master", [])?;
    Ok(conn)
}
```

### 2. Implement Argon2id Key Derivation (REQUIRED)
**Rationale**:
- Matches ENCRYPTION_SPEC.md requirements
- More secure than SQLCipher's PBKDF2
- Bypass SQLCipher KDF using raw hex key format

**Implementation**:
```rust
use argon2::{Argon2, Algorithm, Version, Params};

fn derive_key(password: &str, salt: &[u8]) -> Result<Vec<u8>, argon2::Error> {
    let config = Argon2::new(
        Algorithm::Argon2id,
        Version::V0x13,
        Params::new(65536, 3, 4, 32)?,  // 64MB, 3 iter, 4 threads, 32 bytes
    );
    
    let mut key = vec![0u8; 32];
    config.hash_password_into(password.as_bytes(), salt, &mut key)?;
    Ok(key)
}
```

### 3. Fallback: App-Level Encryption (if SQLCipher fails)
**Rationale**:
- Backup plan if bundled compilation fails
- Full control over encryption
- Well-tested Rust crates available

**Implementation**:
```toml
[dependencies]
aes-gcm = "0.10"
argon2 = "0.5"
```

**Pattern**: Keep decrypted DB in memory, encrypt on save, decrypt on load

---

## RISKS

### Risk 1: Build Time Increase
**Severity**: Low  
**Impact**: Initial build takes 5-15 minutes longer  
**Mitigation**: 
- Only affects first build and dependency updates
- Subsequent builds are fast (cached)
- Document in README for developers

### Risk 2: Binary Size Increase
**Severity**: Low  
**Impact**: ~5-10 MB larger binary  
**Mitigation**:
- Acceptable for desktop app
- Can optimize later with UPX compression if needed
- Document expected size

### Risk 3: Compilation Failures on Some Systems
**Severity**: Medium  
**Impact**: Build fails if MSVC/C compiler not available  
**Mitigation**:
- Document requirements: Rust + MSVC C++ tools
- Provide clear error messages
- Fallback to app-level encryption if needed

### Risk 4: rusqlcipher Crate Outdated
**Severity**: High (if chosen)  
**Impact**: Incompatible with modern Rust/Tauri  
**Mitigation**:
- **DO NOT USE** rusqlcipher crate
- Use rusqlite with bundled-sqlcipher-vendored-openssl instead

### Risk 5: Key Derivation Mismatch
**Severity**: Medium  
**Impact**: If SQLCipher KDF used instead of Argon2id, security mismatch  
**Mitigation**:
- Always use raw hex key format (`x'hex'`) to bypass SQLCipher KDF
- Test that PBKDF2 is not used (verify with SQLCipher logs if available)
- Document key derivation flow clearly

---

## DEPENDENCIES NEEDED (Cargo.toml additions)

### Primary Approach (SQLCipher)
```toml
[dependencies]
rusqlite = { version = "0.38", features = ["bundled-sqlcipher-vendored-openssl"] }
argon2 = "0.5"           # Argon2id key derivation
hex = "0.4"              # Hex encoding for raw keys
rand = "0.8"             # Secure random for salt generation
```

### Fallback Approach (App-Level Encryption)
```toml
[dependencies]
rusqlite = { version = "0.38", features = ["bundled"] }  # Standard SQLite
aes-gcm = "0.10"         # AES-256-GCM encryption
argon2 = "0.5"           # Argon2id key derivation
hex = "0.4"              # Hex encoding
rand = "0.8"             # Secure random
```

### Notes
- **`bundled-sqlcipher-vendored-openssl`**: Automatically enables `bundled-sqlcipher` and `bundled`
- **`argon2`**: Latest stable version (0.5.x) supports Argon2id
- **`hex`**: Standard hex encoding crate
- **`rand`**: For cryptographically secure salt generation

---

## IMPLEMENTATION STEPS (Recommended Order)

### Step 1: Add Dependencies
1. Add rusqlite with `bundled-sqlcipher-vendored-openssl` to Cargo.toml
2. Add argon2, hex, rand crates
3. Run `cargo build` to verify compilation (will take 5-15 min first time)

### Step 2: Implement Key Derivation Module
1. Create `src/modules/security/kdf.rs`
2. Implement Argon2id derivation function
3. Add unit tests for key derivation

### Step 3: Implement File Header Module
1. Create `src/modules/database/file_header.rs`
2. Implement header read/write (magic, version, salt, KDF params)
3. Add unit tests

### Step 4: Integrate with Database Module
1. Modify `DbState` to handle encrypted connections
2. Implement `open_encrypted()` function
3. Implement key setting via `PRAGMA key = "x'hex'"`
4. Add error handling for wrong password

### Step 5: Testing
1. Test create encrypted file flow
2. Test unlock encrypted file flow
3. Test wrong password handling
4. Test file corruption handling
5. Performance test (KDF should be < 1 second)

---

## REFERENCES

### Documentation
- **rusqlite features**: https://crates.io/crates/rusqlite
- **rusqlcipher (outdated)**: https://crates.io/crates/rusqlcipher
- **SQLCipher raw keys**: https://www.zetetic.net/blog/2019/06/07/technical-guidance-using-random-values-as-sqlcipher-keys/
- **aes-gcm crate**: https://docs.rs/aes-gcm/
- **argon2 crate**: https://docs.rs/argon2/

### Related Files
- `.cursor/ENCRYPTION_SPEC.md` - Encryption specification
- `.cursor/skills/sqlite-sqlcipher/SKILL.md` - Implementation guide
- `src-tauri/Cargo.toml` - Current dependencies

---

## OPEN QUESTIONS (Resolved)

### Q1: Does rusqlite support SQLCipher?
**Answer**: ✅ YES - via `bundled-sqlcipher` or `bundled-sqlcipher-vendored-openssl` features

### Q2: What dependencies are needed on Windows 11?
**Answer**: ✅ Rust toolchain + MSVC C++ compiler (bundled features handle SQLCipher/OpenSSL compilation)

### Q3: Can we use Argon2id instead of SQLCipher's PBKDF2?
**Answer**: ✅ YES - use raw hex key format (`PRAGMA key = "x'hex'"`) to bypass SQLCipher KDF

### Q4: Is there a standalone sqlcipher crate?
**Answer**: ⚠️ YES but outdated (rusqlcipher, 7+ years old) - use rusqlite instead

### Q5: What's the fallback if SQLCipher fails?
**Answer**: ✅ App-level encryption with `aes-gcm` crate (well-maintained, secure)

---

## CONCLUSION

**Recommended Approach**: Use `rusqlite` with `bundled-sqlcipher-vendored-openssl` feature for Windows 11 MVP.

**Key Points**:
1. ✅ rusqlite supports SQLCipher via feature flags
2. ✅ Bundled features eliminate external dependencies
3. ✅ Argon2id can be used via raw hex key format
4. ✅ Well-tested fallback available (aes-gcm)
5. ✅ Compatible with Tauri 2

**Next Steps**: Proceed with implementation using `bundled-sqlcipher-vendored-openssl` approach.

---

**Status**: ✅ Research Complete - Ready for Implementation
