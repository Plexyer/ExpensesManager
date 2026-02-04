# Skill: SQLite Encryption Design (SQLCipher)

## Purpose
How to approach encrypted SQLite database design using SQLCipher or app-level encryption.

## When to Use
- Implementing encryption for finance files
- Researching encryption options
- Designing file format with encryption

## Research Phase

### Step 1: Check Rust SQLCipher Support
1. Check if `rusqlite` supports SQLCipher feature flag
   ```toml
   rusqlite = { version = "0.31", features = ["sqlcipher"] }
   ```
2. Research `sqlcipher` crate (if separate)
3. Research compiling SQLCipher from source
4. Document findings

### Step 2: Evaluate Alternatives
1. **SQLCipher**: Industry standard, transparent encryption
2. **App-level encryption**: AES-256-GCM, more control, more complex
3. **Hybrid**: Encrypt file at filesystem level

### Step 3: Choose Approach
- **Preferred**: SQLCipher (if feasible)
- **Fallback**: App-level encryption (AES-256-GCM)

## Design Phase

### Key Derivation Function (KDF)
- **Algorithm**: Argon2id (resistant to GPU and side-channel attacks)
- **Parameters**:
  - Memory cost: 65536 KB (64 MB)
  - Time cost: 3 iterations
  - Parallelism: 4 threads
  - Output length: 32 bytes (256 bits)

### Salt Generation
- **Length**: 32 bytes (256 bits)
- **Source**: OS CSPRNG (cryptographically secure)
- **Storage**: File header (plaintext, OK to be public)

### File Format Design
```
[Header] (plaintext, ~100 bytes)
  - Magic number: "EFM1" (4 bytes)
  - Version: 1 (1 byte)
  - Salt: 32 bytes
  - KDF params: 12 bytes
  - Password hint: variable length

[Database] (encrypted SQLite via SQLCipher)
  - Entire database encrypted with AES-256
  - Key derived from password + salt + KDF params
```

## Implementation Phase

### Step 1: Add Dependencies
```toml
# Cargo.toml
[dependencies]
rusqlite = { version = "0.31", features = ["bundled-sqlcipher"] }
# OR
sqlcipher = "0.1"  # If separate crate
argon2 = "0.5"
```

### Step 2: Implement Key Derivation
```rust
use argon2::{Argon2, Algorithm, Version, Params};

fn derive_key(password: &str, salt: &[u8]) -> Result<Vec<u8>, Error> {
    let config = Argon2::new(
        Algorithm::Argon2id,
        Version::V0x13,
        Params::new(65536, 3, 4, 32)?,
    );
    
    let mut key = [0u8; 32];
    config.hash_password_into(password.as_bytes(), salt, &mut key)?;
    Ok(key.to_vec())
}
```

### Step 3: Implement File Header
```rust
struct FileHeader {
    magic: [u8; 4],        // "EFM1"
    version: u8,           // 1
    salt: [u8; 32],
    memory_cost: u32,
    time_cost: u32,
    parallelism: u32,
    password_hint: String,
}
```

### Step 4: Integrate with Database
- Modify `DbState` to handle encrypted connections
- Set SQLCipher key after opening connection
- Handle wrong password errors

## Testing Phase

### Unit Tests
- Key derivation (Argon2id)
- File header read/write
- Encryption/decryption

### Integration Tests
- Create encrypted file
- Unlock encrypted file
- Wrong password handling
- File corruption handling

### Performance Tests
- Encryption/decryption speed
- KDF performance (< 1 second)
- Large database encryption

## Fallback: App-Level Encryption

If SQLCipher not feasible:

### Implementation
```rust
use aes_gcm::{Aes256Gcm, KeyInit, Aead, Nonce};

fn encrypt_database(db_bytes: &[u8], key: &[u8]) -> Vec<u8> {
    let cipher = Aes256Gcm::new_from_slice(key).unwrap();
    let nonce = generate_nonce();
    let ciphertext = cipher.encrypt(&nonce, db_bytes).unwrap();
    [nonce.as_slice(), ciphertext.as_slice()].concat()
}
```

### Trade-offs
- ✅ No external dependencies
- ✅ Full control
- ❌ More complex (encrypt/decrypt on every write/read)
- ❌ Performance overhead
- ❌ Need to handle partial writes

## Security Considerations

### Threat Model
1. **Wrong password**: Rate limiting, generic errors
2. **Brute force**: Argon2id KDF (slow, memory-hard)
3. **Memory exposure**: Clear keys on app close
4. **File corruption**: Integrity checks, backup guidance

### Best Practices
- Never log passwords
- Clear keys from memory
- Use secure random for salt
- Store KDF params in header (plaintext OK)

## References
- **SQLCipher**: https://www.zetetic.net/sqlcipher/
- **Argon2**: https://github.com/P-H-C/phc-winner-argon2
- **Rust Argon2**: https://docs.rs/argon2/
- **ENCRYPTION_SPEC.md**: Detailed encryption specification

## Output
Document findings and implementation plan in ENCRYPTION_SPEC.md.
