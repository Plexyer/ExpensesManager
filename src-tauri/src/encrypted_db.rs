//! Encrypted database module for SQLCipher-encrypted finance files.
//!
//! This module provides Tauri commands for creating, opening, and managing
//! encrypted SQLite databases using SQLCipher.
//!
//! ## File Format
//! Files consist of a plaintext header (containing salt and KDF params)
//! followed by an encrypted SQLCipher database.
//!
//! ## Security Notes
//! - Uses Argon2id for key derivation (bypasses SQLCipher's PBKDF2)
//! - Raw hex key format used with SQLCipher: `PRAGMA key = "x'hex'"`
//! - Password is never stored; only the salt is stored in the header

use crate::file_header::{FileHeader, FileHeaderError};
use crate::kdf::{self, KdfError};
use crate::migrations::{self, MigrationError};
use rusqlite::Connection;
use serde::{Deserialize, Serialize};
use std::fs::{self, File};
use std::io::{Read, Seek, SeekFrom, Write};
use std::path::Path;
use std::sync::Mutex;
use tauri::State;
use thiserror::Error;

/// Global database state - wraps optional connection in Mutex for thread safety.
pub struct DbState {
    pub conn: Mutex<Option<Connection>>,
}

impl DbState {
    pub fn new() -> Self {
        DbState {
            conn: Mutex::new(None),
        }
    }
}

impl Default for DbState {
    fn default() -> Self {
        Self::new()
    }
}

/// Information about a database file (safe to return, excludes sensitive data).
#[derive(Debug, Serialize, Deserialize)]
pub struct DbFileInfo {
    /// File format identifier
    pub format: String,
    /// File format version
    pub version: u8,
    /// Password hint (if available)
    pub password_hint: Option<String>,
}

/// Result of creating a new database.
#[derive(Debug, Serialize, Deserialize)]
pub struct CreateDbResult {
    /// Path to the created file
    pub path: String,
}

/// Errors that can occur during encrypted database operations.
#[derive(Debug, Error)]
pub enum EncryptedDbError {
    #[error("Unable to read file: {0}")]
    FileReadError(String),

    #[error("Unable to write file: {0}")]
    FileWriteError(String),

    #[error("File not found: {0}")]
    FileNotFound(String),

