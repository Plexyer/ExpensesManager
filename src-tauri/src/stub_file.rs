//! Temporary stub file format for MVP testing.
//!
//! ⚠️ MVP STUB ONLY — NOT FOR PRODUCTION ⚠️
//!
//! This module implements a simple JSON-based file format for testing
//! create/open/unlock flows before SQLCipher encryption is implemented.
//!
//! The stub file stores passwords in PLAINTEXT for testing purposes only.
//! This will be replaced by SQLCipher-encrypted SQLite in TASK-1.6.

use serde::{Deserialize, Serialize};
use std::fs;
use std::path::Path;

/// Current stub file format version
const STUB_VERSION: u32 = 1;

/// Format identifier for stub files
const STUB_FORMAT: &str = "financedb_stub";

/// Stub file data structure
#[derive(Debug, Serialize, Deserialize)]
pub struct StubFileData {
    /// Format identifier - always "financedb_stub"
    pub format: String,
    /// Schema version
    pub version: u32,
    /// ISO 8601 UTC timestamp when file was created
    pub created_at: String,
    /// Master password (PLAINTEXT - MVP only!)
    pub master_password: String,
    /// Optional password hint
    #[serde(skip_serializing_if = "Option::is_none")]
    pub password_hint: Option<String>,
    /// Optional metadata
    #[serde(skip_serializing_if = "Option::is_none")]
    pub metadata: Option<StubMetadata>,
}

/// Optional metadata for debugging/tracking
#[derive(Debug, Serialize, Deserialize)]
pub struct StubMetadata {
    /// App version that created this file
    #[serde(skip_serializing_if = "Option::is_none")]
    pub app_version: Option<String>,
    /// Platform that created this file
    #[serde(skip_serializing_if = "Option::is_none")]
    pub platform: Option<String>,
}

/// Result of reading a stub file (excluding password for security)
#[derive(Debug, Serialize, Deserialize)]
pub struct StubFileInfo {
    /// Format identifier
    pub format: String,
    /// Schema version
    pub version: u32,
    /// Creation timestamp
    pub created_at: String,
    /// Password hint (if available)
    pub password_hint: Option<String>,
}

/// Error types for stub file operations
#[derive(Debug)]
pub enum StubFileError {
    /// File could not be read
    ReadError(String),
    /// File could not be written
    WriteError(String),
    /// Invalid JSON format
    InvalidJson(String),
    /// Invalid or missing format field
    InvalidFormat(String),
    /// Unsupported version
    UnsupportedVersion(u32),
    /// Missing required field
    MissingField(String),
    /// Password verification failed
    WrongPassword,
}

impl std::fmt::Display for StubFileError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            StubFileError::ReadError(msg) => write!(f, "Unable to read file. {}", msg),
            StubFileError::WriteError(msg) => write!(f, "Unable to write file. {}", msg),
            StubFileError::InvalidJson(_) => write!(f, "Unable to read file. The file may be corrupted."),
            StubFileError::InvalidFormat(msg) => write!(f, "{}", msg),
            StubFileError::UnsupportedVersion(v) => write!(f, "This file was created by a newer version of the app (version {}).", v),
            StubFileError::MissingField(field) => write!(f, "File is corrupted: missing {} data.", field),
            StubFileError::WrongPassword => write!(f, "Incorrect password. Please try again."),
        }
    }
}

impl From<StubFileError> for String {
    fn from(err: StubFileError) -> String {
        err.to_string()
    }
}

/// Creates a new stub file at the specified path.
///
/// # Arguments
/// * `path` - Full path to the file to create
/// * `password` - Master password (stored in plaintext for MVP)
/// * `hint` - Optional password hint
///
/// # Returns
/// * `Ok(())` on success
/// * `Err(String)` with user-friendly error message on failure
#[tauri::command]
pub fn create_stub_file(
    path: String,
    password: String,
    hint: Option<String>,
) -> Result<(), String> {
    // Get current UTC timestamp in ISO 8601 format
    let created_at = chrono_lite_utc_now();
    
    // Build the stub file data
    let data = StubFileData {
        format: STUB_FORMAT.to_string(),
        version: STUB_VERSION,
        created_at,
        master_password: password,
        password_hint: hint.filter(|h| !h.is_empty()),
        metadata: Some(StubMetadata {
            app_version: Some(env!("CARGO_PKG_VERSION").to_string()),
            platform: Some(get_platform()),
        }),
    };
    
    // Serialize to JSON
    let json = serde_json::to_string_pretty(&data)
        .map_err(|e| StubFileError::WriteError(e.to_string()))?;
    
    // Write to file
    fs::write(&path, json)
        .map_err(|e| StubFileError::WriteError(e.to_string()))?;
    
    Ok(())
}

