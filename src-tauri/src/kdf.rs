//! Key Derivation Function (KDF) module for password-based encryption.
//!
//! This module implements Argon2id key derivation for deriving encryption keys
//! from user passwords. The derived key is used with SQLCipher to encrypt
//! the database file.
//!
//! ## Security Notes
//! - Uses Argon2id (memory-hard, resistant to GPU/ASIC attacks)
//! - Parameters: 64 MB memory, 3 iterations, 4 threads
//! - Outputs 32-byte (256-bit) key for AES-256 encryption
//! - Salt must be 32 bytes from a cryptographically secure source

use argon2::{Algorithm, Argon2, Params, Version};
use rand::RngCore;

/// KDF Parameters (from ENCRYPTION_SPEC.md)
/// These are OWASP-recommended minimums for password hashing
const MEMORY_COST_KIB: u32 = 65536; // 64 MB in KiB
const TIME_COST: u32 = 3; // 3 iterations
const PARALLELISM: u32 = 4; // 4 threads
const OUTPUT_LENGTH: usize = 32; // 256 bits for AES-256
const SALT_LENGTH: usize = 32; // 256 bits

/// Error types for KDF operations
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum KdfError {
    /// Invalid KDF parameters (should never happen with hardcoded values)
    InvalidParams,
    /// Key derivation failed
    DerivationFailed,
    /// Salt has invalid length (not 32 bytes)
    InvalidSaltLength { expected: usize, actual: usize },
    /// Password is empty
    EmptyPassword,
}

impl std::fmt::Display for KdfError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            KdfError::InvalidParams => write!(f, "Internal error: invalid KDF parameters"),
            KdfError::DerivationFailed => write!(f, "Key derivation failed"),
            KdfError::InvalidSaltLength { expected, actual } => {
                write!(
                    f,
                    "Invalid salt length: expected {} bytes, got {}",
                    expected, actual
                )
            }
            KdfError::EmptyPassword => write!(f, "Password cannot be empty"),
        }
    }
}

impl std::error::Error for KdfError {}

/// Generates a cryptographically secure random salt.
///
/// Uses the operating system's CSPRNG (Windows CryptGenRandom).
///
/// # Returns
/// A 32-byte array containing random bytes suitable for use as a salt.
///
/// # Example
/// ```ignore
/// let salt = generate_salt();
/// assert_eq!(salt.len(), 32);
/// ```
pub fn generate_salt() -> [u8; SALT_LENGTH] {
    let mut salt = [0u8; SALT_LENGTH];
    rand::rngs::OsRng.fill_bytes(&mut salt);
    salt
}

/// Derives a 32-byte encryption key from a password and salt using Argon2id.
///
/// This function uses the Argon2id algorithm with parameters recommended by OWASP:
/// - Memory: 64 MB
/// - Iterations: 3
/// - Parallelism: 4 threads
/// - Output: 32 bytes (256 bits)
///
/// The derived key can be used directly with SQLCipher using the raw hex key format
/// (`PRAGMA key = "x'hex'"`) to bypass SQLCipher's internal PBKDF2.
///
/// # Arguments
/// * `password` - The user's password (must not be empty)
/// * `salt` - A 32-byte random salt (use `generate_salt()` to create)
///
/// # Returns
/// * `Ok([u8; 32])` - The derived 32-byte encryption key
/// * `Err(KdfError)` - If the password is empty or derivation fails
///
/// # Example
/// ```ignore
/// let salt = generate_salt();
/// let key = derive_key("my_password", &salt)?;
/// assert_eq!(key.len(), 32);
/// ```
///
/// # Performance
/// This function intentionally takes ~300-800ms to resist brute-force attacks.
pub fn derive_key(password: &str, salt: &[u8; SALT_LENGTH]) -> Result<[u8; OUTPUT_LENGTH], KdfError> {
    // Validate password is not empty
    if password.is_empty() {
        return Err(KdfError::EmptyPassword);
    }

    // Build Argon2id parameters
    let params = Params::new(
        MEMORY_COST_KIB,
        TIME_COST,
        PARALLELISM,
        Some(OUTPUT_LENGTH),
    )
    .map_err(|_| KdfError::InvalidParams)?;

    let argon2 = Argon2::new(Algorithm::Argon2id, Version::V0x13, params);

    // Derive the key
    let mut key = [0u8; OUTPUT_LENGTH];
    argon2
        .hash_password_into(password.as_bytes(), salt, &mut key)
        .map_err(|_| KdfError::DerivationFailed)?;

    Ok(key)
}