    #[error("{0}")]
    HeaderError(#[from] FileHeaderError),

    #[error("Password processing failed: {0}")]
    KdfError(#[from] KdfError),

    #[error("Incorrect password. Please try again.")]
    WrongPassword,

    #[error("Database operation failed: {0}")]
    DatabaseError(String),

    #[error("A database is already open.")]
    AlreadyOpen,

    #[error("No database is currently open.")]
    NotOpen,

    #[error("Failed to acquire database lock.")]
    LockError,

    #[error("Unable to create temporary file: {0}")]
    TempFileError(String),

    #[error("Schema migration failed: {0}")]
    MigrationError(String),
}

impl From<EncryptedDbError> for String {
    fn from(err: EncryptedDbError) -> String {
        err.to_string()
    }
}

impl From<rusqlite::Error> for EncryptedDbError {
    fn from(err: rusqlite::Error) -> Self {
        // SQLCipher returns "file is not a database" for wrong password
        let msg = err.to_string();
        if msg.contains("file is not a database") || msg.contains("not a database") {
            EncryptedDbError::WrongPassword
        } else {
            EncryptedDbError::DatabaseError(msg)
        }
    }
}

impl From<MigrationError> for EncryptedDbError {
    fn from(err: MigrationError) -> Self {
        EncryptedDbError::MigrationError(err.to_string())
    }
}

/// Creates an encrypted SQLCipher database with the given key.
///
/// This is an internal function that creates the actual SQLite database.
/// After creating the basic _meta table, it applies the initial schema migrations.
fn create_sqlcipher_db(path: &Path, key_hex: &str) -> Result<Connection, EncryptedDbError> {
    let conn = Connection::open(path)?;

    // Set the encryption key using raw hex format (bypasses SQLCipher PBKDF2)
    conn.execute_batch(&format!("PRAGMA key = \"x'{}'\"", key_hex))?;

    // Initialize basic _meta table
    conn.execute_batch(
        "
        CREATE TABLE IF NOT EXISTS _meta (
            key TEXT PRIMARY KEY,
            value TEXT NOT NULL
        );
        INSERT OR REPLACE INTO _meta (key, value) VALUES ('created_at', datetime('now'));
        INSERT OR REPLACE INTO _meta (key, value) VALUES ('format_version', '1');
        ",
    )?;

    // Apply initial schema (all MVP tables)
    migrations::apply_initial_schema(&conn)?;

    Ok(conn)
}

/// Opens an existing SQLCipher database with the given key.
///
/// This is an internal function that opens and verifies the database.
fn open_sqlcipher_db(path: &Path, key_hex: &str) -> Result<Connection, EncryptedDbError> {
    let conn = Connection::open(path)?;

    // Set the encryption key using raw hex format
    conn.execute_batch(&format!("PRAGMA key = \"x'{}'\"", key_hex))?;

    // Verify the key is correct by attempting a query
    // This will fail with "file is not a database" if the key is wrong
    conn.execute_batch("SELECT count(*) FROM sqlite_master")?;

    Ok(conn)
}

/// Creates a new encrypted database file.
///
/// # Arguments
/// * `path` - Full path to the file to create
/// * `password` - Master password for encryption
/// * `hint` - Optional password hint
/// * `db_state` - Global database state
///
/// # Returns
/// Information about the created file.
#[tauri::command]
pub fn create_encrypted_db(
    path: String,
    password: String,
    hint: Option<String>,
    db_state: State<DbState>,
) -> Result<CreateDbResult, String> {
    create_encrypted_db_internal(&path, &password, hint, &db_state).map_err(|e| e.to_string())
}

fn create_encrypted_db_internal(
    path: &str,
    password: &str,
    hint: Option<String>,
    db_state: &State<DbState>,
) -> Result<CreateDbResult, EncryptedDbError> {
    // Check if a database is already open
    {
        let conn_guard = db_state
            .conn
            .lock()
            .map_err(|_| EncryptedDbError::LockError)?;
        if conn_guard.is_some() {
            return Err(EncryptedDbError::AlreadyOpen);
        }
    }

    // Generate salt and derive key
    let salt = kdf::generate_salt();
    let (memory_cost, time_cost, parallelism) = kdf::get_kdf_params();
    let key = kdf::derive_key(password, &salt)?;
    let key_hex = kdf::key_to_hex(&key);

    // Create file header
    let header = FileHeader::new(salt, memory_cost, time_cost, parallelism, hint)?;

    // Create a temporary SQLCipher database
    let temp_dir = tempfile::tempdir()
        .map_err(|e| EncryptedDbError::TempFileError(e.to_string()))?;
    let temp_db_path = temp_dir.path().join("temp.db");

    // Create encrypted database in temp location
    let temp_conn = create_sqlcipher_db(&temp_db_path, &key_hex)?;
    drop(temp_conn); // Close connection before reading file

    // Read the encrypted database bytes
    let db_bytes = fs::read(&temp_db_path)
        .map_err(|e| EncryptedDbError::FileReadError(e.to_string()))?;

    // Write final file: header + encrypted database
    // Use a scope to ensure the file is closed before we try to reopen it
    {
        let mut output_file = File::create(path)
            .map_err(|e| EncryptedDbError::FileWriteError(e.to_string()))?;
        header.write_to(&mut output_file)?;
        output_file
            .write_all(&db_bytes)
            .map_err(|e| EncryptedDbError::FileWriteError(e.to_string()))?;
        output_file
            .sync_all()
            .map_err(|e| EncryptedDbError::FileWriteError(e.to_string()))?;
    } // output_file is dropped here, releasing the file lock

    // Now open the file we just created
    open_and_store_connection(path, &key_hex, db_state)?;

    Ok(CreateDbResult {
        path: path.to_string(),
    })
}

/// Opens and unlocks an existing encrypted database.
///
/// # Arguments
/// * `path` - Full path to the file to open
/// * `password` - Master password for decryption
/// * `db_state` - Global database state
///
/// # Returns
/// Information about the opened file.
#[tauri::command]
pub fn open_encrypted_db(
    path: String,
    password: String,
    db_state: State<DbState>,
) -> Result<DbFileInfo, String> {
    open_encrypted_db_internal(&path, &password, &db_state).map_err(|e| e.to_string())
}

fn open_encrypted_db_internal(
    path: &str,
    password: &str,
    db_state: &State<DbState>,
) -> Result<DbFileInfo, EncryptedDbError> {
    // Check if a database is already open
    {
        let conn_guard = db_state
            .conn
            .lock()
            .map_err(|_| EncryptedDbError::LockError)?;
        if conn_guard.is_some() {
            return Err(EncryptedDbError::AlreadyOpen);
        }
    }

    // Check file exists
    if !Path::new(path).exists() {
        return Err(EncryptedDbError::FileNotFound(path.to_string()));
    }

    // Read header to get salt and KDF params
    // Scope the file handle so it's dropped before we call open_and_store_connection
    let (header, key_hex) = {
        let mut file = File::open(path)
            .map_err(|e| EncryptedDbError::FileReadError(e.to_string()))?;
        let header = FileHeader::read_from(&mut file)?;

        // Derive key using stored salt
        let key = kdf::derive_key(password, &header.salt)?;
        let key_hex = kdf::key_to_hex(&key);
        
        (header, key_hex)
    }; // File handle is dropped here before we open again

    // Extract database portion to temp file and open it
    open_and_store_connection(path, &key_hex, db_state)?;

    Ok(DbFileInfo {
        format: "financedb".to_string(),
        version: header.version,
        password_hint: header.password_hint,
    })
}

/// Helper function to extract database from file and store connection in state.
fn open_and_store_connection(
    path: &str,
    key_hex: &str,
    db_state: &State<DbState>,
) -> Result<(), EncryptedDbError> {
    // Read the entire file
    let mut file = File::open(path)
        .map_err(|e| EncryptedDbError::FileReadError(e.to_string()))?;
    
    // Read header to get its size
    let header = FileHeader::read_from(&mut file)?;
    let header_size = header.size();

    // Seek to start of database portion
    file.seek(SeekFrom::Start(header_size as u64))
        .map_err(|e| EncryptedDbError::FileReadError(e.to_string()))?;

    // Read database bytes
    let mut db_bytes = Vec::new();
    file.read_to_end(&mut db_bytes)
        .map_err(|e| EncryptedDbError::FileReadError(e.to_string()))?;

    // Write to temp file
    let temp_dir = tempfile::tempdir()
        .map_err(|e| EncryptedDbError::TempFileError(e.to_string()))?;
    let temp_db_path = temp_dir.path().join("opened.db");
    fs::write(&temp_db_path, &db_bytes)
        .map_err(|e| EncryptedDbError::FileWriteError(e.to_string()))?;

    // Open the SQLCipher database
    let conn = open_sqlcipher_db(&temp_db_path, key_hex)?;

    // Run any pending migrations to ensure schema is up to date
    // This handles the case of opening a file created by an older app version
    migrations::run_pending(&conn)?;

    // Store connection in state
    let mut conn_guard = db_state
        .conn
        .lock()
        .map_err(|_| EncryptedDbError::LockError)?;
    *conn_guard = Some(conn);

    // Note: temp_dir will be dropped after this function returns,
    // but the SQLite connection keeps the file handle open.
    // For now this is acceptable; future work could use a more persistent temp location.
    std::mem::forget(temp_dir); // Prevent cleanup while connection is open

    Ok(())
}

/// Reads database info (header only) without opening/decrypting.
///
/// Used to show password hint before user enters password.
///
/// # Arguments
/// * `path` - Full path to the file
///
/// # Returns
/// File information including password hint.
#[tauri::command]
pub fn get_db_info(path: String) -> Result<DbFileInfo, String> {
    get_db_info_internal(&path).map_err(|e| e.to_string())
}

fn get_db_info_internal(path: &str) -> Result<DbFileInfo, EncryptedDbError> {
    // Check file exists
    if !Path::new(path).exists() {
        return Err(EncryptedDbError::FileNotFound(path.to_string()));
    }

    // Read header only
    let mut file = File::open(path)
        .map_err(|e| EncryptedDbError::FileReadError(e.to_string()))?;
    let header = FileHeader::read_from(&mut file)?;

    Ok(DbFileInfo {
        format: "financedb".to_string(),
        version: header.version,
        password_hint: header.password_hint,
    })
}

/// Diagnostic command: get detailed file information for debugging
/// This helps diagnose password/encryption issues
#[tauri::command]
pub fn diagnose_db_file(path: String) -> Result<String, String> {
    diagnose_db_file_internal(&path).map_err(|e| e.to_string())
}

fn diagnose_db_file_internal(path: &str) -> Result<String, EncryptedDbError> {
    use std::fmt::Write;
    let mut report = String::new();

    // Check file exists
    if !Path::new(path).exists() {
        return Err(EncryptedDbError::FileNotFound(path.to_string()));
    }

    // Get file size
    let metadata = fs::metadata(path)
        .map_err(|e| EncryptedDbError::FileReadError(e.to_string()))?;
    writeln!(report, "File size: {} bytes", metadata.len()).unwrap();

    // Read header
    let mut file = File::open(path)
        .map_err(|e| EncryptedDbError::FileReadError(e.to_string()))?;
    let header = FileHeader::read_from(&mut file)?;

    writeln!(report, "Header version: {}", header.version).unwrap();
    writeln!(report, "Header size: {} bytes", header.size()).unwrap();
    writeln!(report, "Salt (hex): {}", hex::encode(&header.salt)).unwrap();
    writeln!(report, "Memory cost: {} KiB", header.memory_cost).unwrap();
    writeln!(report, "Time cost: {} iterations", header.time_cost).unwrap();
    writeln!(report, "Parallelism: {} threads", header.parallelism).unwrap();
    writeln!(report, "Password hint: {:?}", header.password_hint).unwrap();

    // Calculate expected DB size
    let expected_db_size = metadata.len() as usize - header.size();
    writeln!(report, "Expected DB size: {} bytes", expected_db_size).unwrap();

    // Read first 16 bytes of DB portion (should be SQLCipher header)
    file.seek(SeekFrom::Start(header.size() as u64))
        .map_err(|e| EncryptedDbError::FileReadError(e.to_string()))?;
    
    let mut db_header = [0u8; 16];
    file.read_exact(&mut db_header)
        .map_err(|e| EncryptedDbError::FileReadError(e.to_string()))?;
    writeln!(report, "DB first 16 bytes (hex): {}", hex::encode(&db_header)).unwrap();

    // Expected KDF params
    let (exp_mem, exp_time, exp_par) = kdf::get_kdf_params();
    writeln!(report, "\nExpected KDF params: memory={}, time={}, parallelism={}", exp_mem, exp_time, exp_par).unwrap();
    
    let params_match = header.memory_cost == exp_mem && 
                       header.time_cost == exp_time && 
                       header.parallelism == exp_par;
    writeln!(report, "KDF params match: {}", params_match).unwrap();

    Ok(report)
}

/// Closes the current database connection.
#[tauri::command]
pub fn close_db(db_state: State<DbState>) -> Result<(), String> {
    close_db_internal(&db_state).map_err(|e| e.to_string())
}

fn close_db_internal(db_state: &State<DbState>) -> Result<(), EncryptedDbError> {
    let mut conn_guard = db_state
        .conn
        .lock()
        .map_err(|_| EncryptedDbError::LockError)?;

    // Idempotent: succeed even if no DB is open
    // This allows calling close_db multiple times safely
    *conn_guard = None;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::kdf;
    use tempfile::NamedTempFile;

    // Note: These tests require the full Tauri runtime for State<DbState>,
    // so we test the internal functions directly.

    #[test]
    fn test_create_sqlcipher_db() {
        let temp_file = NamedTempFile::new().unwrap();
        let path = temp_file.path();

        // Use a test key (64 hex chars = 32 bytes)
        let key_hex = "0".repeat(64);

        let conn = create_sqlcipher_db(path, &key_hex).unwrap();

        // Verify we can query the database
        let count: i64 = conn
            .query_row("SELECT count(*) FROM _meta", [], |row| row.get(0))
            .unwrap();
        assert!(count >= 2); // created_at and format_version
    }

    #[test]
    fn test_open_sqlcipher_db_wrong_key() {
        let temp_file = NamedTempFile::new().unwrap();
        let path = temp_file.path();

        // Create with one key
        let correct_key = "a".repeat(64);
        let _conn = create_sqlcipher_db(path, &correct_key).unwrap();
        drop(_conn);

        // Try to open with wrong key
        let wrong_key = "b".repeat(64);
        let result = open_sqlcipher_db(path, &wrong_key);

        assert!(matches!(result, Err(EncryptedDbError::WrongPassword)));
    }

    #[test]
    fn test_open_sqlcipher_db_correct_key() {
        let temp_file = NamedTempFile::new().unwrap();
        let path = temp_file.path();

        let key_hex = "c".repeat(64);
        let _conn = create_sqlcipher_db(path, &key_hex).unwrap();
        drop(_conn);

        // Reopen with same key
        let conn = open_sqlcipher_db(path, &key_hex).unwrap();

        // Verify we can query
        let count: i64 = conn
            .query_row("SELECT count(*) FROM _meta", [], |row| row.get(0))
            .unwrap();
        assert!(count >= 2);
    }

    /// Integration test: full file format roundtrip (header + encrypted DB)
    /// This mimics exactly what happens in create_encrypted_db and open_encrypted_db
    #[test]
    fn test_full_file_format_roundtrip() {
        let password = "12jjKHoZH2Aq2%"; // Test with special characters
        let hint = Some("test hint".to_string());

        // === CREATE PHASE (simulates create_encrypted_db_internal) ===

        // Generate salt and derive key
        let salt = kdf::generate_salt();
        let (memory_cost, time_cost, parallelism) = kdf::get_kdf_params();
        let key = kdf::derive_key(password, &salt).unwrap();
        let key_hex = kdf::key_to_hex(&key);

        // Create header
        let header = FileHeader::new(salt, memory_cost, time_cost, parallelism, hint.clone()).unwrap();

        // Create temp SQLCipher database
        let temp_dir = tempfile::tempdir().unwrap();
        let temp_db_path = temp_dir.path().join("temp.db");
        let temp_conn = create_sqlcipher_db(&temp_db_path, &key_hex).unwrap();
        drop(temp_conn); // Close connection

        // Read encrypted database bytes
        let db_bytes = fs::read(&temp_db_path).unwrap();
        println!("Created DB size: {} bytes", db_bytes.len());

        // Write final file: header + encrypted database
        let output_file_handle = NamedTempFile::new().unwrap();
        let output_path = output_file_handle.path().to_path_buf();
        {
            let mut output_file = File::create(&output_path).unwrap();
            let header_end = header.write_to(&mut output_file).unwrap();
            println!("Header size: {} bytes", header_end);
            output_file.write_all(&db_bytes).unwrap();
            output_file.sync_all().unwrap();
        }

        // Verify final file size
        let final_size = fs::metadata(&output_path).unwrap().len();
        println!("Final file size: {} bytes", final_size);
        assert_eq!(final_size, header.size() as u64 + db_bytes.len() as u64);

        // === OPEN PHASE (simulates open_encrypted_db_internal + open_and_store_connection) ===

        // Read header from file
        let mut file = File::open(&output_path).unwrap();
        let read_header = FileHeader::read_from(&mut file).unwrap();

        // Verify header was read correctly
        assert_eq!(read_header.salt, salt);
        assert_eq!(read_header.memory_cost, memory_cost);
        assert_eq!(read_header.time_cost, time_cost);
        assert_eq!(read_header.parallelism, parallelism);
        assert_eq!(read_header.password_hint, hint);

        // Derive key using salt from header (simulates what open does)
        let derived_key = kdf::derive_key(password, &read_header.salt).unwrap();
        let derived_key_hex = kdf::key_to_hex(&derived_key);

        // Keys should match!
        assert_eq!(key_hex, derived_key_hex, "Keys should match");

        // Extract database portion (simulates open_and_store_connection)
        let header_size = read_header.size();
        file.seek(SeekFrom::Start(header_size as u64)).unwrap();

        let mut extracted_db_bytes = Vec::new();
        file.read_to_end(&mut extracted_db_bytes).unwrap();

        println!("Extracted DB size: {} bytes", extracted_db_bytes.len());
        assert_eq!(db_bytes.len(), extracted_db_bytes.len(), "DB bytes should match");
        assert_eq!(db_bytes, extracted_db_bytes, "DB content should match");

        // Write to new temp file and open with SQLCipher
        let temp_dir2 = tempfile::tempdir().unwrap();
        let temp_db_path2 = temp_dir2.path().join("opened.db");
        fs::write(&temp_db_path2, &extracted_db_bytes).unwrap();

        // This is the critical test - can we open with the derived key?
        let conn = open_sqlcipher_db(&temp_db_path2, &derived_key_hex).unwrap();

        // Verify we can query
        let count: i64 = conn
            .query_row("SELECT count(*) FROM _meta", [], |row| row.get(0))
            .unwrap();
        assert!(count >= 2);
        println!("Successfully queried database, _meta count: {}", count);
    }

    /// Test with exact password user reported issue with
    #[test]
    fn test_password_with_special_chars() {
        let password = "12jjKHoZH2Aq2%"; // Contains % which could cause issues
        
        let salt = kdf::generate_salt();
        let key1 = kdf::derive_key(password, &salt).unwrap();
        let key2 = kdf::derive_key(password, &salt).unwrap();
        
        // Keys should be identical for same password + salt
        assert_eq!(key1, key2, "Keys should be deterministic");
        
        let key_hex1 = kdf::key_to_hex(&key1);
        let key_hex2 = kdf::key_to_hex(&key2);
        assert_eq!(key_hex1, key_hex2, "Hex keys should match");
        
        println!("Password: {}", password);
        println!("Salt (first 8 bytes): {:02x?}", &salt[..8]);
        println!("Key hex (first 16 chars): {}", &key_hex1[..16]);
    }

    /// Test with no password hint
    #[test]
    fn test_full_file_format_roundtrip_no_hint() {
        let password = "testPassword123!";

        // Create phase
        let salt = kdf::generate_salt();
        let (memory_cost, time_cost, parallelism) = kdf::get_kdf_params();
        let key = kdf::derive_key(password, &salt).unwrap();
        let key_hex = kdf::key_to_hex(&key);

        let header = FileHeader::new(salt, memory_cost, time_cost, parallelism, None).unwrap();

        let temp_dir = tempfile::tempdir().unwrap();
        let temp_db_path = temp_dir.path().join("temp.db");
        let temp_conn = create_sqlcipher_db(&temp_db_path, &key_hex).unwrap();
        drop(temp_conn);

        let db_bytes = fs::read(&temp_db_path).unwrap();

        let output_file_handle = NamedTempFile::new().unwrap();
        let output_path = output_file_handle.path().to_path_buf();
        {
            let mut output_file = File::create(&output_path).unwrap();
            header.write_to(&mut output_file).unwrap();
            output_file.write_all(&db_bytes).unwrap();
            output_file.sync_all().unwrap();
        }

        // Open phase
        let mut file = File::open(&output_path).unwrap();
        let read_header = FileHeader::read_from(&mut file).unwrap();

        assert_eq!(read_header.password_hint, None);

        let derived_key = kdf::derive_key(password, &read_header.salt).unwrap();
        let derived_key_hex = kdf::key_to_hex(&derived_key);

        let header_size = read_header.size();
        file.seek(SeekFrom::Start(header_size as u64)).unwrap();

        let mut extracted_db_bytes = Vec::new();
        file.read_to_end(&mut extracted_db_bytes).unwrap();

        let temp_dir2 = tempfile::tempdir().unwrap();
        let temp_db_path2 = temp_dir2.path().join("opened.db");
        fs::write(&temp_db_path2, &extracted_db_bytes).unwrap();

        let conn = open_sqlcipher_db(&temp_db_path2, &derived_key_hex).unwrap();

        let count: i64 = conn
            .query_row("SELECT count(*) FROM _meta", [], |row| row.get(0))
            .unwrap();
        assert!(count >= 2);
    }

    /// Test simulating "close app" and "reopen" - verifies the file on disk is valid
    /// This is the exact scenario the user reported failing
    #[test]
    fn test_simulate_app_close_reopen() {
        let password = "12jjKHoZH2Aq2%"; // User's exact password
        let final_file = NamedTempFile::new().unwrap();
        let final_path = final_file.path().to_path_buf();
        let final_path_str = final_path.to_string_lossy().to_string();

        // ======== APP SESSION 1: Create the database ========
        {
            // Generate salt and derive key
            let salt = kdf::generate_salt();
            let (memory_cost, time_cost, parallelism) = kdf::get_kdf_params();
            let key = kdf::derive_key(password, &salt).unwrap();
            let key_hex = kdf::key_to_hex(&key);

            println!("[CREATE] Salt: {:02x?}", &salt[..8]);
            println!("[CREATE] Key hex: {}...", &key_hex[..16]);

            // Create header
            let header = FileHeader::new(salt, memory_cost, time_cost, parallelism, None).unwrap();
            println!("[CREATE] Header size: {}", header.size());

            // Create temp SQLCipher database
            let temp_dir = tempfile::tempdir().unwrap();
            let temp_db_path = temp_dir.path().join("temp.db");
            let temp_conn = create_sqlcipher_db(&temp_db_path, &key_hex).unwrap();
            
            // Add some extra data to verify it survives
            temp_conn.execute_batch(
                "INSERT OR REPLACE INTO _meta (key, value) VALUES ('test_key', 'test_value');"
            ).unwrap();
            drop(temp_conn);

            // Read encrypted database bytes
            let db_bytes = fs::read(&temp_db_path).unwrap();
            println!("[CREATE] DB bytes: {}", db_bytes.len());

            // Write final file: header + encrypted database
            {
                let mut output_file = File::create(&final_path).unwrap();
                header.write_to(&mut output_file).unwrap();
                output_file.write_all(&db_bytes).unwrap();
                output_file.sync_all().unwrap();
            }

            // Verify file was written correctly
            let file_size = fs::metadata(&final_path).unwrap().len();
            println!("[CREATE] Final file size: {}", file_size);
            assert_eq!(file_size, header.size() as u64 + db_bytes.len() as u64);

            println!("[CREATE] Database created successfully at {}", final_path_str);
        }

        // ======== SIMULATED APP CLOSE ========
        // All in-memory state is dropped here

        // ======== APP SESSION 2: Reopen the database ========
        {
            println!("\n[REOPEN] Opening file: {}", final_path_str);

            // Read header from file
            let mut file = File::open(&final_path).unwrap();
            let header = FileHeader::read_from(&mut file).unwrap();

            println!("[REOPEN] Header version: {}", header.version);
            println!("[REOPEN] Salt: {:02x?}", &header.salt[..8]);
            println!("[REOPEN] Header size: {}", header.size());

            // Derive key from password + salt from header
            let key = kdf::derive_key(password, &header.salt).unwrap();
            let key_hex = kdf::key_to_hex(&key);
            println!("[REOPEN] Key hex: {}...", &key_hex[..16]);

            // Extract database portion
            let header_size = header.size();
            file.seek(SeekFrom::Start(header_size as u64)).unwrap();

            let mut db_bytes = Vec::new();
            file.read_to_end(&mut db_bytes).unwrap();
            println!("[REOPEN] Extracted DB bytes: {}", db_bytes.len());

            // Write to new temp file
            let temp_dir = tempfile::tempdir().unwrap();
            let temp_db_path = temp_dir.path().join("reopened.db");
            fs::write(&temp_db_path, &db_bytes).unwrap();

            // Open with SQLCipher - THIS IS WHERE IT WOULD FAIL
            let conn = open_sqlcipher_db(&temp_db_path, &key_hex).unwrap();

            // Verify data
            let value: String = conn
                .query_row("SELECT value FROM _meta WHERE key = 'test_key'", [], |row| row.get(0))
                .unwrap();
            assert_eq!(value, "test_value");
            println!("[REOPEN] Successfully read test_key = {}", value);

            let count: i64 = conn
                .query_row("SELECT count(*) FROM _meta", [], |row| row.get(0))
                .unwrap();
            assert!(count >= 3); // created_at, format_version, test_key
            println!("[REOPEN] Total _meta rows: {}", count);
        }

        println!("\n[SUCCESS] App close/reopen simulation passed!");
    }
}