/// Reads stub file info (without exposing the password).
///
/// # Arguments
/// * `path` - Full path to the stub file
///
/// # Returns
/// * `Ok(StubFileInfo)` with file info (hint, version, etc.)
/// * `Err(String)` with user-friendly error message on failure
#[tauri::command]
pub fn read_stub_file_info(path: String) -> Result<StubFileInfo, String> {
    let data = read_stub_file_internal(&path)?;
    
    Ok(StubFileInfo {
        format: data.format,
        version: data.version,
        created_at: data.created_at,
        password_hint: data.password_hint,
    })
}

/// Verifies a password against a stub file.
///
/// # Arguments
/// * `path` - Full path to the stub file
/// * `password` - Password to verify
///
/// # Returns
/// * `Ok(StubFileInfo)` if password matches
/// * `Err(String)` with user-friendly error message if password wrong or file invalid
#[tauri::command]
pub fn verify_stub_password(path: String, password: String) -> Result<StubFileInfo, String> {
    let data = read_stub_file_internal(&path)?;
    
    // Compare passwords (plaintext comparison for stub)
    // Note: This is intentionally simple string comparison for MVP stub.
    // Real implementation will use SQLCipher which verifies via decryption.
    if data.master_password != password {
        return Err(StubFileError::WrongPassword.into());
    }
    
    Ok(StubFileInfo {
        format: data.format,
        version: data.version,
        created_at: data.created_at,
        password_hint: data.password_hint,
    })
}

/// Internal function to read and validate a stub file.
fn read_stub_file_internal(path: &str) -> Result<StubFileData, String> {
    // Check if file exists
    if !Path::new(path).exists() {
        return Err(StubFileError::ReadError("File does not exist.".to_string()).into());
    }
    
    // Read file contents
    let contents = fs::read_to_string(path)
        .map_err(|e| StubFileError::ReadError(e.to_string()))?;
    
    // Parse JSON
    let data: StubFileData = serde_json::from_str(&contents)
        .map_err(|e| StubFileError::InvalidJson(e.to_string()))?;
    
    // Validate format field
    if data.format != STUB_FORMAT {
        return Err(StubFileError::InvalidFormat(
            "This file is not a valid finance file.".to_string()
        ).into());
    }
    
    // Validate version
    if data.version > STUB_VERSION {
        return Err(StubFileError::UnsupportedVersion(data.version).into());
    }
    
    // Validate required fields
    if data.master_password.is_empty() {
        return Err(StubFileError::MissingField("password".to_string()).into());
    }
    
    Ok(data)
}

/// Gets the current platform as a string.
fn get_platform() -> String {
    #[cfg(target_os = "windows")]
    { "windows".to_string() }
    #[cfg(target_os = "macos")]
    { "macos".to_string() }
    #[cfg(target_os = "linux")]
    { "linux".to_string() }
    #[cfg(not(any(target_os = "windows", target_os = "macos", target_os = "linux")))]
    { "unknown".to_string() }
}

/// Simple UTC timestamp generator without external dependencies.
/// Returns ISO 8601 format: "2026-02-06T14:30:00Z"
fn chrono_lite_utc_now() -> String {
    use std::time::{SystemTime, UNIX_EPOCH};
    
    let now = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .expect("Time went backwards");
    
    let secs = now.as_secs();
    
    // Calculate date/time components from Unix timestamp
    // This is a simplified calculation that doesn't handle leap seconds
    // but is sufficient for our purposes
    let days_since_epoch = secs / 86400;
    let time_of_day = secs % 86400;
    
    let hours = time_of_day / 3600;
    let minutes = (time_of_day % 3600) / 60;
    let seconds = time_of_day % 60;
    
    // Calculate year, month, day from days since epoch (1970-01-01)
    let (year, month, day) = days_to_ymd(days_since_epoch);
    
    format!(
        "{:04}-{:02}-{:02}T{:02}:{:02}:{:02}Z",
        year, month, day, hours, minutes, seconds
    )
}

