//! File header module for encrypted finance files.
//!
//! The file format consists of a plaintext header followed by an encrypted SQLCipher database.
//! The header contains metadata needed to derive the encryption key (salt, KDF params)
//! before the database can be decrypted.
//!
//! ## File Structure
//! ```text
//! [Header - plaintext]
//!   Magic: "EFM1" (4 bytes)
//!   Version: 1 (1 byte)
//!   Salt: 32 bytes (random, for KDF)
//!   KDF Params: 12 bytes (memory_cost, time_cost, parallelism as u32 LE)
//!   Hint Length: 1 byte (0-255)
//!   Hint: variable (0-255 bytes, UTF-8)
//! [SQLCipher Database - encrypted]
//!   Starts at offset = header size
//! ```

use std::fs::File;
use std::io::{Read, Seek, SeekFrom, Write};
use thiserror::Error;

/// Magic bytes identifying our file format
pub const MAGIC: &[u8; 4] = b"EFM1";

/// Current file format version
pub const VERSION: u8 = 1;

/// Maximum hint length in bytes
pub const MAX_HINT_LENGTH: usize = 255;

/// Fixed portion of header (before variable-length hint)
/// Magic (4) + Version (1) + Salt (32) + KDF params (12) + Hint length (1) = 50 bytes
const FIXED_HEADER_SIZE: usize = 4 + 1 + 32 + 12 + 1;

/// Errors that can occur when reading/writing file headers
#[derive(Debug, Error)]
pub enum FileHeaderError {
    #[error("Unable to read file: {0}")]
    IoError(#[from] std::io::Error),

    #[error("This file is not a valid finance database.")]
    InvalidMagic,

    #[error("This file was created by a newer version of the app (version {0}).")]
    UnsupportedVersion(u8),

    #[error("File is corrupted: password hint data is invalid.")]
    InvalidHintEncoding,

    #[error("Password hint is too long (max {MAX_HINT_LENGTH} characters).")]
    HintTooLong,
}

/// File header containing metadata for encrypted database files.
#[derive(Debug, Clone)]
pub struct FileHeader {
    /// File format version
    pub version: u8,
    /// Random salt for key derivation (32 bytes)
    pub salt: [u8; 32],
    /// Argon2id memory cost in KiB
    pub memory_cost: u32,
    /// Argon2id time cost (iterations)
    pub time_cost: u32,
    /// Argon2id parallelism (threads)
    pub parallelism: u32,
    /// Optional password hint
    pub password_hint: Option<String>,
}

impl FileHeader {
    /// Creates a new file header with the given parameters.
    ///
    /// # Arguments
    /// * `salt` - 32-byte random salt from `kdf::generate_salt()`
    /// * `memory_cost` - Argon2id memory cost in KiB
    /// * `time_cost` - Argon2id time cost (iterations)
    /// * `parallelism` - Argon2id parallelism (threads)
    /// * `password_hint` - Optional password hint (max 255 bytes UTF-8)
    pub fn new(
        salt: [u8; 32],
        memory_cost: u32,
        time_cost: u32,
        parallelism: u32,
        password_hint: Option<String>,
    ) -> Result<Self, FileHeaderError> {
        // Validate hint length
        if let Some(ref hint) = password_hint {
            if hint.len() > MAX_HINT_LENGTH {
                return Err(FileHeaderError::HintTooLong);
            }
        }

        Ok(Self {
            version: VERSION,
            salt,
            memory_cost,
            time_cost,
            parallelism,
            password_hint,
        })
    }

    /// Returns the total size of the header in bytes.
    pub fn size(&self) -> usize {
        FIXED_HEADER_SIZE + self.password_hint.as_ref().map_or(0, |h| h.len())
    }

    /// Writes the header to a file and returns the offset where the database should start.
    ///
    /// # Arguments
    /// * `file` - File to write to (will be seeked to start)
    ///
    /// # Returns
    /// The byte offset where the SQLCipher database should begin.
    pub fn write_to(&self, file: &mut File) -> Result<u64, FileHeaderError> {
        file.seek(SeekFrom::Start(0))?;

        // Magic bytes
        file.write_all(MAGIC)?;

        // Version
        file.write_all(&[self.version])?;

        // Salt (32 bytes)
        file.write_all(&self.salt)?;

        // KDF params (little-endian u32s)
        file.write_all(&self.memory_cost.to_le_bytes())?;
        file.write_all(&self.time_cost.to_le_bytes())?;
        file.write_all(&self.parallelism.to_le_bytes())?;

        // Hint (length byte + UTF-8 content)
        let hint_bytes = self
            .password_hint
            .as_ref()
            .map(|h| h.as_bytes())
            .unwrap_or(&[]);
        file.write_all(&[hint_bytes.len() as u8])?;
        if !hint_bytes.is_empty() {
            file.write_all(hint_bytes)?;
        }

        Ok(self.size() as u64)
    }