/// Converts a 32-byte key to a 64-character hex string.
///
/// The hex string can be used with SQLCipher's raw key format:
/// `PRAGMA key = "x'<hex_string>'"`
///
/// # Arguments
/// * `key` - A 32-byte encryption key from `derive_key()`
///
/// # Returns
/// A 64-character lowercase hex string representation of the key.
///
/// # Example
/// ```ignore
/// let key = [0u8; 32];
/// let hex = key_to_hex(&key);
/// assert_eq!(hex.len(), 64);
/// ```
pub fn key_to_hex(key: &[u8; OUTPUT_LENGTH]) -> String {
    hex::encode(key)
}

/// Returns the current KDF parameters as a tuple.
///
/// This can be used to store parameters in file headers for future
/// compatibility if parameters need to change.
///
/// # Returns
/// `(memory_cost_kib, time_cost, parallelism)` tuple
pub fn get_kdf_params() -> (u32, u32, u32) {
    (MEMORY_COST_KIB, TIME_COST, PARALLELISM)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_derive_key_produces_32_bytes() {
        let salt = generate_salt();
        let key = derive_key("test_password", &salt).unwrap();
        assert_eq!(key.len(), 32);
    }

    #[test]
    fn test_derive_key_deterministic() {
        // Same password + same salt = same key
        let salt = [0u8; 32]; // Fixed salt for testing
        let key1 = derive_key("same_password", &salt).unwrap();
        let key2 = derive_key("same_password", &salt).unwrap();
        assert_eq!(key1, key2);
    }

    #[test]
    fn test_derive_key_different_passwords_different_keys() {
        let salt = [0u8; 32];
        let key1 = derive_key("password1", &salt).unwrap();
        let key2 = derive_key("password2", &salt).unwrap();
        assert_ne!(key1, key2);
    }

    #[test]
    fn test_derive_key_different_salts_different_keys() {
        let salt1 = [0u8; 32];
        let salt2 = [1u8; 32];
        let key1 = derive_key("same_password", &salt1).unwrap();
        let key2 = derive_key("same_password", &salt2).unwrap();
        assert_ne!(key1, key2);
    }

    #[test]
    fn test_generate_salt_unique() {
        let salt1 = generate_salt();
        let salt2 = generate_salt();
        // Two random salts should be different (probability of collision is negligible)
        assert_ne!(salt1, salt2);
    }

    #[test]
    fn test_derive_key_empty_password_fails() {
        let salt = generate_salt();
        let result = derive_key("", &salt);
        assert!(matches!(result, Err(KdfError::EmptyPassword)));
    }

    #[test]
    fn test_key_to_hex_format() {
        let salt = [0u8; 32];
        let key = derive_key("test", &salt).unwrap();
        let hex_key = key_to_hex(&key);
        // 32 bytes = 64 hex characters
        assert_eq!(hex_key.len(), 64);
        // Should be lowercase hex
        assert!(hex_key.chars().all(|c| c.is_ascii_hexdigit()));
    }

    #[test]
    fn test_get_kdf_params() {
        let (memory, time, parallelism) = get_kdf_params();
        assert_eq!(memory, 65536); // 64 MB
        assert_eq!(time, 3);
        assert_eq!(parallelism, 4);
    }
}