/// Convert days since Unix epoch to (year, month, day).
fn days_to_ymd(days: u64) -> (i32, u32, u32) {
    // Algorithm based on Howard Hinnant's date algorithms
    // http://howardhinnant.github.io/date_algorithms.html
    let z = days as i64 + 719468;
    let era = if z >= 0 { z } else { z - 146096 } / 146097;
    let doe = (z - era * 146097) as u32;
    let yoe = (doe - doe / 1460 + doe / 36524 - doe / 146096) / 365;
    let y = yoe as i64 + era * 400;
    let doy = doe - (365 * yoe + yoe / 4 - yoe / 100);
    let mp = (5 * doy + 2) / 153;
    let d = doy - (153 * mp + 2) / 5 + 1;
    let m = if mp < 10 { mp + 3 } else { mp - 9 };
    let year = if m <= 2 { y + 1 } else { y };
    
    (year as i32, m, d)
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;
    use std::path::PathBuf;
    
    fn temp_file_path(name: &str) -> PathBuf {
        std::env::temp_dir().join(format!("test_{}.financedb", name))
    }
    
    #[test]
    fn test_create_and_read_stub_file() {
        let path = temp_file_path("create_read");
        let path_str = path.to_string_lossy().to_string();
        
        // Create file
        create_stub_file(
            path_str.clone(),
            "test_password".to_string(),
            Some("test hint".to_string()),
        ).unwrap();
        
        // Read info
        let info = read_stub_file_info(path_str.clone()).unwrap();
        assert_eq!(info.format, "financedb_stub");
        assert_eq!(info.version, 1);
        assert_eq!(info.password_hint, Some("test hint".to_string()));
        
        // Cleanup
        fs::remove_file(&path).ok();
    }
    
    #[test]
    fn test_verify_correct_password() {
        let path = temp_file_path("verify_correct");
        let path_str = path.to_string_lossy().to_string();
        
        create_stub_file(
            path_str.clone(),
            "correct_password".to_string(),
            None,
        ).unwrap();
        
        let result = verify_stub_password(path_str.clone(), "correct_password".to_string());
        assert!(result.is_ok());
        
        fs::remove_file(&path).ok();
    }
    
    #[test]
    fn test_verify_wrong_password() {
        let path = temp_file_path("verify_wrong");
        let path_str = path.to_string_lossy().to_string();
        
        create_stub_file(
            path_str.clone(),
            "correct_password".to_string(),
            None,
        ).unwrap();
        
        let result = verify_stub_password(path_str.clone(), "wrong_password".to_string());
        assert!(result.is_err());
        assert!(result.unwrap_err().contains("Incorrect password"));
        
        fs::remove_file(&path).ok();
    }
    
    #[test]
    fn test_invalid_json_file() {
        let path = temp_file_path("invalid_json");
        let path_str = path.to_string_lossy().to_string();
        
        // Write invalid JSON
        fs::write(&path, "not valid json {{{").unwrap();
        
        let result = read_stub_file_info(path_str);
        assert!(result.is_err());
        assert!(result.unwrap_err().contains("corrupted"));
        
        fs::remove_file(&path).ok();
    }
    
    #[test]
    fn test_wrong_format() {
        let path = temp_file_path("wrong_format");
        let path_str = path.to_string_lossy().to_string();
        
        // Write file with wrong format
        let data = r#"{"format": "something_else", "version": 1, "created_at": "2026-01-01T00:00:00Z", "master_password": "test"}"#;
        fs::write(&path, data).unwrap();
        
        let result = read_stub_file_info(path_str);
        assert!(result.is_err());
        assert!(result.unwrap_err().contains("not a valid finance file"));
        
        fs::remove_file(&path).ok();
    }
}