    /// Reads a header from a file.
    ///
    /// # Arguments
    /// * `file` - File to read from (will be seeked to start)
    pub fn read_from(file: &mut File) -> Result<Self, FileHeaderError> {
        file.seek(SeekFrom::Start(0))?;

        // Read and verify magic
        let mut magic = [0u8; 4];
        file.read_exact(&mut magic)?;
        if &magic != MAGIC {
            return Err(FileHeaderError::InvalidMagic);
        }

        // Read version
        let mut version_buf = [0u8; 1];
        file.read_exact(&mut version_buf)?;
        let version = version_buf[0];

        if version > VERSION {
            return Err(FileHeaderError::UnsupportedVersion(version));
        }

        // Read salt
        let mut salt = [0u8; 32];
        file.read_exact(&mut salt)?;

        // Read KDF params
        let mut param_buf = [0u8; 4];

        file.read_exact(&mut param_buf)?;
        let memory_cost = u32::from_le_bytes(param_buf);

        file.read_exact(&mut param_buf)?;
        let time_cost = u32::from_le_bytes(param_buf);

        file.read_exact(&mut param_buf)?;
        let parallelism = u32::from_le_bytes(param_buf);

        // Read hint
        let mut hint_len_buf = [0u8; 1];
        file.read_exact(&mut hint_len_buf)?;
        let hint_len = hint_len_buf[0] as usize;

        let password_hint = if hint_len > 0 {
            let mut hint_bytes = vec![0u8; hint_len];
            file.read_exact(&mut hint_bytes)?;
            Some(
                String::from_utf8(hint_bytes)
                    .map_err(|_| FileHeaderError::InvalidHintEncoding)?,
            )
        } else {
            None
        };

        Ok(Self {
            version,
            salt,
            memory_cost,
            time_cost,
            parallelism,
            password_hint,
        })
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::NamedTempFile;

    #[test]
    fn test_header_roundtrip() {
        let salt = [42u8; 32];
        let header = FileHeader::new(salt, 65536, 3, 4, Some("test hint".to_string())).unwrap();

        let temp_file = NamedTempFile::new().unwrap();
        let mut file = temp_file.reopen().unwrap();

        // Write header
        let size = header.write_to(&mut file).unwrap();
        assert_eq!(size, header.size() as u64);

        // Read header back
        let mut file = temp_file.reopen().unwrap();
        let read_header = FileHeader::read_from(&mut file).unwrap();

        assert_eq!(read_header.version, VERSION);
        assert_eq!(read_header.salt, salt);
        assert_eq!(read_header.memory_cost, 65536);
        assert_eq!(read_header.time_cost, 3);
        assert_eq!(read_header.parallelism, 4);
        assert_eq!(read_header.password_hint, Some("test hint".to_string()));
    }

    #[test]
    fn test_header_no_hint() {
        let salt = [0u8; 32];
        let header = FileHeader::new(salt, 65536, 3, 4, None).unwrap();

        let temp_file = NamedTempFile::new().unwrap();
        let mut file = temp_file.reopen().unwrap();

        header.write_to(&mut file).unwrap();

        let mut file = temp_file.reopen().unwrap();
        let read_header = FileHeader::read_from(&mut file).unwrap();

        assert_eq!(read_header.password_hint, None);
    }

    #[test]
    fn test_invalid_magic() {
        let temp_file = NamedTempFile::new().unwrap();
        {
            let mut file = temp_file.reopen().unwrap();
            file.write_all(b"XXXX").unwrap(); // Wrong magic
        }

        let mut file = temp_file.reopen().unwrap();
        let result = FileHeader::read_from(&mut file);

        assert!(matches!(result, Err(FileHeaderError::InvalidMagic)));
    }

    #[test]
    fn test_unsupported_version() {
        let temp_file = NamedTempFile::new().unwrap();
        {
            let mut file = temp_file.reopen().unwrap();
            file.write_all(MAGIC).unwrap();
            file.write_all(&[99u8]).unwrap(); // Future version
        }

        let mut file = temp_file.reopen().unwrap();
        let result = FileHeader::read_from(&mut file);

        assert!(matches!(result, Err(FileHeaderError::UnsupportedVersion(99))));
    }

    #[test]
    fn test_hint_too_long() {
        let salt = [0u8; 32];
        let long_hint = "x".repeat(256);
        let result = FileHeader::new(salt, 65536, 3, 4, Some(long_hint));

        assert!(matches!(result, Err(FileHeaderError::HintTooLong)));
    }

    #[test]
    fn test_header_size() {
        let salt = [0u8; 32];

        // No hint: 4 + 1 + 32 + 12 + 1 = 50
        let header_no_hint = FileHeader::new(salt, 65536, 3, 4, None).unwrap();
        assert_eq!(header_no_hint.size(), 50);

        // With 10-byte hint: 50 + 10 = 60
        let header_with_hint =
            FileHeader::new(salt, 65536, 3, 4, Some("0123456789".to_string())).unwrap();
        assert_eq!(header_with_hint.size(), 60);
    }
}
