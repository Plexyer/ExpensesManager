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
use std::path::{Path, PathBuf};
use std::sync::Mutex;
use tauri::State;
use thiserror::Error;

/// Metadata about the currently open file, needed for write-back on close/save.
///
/// When a `.financedb` file is opened, the encrypted SQLite portion is extracted
/// to a temp file. All mutations happen on the temp file. This struct tracks
/// everything needed to write the temp DB back to the original file.
pub struct OpenFileInfo {
    /// Path to the original `.financedb` file on disk
    pub original_path: String,
    /// File header (salt, KDF params, hint) for re-serialization on write-back
    pub header: FileHeader,
    /// Path to the temp SQLCipher database file (where SQLite operates)
    pub temp_db_path: PathBuf,
    /// Temp directory ownership — cleaned up when file_info is dropped
    pub _temp_dir: tempfile::TempDir,
}

/// Global database state - wraps optional connection and file metadata in Mutexes.
///
/// `conn` holds the active SQLite connection to the temp database.
/// `file_info` holds metadata needed to write changes back to the original file.
/// Both are set together on open/create and cleared together on close.
pub struct DbState {
    pub conn: Mutex<Option<Connection>>,
    pub file_info: Mutex<Option<OpenFileInfo>>,
}

impl DbState {
    pub fn new() -> Self {
        DbState {
            conn: Mutex::new(None),
            file_info: Mutex::new(None),
        }
    }

    /// Saves the database to disk if one is currently open.
    /// Returns Ok(()) if no database is open (no-op).
    /// Used by the app exit handler to prevent data loss on window close.
    pub fn save_if_open(&self) -> Result<(), String> {
        let file_info_guard = self
            .file_info
            .lock()
            .map_err(|_| "Failed to lock file_info mutex".to_string())?;

        if let Some(file_info) = file_info_guard.as_ref() {
            write_back_to_file(file_info).map_err(|e| e.to_string())?;
        }

        Ok(())
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

// ============================================================================
// Grid Data Structures
// ============================================================================

/// One category row in the grid for a budget instance (with rollup totals).
#[derive(Debug, Serialize, Deserialize)]
pub struct GridCategoryRow {
    /// Primary key of the budget_instance_category
    pub budget_instance_category_id: i64,
    /// Foreign key to global_categories
    pub global_category_id: i64,
    /// Category name from global_categories
    pub category_name: String,
    /// Default amount from template (allocated budget)
    pub default_amount: f64,
    /// Currency code (e.g., "CHF", "EUR")
    pub default_currency: String,
    /// Display order
    pub sort_order: i64,
    /// Sum of all non-deleted 'received' line items
    pub received_total: f64,
    /// Sum of all non-deleted 'spent' line items
    pub spent_total: f64,
    /// Calculated: received_total - spent_total
    pub remaining: f64,
    /// Earliest date among received line items (derived), e.g. "2026-02-01"
    pub first_received_date: Option<String>,
    /// Latest date among received line items (derived), e.g. "2026-02-15"
    pub last_received_date: Option<String>,
}

/// Response for get_grid_data: list of category rows with rollups for one budget instance.
#[derive(Debug, Serialize, Deserialize)]
pub struct GetGridDataResult {
    /// The budget instance ID these rows belong to
    pub budget_instance_id: i64,
    /// Category rows with rollup totals
    pub rows: Vec<GridCategoryRow>,
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

/// Helper function to extract database from file, store connection and file info in state.
///
/// After this call, all DB operations happen on the temp file. The original file
/// path and header are stored in `DbState.file_info` so that `close_db` or `save_db`
/// can write the modified temp DB back to the original `.financedb` file.
fn open_and_store_connection(
    path: &str,
    key_hex: &str,
    db_state: &State<DbState>,
) -> Result<(), EncryptedDbError> {
    // Read the entire file
    let mut file = File::open(path)
        .map_err(|e| EncryptedDbError::FileReadError(e.to_string()))?;
    
    // Read header to get its size (also stored for write-back)
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

    // Store file info for write-back on close/save
    // (replaces the old std::mem::forget(temp_dir) approach)
    let mut file_info_guard = db_state
        .file_info
        .lock()
        .map_err(|_| EncryptedDbError::LockError)?;
    *file_info_guard = Some(OpenFileInfo {
        original_path: path.to_string(),
        header,
        temp_db_path,
        _temp_dir: temp_dir,
    });

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

/// Writes the temp database back to the original `.financedb` file.
///
/// Uses a write-to-temp-then-rename strategy to minimize data loss risk.
/// The temp file is created next to the original, written + fsynced, then
/// renamed to replace the original atomically (best-effort on Windows).
fn write_back_to_file(file_info: &OpenFileInfo) -> Result<(), EncryptedDbError> {
    // Read current temp DB bytes (SQLite has flushed since we use auto-commit)
    let db_bytes = fs::read(&file_info.temp_db_path)
        .map_err(|e| EncryptedDbError::FileReadError(
            format!("Failed to read temp DB for write-back: {}", e)
        ))?;

    // Write to a staging file next to the original, then atomic rename
    let staging_path = format!("{}.saving", &file_info.original_path);

    {
        let mut output_file = File::create(&staging_path)
            .map_err(|e| EncryptedDbError::FileWriteError(
                format!("Failed to create staging file: {}", e)
            ))?;
        file_info.header.write_to(&mut output_file)?;
        output_file
            .write_all(&db_bytes)
            .map_err(|e| EncryptedDbError::FileWriteError(e.to_string()))?;
        output_file
            .sync_all()
            .map_err(|e| EncryptedDbError::FileWriteError(e.to_string()))?;
    }

    // Rename staging file to original (atomic on same volume)
    fs::rename(&staging_path, &file_info.original_path)
        .map_err(|e| {
            // Clean up staging file on rename failure
            let _ = fs::remove_file(&staging_path);
            EncryptedDbError::FileWriteError(
                format!("Failed to finalize save (rename): {}", e)
            )
        })?;

    Ok(())
}

/// Saves the current database to disk without closing the connection.
///
/// Writes the modified temp DB bytes back to the original `.financedb` file.
/// The connection remains open for further operations.
#[tauri::command]
pub fn save_db(db_state: State<DbState>) -> Result<(), String> {
    save_db_internal(&db_state).map_err(|e| e.to_string())
}

fn save_db_internal(db_state: &State<DbState>) -> Result<(), EncryptedDbError> {
    // Verify a DB is open
    {
        let conn_guard = db_state
            .conn
            .lock()
            .map_err(|_| EncryptedDbError::LockError)?;
        if conn_guard.is_none() {
            return Err(EncryptedDbError::NotOpen);
        }
    }

    // Write back to original file
    let file_info_guard = db_state
        .file_info
        .lock()
        .map_err(|_| EncryptedDbError::LockError)?;

    let file_info = file_info_guard
        .as_ref()
        .ok_or(EncryptedDbError::NotOpen)?;

    write_back_to_file(file_info)
}

/// Closes the current database connection, writing changes back to disk first.
///
/// Flow:
/// 1. Write back temp DB to the original `.financedb` file (while connection is still valid)
/// 2. Drop the connection (releases file handles on the temp DB)
/// 3. Drop file_info (cleans up the temp directory)
///
/// If write-back fails, the connection is NOT dropped, so the user can retry.
#[tauri::command]
pub fn close_db(db_state: State<DbState>) -> Result<(), String> {
    close_db_internal(&db_state).map_err(|e| e.to_string())
}

fn close_db_internal(db_state: &State<DbState>) -> Result<(), EncryptedDbError> {
    // Step 1: Write back to original file FIRST (while temp file is still valid).
    // If this fails, we leave the connection open so the user can retry or save manually.
    {
        let file_info_guard = db_state
            .file_info
            .lock()
            .map_err(|_| EncryptedDbError::LockError)?;

        if let Some(file_info) = file_info_guard.as_ref() {
            write_back_to_file(file_info)?;
        }
    }

    // Step 2: Drop connection (releases file handle on temp DB)
    {
        let mut conn_guard = db_state
            .conn
            .lock()
            .map_err(|_| EncryptedDbError::LockError)?;
        *conn_guard = None;
    }

    // Step 3: Clean up file_info and temp directory
    {
        let mut file_info_guard = db_state
            .file_info
            .lock()
            .map_err(|_| EncryptedDbError::LockError)?;
        *file_info_guard = None;
    }

    Ok(())
}

// ============================================================================
// Grid Data Commands
// ============================================================================

/// Gets grid data for a budget instance, including category rows with rollup totals.
///
/// # Arguments
/// * `budget_instance_id` - The ID of the budget instance to load
/// * `db_state` - Global database state
///
/// # Returns
/// Grid data with category rows including received_total, spent_total, and remaining.
#[tauri::command]
pub fn get_grid_data(
    budget_instance_id: i64,
    db_state: State<DbState>,
) -> Result<GetGridDataResult, String> {
    get_grid_data_internal(budget_instance_id, &db_state).map_err(|e| e.to_string())
}

fn get_grid_data_internal(
    budget_instance_id: i64,
    db_state: &State<DbState>,
) -> Result<GetGridDataResult, EncryptedDbError> {
    let conn_guard = db_state
        .conn
        .lock()
        .map_err(|_| EncryptedDbError::LockError)?;

    let conn = conn_guard
        .as_ref()
        .ok_or(EncryptedDbError::NotOpen)?;

    // Validate that the budget instance exists
    let instance_exists: bool = conn
        .query_row(
            "SELECT 1 FROM period_budget_instances WHERE budget_instance_id = ?",
            [budget_instance_id],
            |_| Ok(true),
        )
        .unwrap_or(false);

    if !instance_exists {
        return Err(EncryptedDbError::DatabaseError(format!(
            "Budget instance {} not found.",
            budget_instance_id
        )));
    }

    // Query all categories for this budget instance with rollup totals
    // Single query approach for optimal performance
    let mut stmt = conn.prepare(
        r#"
        SELECT
            bic.budget_instance_category_id,
            bic.global_category_id,
            gc.name AS category_name,
            bic.default_amount,
            bic.default_currency,
            bic.sort_order,
            COALESCE(SUM(CASE WHEN li.kind = 'received' THEN li.amount ELSE 0 END), 0) AS received_total,
            COALESCE(SUM(CASE WHEN li.kind = 'spent' THEN li.amount ELSE 0 END), 0) AS spent_total,
            MIN(CASE WHEN li.kind = 'received' THEN DATE(li.occurred_at) END) AS first_received_date,
            MAX(CASE WHEN li.kind = 'received' THEN DATE(li.occurred_at) END) AS last_received_date
        FROM budget_instance_categories bic
        JOIN global_categories gc ON gc.global_category_id = bic.global_category_id
        LEFT JOIN category_line_items li
            ON li.budget_instance_category_id = bic.budget_instance_category_id
            AND li.deleted_at IS NULL
        WHERE bic.budget_instance_id = ?
        GROUP BY bic.budget_instance_category_id
        ORDER BY bic.sort_order, bic.budget_instance_category_id
        "#,
    )?;

    let rows = stmt
        .query_map([budget_instance_id], |row| {
            let received_total: f64 = row.get(6)?;
            let spent_total: f64 = row.get(7)?;
            let remaining = received_total - spent_total;

            Ok(GridCategoryRow {
                budget_instance_category_id: row.get(0)?,
                global_category_id: row.get(1)?,
                category_name: row.get(2)?,
                default_amount: row.get(3)?,
                default_currency: row.get(4)?,
                sort_order: row.get(5)?,
                received_total,
                spent_total,
                remaining,
                first_received_date: row.get(8)?,
                last_received_date: row.get(9)?,
            })
        })?
        .collect::<Result<Vec<_>, _>>()?;

    Ok(GetGridDataResult {
        budget_instance_id,
        rows,
    })
}

// ============================================================================
// Global Category Commands
// ============================================================================

/// A global category definition.
#[derive(Debug, Serialize, Deserialize)]
pub struct GlobalCategory {
    pub global_category_id: i64,
    pub name: String,
    pub description: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

/// Arguments for creating a global category.
#[derive(Debug, Serialize, Deserialize)]
pub struct CreateGlobalCategoryArgs {
    pub name: String,
    pub description: Option<String>,
}

/// Creates a new global category.
#[tauri::command]
pub fn create_global_category(
    args: CreateGlobalCategoryArgs,
    db_state: State<DbState>,
) -> Result<GlobalCategory, String> {
    create_global_category_internal(&args, &db_state).map_err(|e| e.to_string())
}

fn create_global_category_internal(
    args: &CreateGlobalCategoryArgs,
    db_state: &State<DbState>,
) -> Result<GlobalCategory, EncryptedDbError> {
    let conn_guard = db_state
        .conn
        .lock()
        .map_err(|_| EncryptedDbError::LockError)?;

    let conn = conn_guard
        .as_ref()
        .ok_or(EncryptedDbError::NotOpen)?;

    conn.execute(
        "INSERT INTO global_categories (name, description) VALUES (?, ?)",
        rusqlite::params![&args.name, &args.description],
    )?;

    let id = conn.last_insert_rowid();

    // Fetch the created category
    let category = conn.query_row(
        "SELECT global_category_id, name, description, created_at, updated_at FROM global_categories WHERE global_category_id = ?",
        [id],
        |row| {
            Ok(GlobalCategory {
                global_category_id: row.get(0)?,
                name: row.get(1)?,
                description: row.get(2)?,
                created_at: row.get(3)?,
                updated_at: row.get(4)?,
            })
        },
    )?;

    Ok(category)
}

/// Lists all global categories.
#[tauri::command]
pub fn list_global_categories(db_state: State<DbState>) -> Result<Vec<GlobalCategory>, String> {
    list_global_categories_internal(&db_state).map_err(|e| e.to_string())
}

fn list_global_categories_internal(
    db_state: &State<DbState>,
) -> Result<Vec<GlobalCategory>, EncryptedDbError> {
    let conn_guard = db_state
        .conn
        .lock()
        .map_err(|_| EncryptedDbError::LockError)?;

    let conn = conn_guard
        .as_ref()
        .ok_or(EncryptedDbError::NotOpen)?;

    let mut stmt = conn.prepare(
        "SELECT global_category_id, name, description, created_at, updated_at FROM global_categories ORDER BY name",
    )?;

    let categories = stmt
        .query_map([], |row| {
            Ok(GlobalCategory {
                global_category_id: row.get(0)?,
                name: row.get(1)?,
                description: row.get(2)?,
                created_at: row.get(3)?,
                updated_at: row.get(4)?,
            })
        })?
        .collect::<Result<Vec<_>, _>>()?;

    Ok(categories)
}

/// Deletes a global category by ID.
/// Fails if the category is used in any template.
#[tauri::command]
pub fn delete_global_category(
    global_category_id: i64,
    db_state: State<DbState>,
) -> Result<(), String> {
    delete_global_category_internal(global_category_id, &db_state).map_err(|e| e.to_string())
}

fn delete_global_category_internal(
    global_category_id: i64,
    db_state: &State<DbState>,
) -> Result<(), EncryptedDbError> {
    let conn_guard = db_state
        .conn
        .lock()
        .map_err(|_| EncryptedDbError::LockError)?;

    let conn = conn_guard
        .as_ref()
        .ok_or(EncryptedDbError::NotOpen)?;

    // Check if category is used in any template
    let in_use: bool = conn
        .query_row(
            "SELECT 1 FROM template_categories WHERE global_category_id = ? LIMIT 1",
            [global_category_id],
            |_| Ok(true),
        )
        .unwrap_or(false);

    if in_use {
        return Err(EncryptedDbError::DatabaseError(
            "Cannot delete category: it is used in one or more templates.".to_string(),
        ));
    }

    let rows_deleted = conn.execute(
        "DELETE FROM global_categories WHERE global_category_id = ?",
        [global_category_id],
    )?;

    if rows_deleted == 0 {
        return Err(EncryptedDbError::DatabaseError(format!(
            "Category {} not found.",
            global_category_id
        )));
    }

    Ok(())
}

// ============================================================================
// Template Commands
// ============================================================================

/// A budget template definition.
#[derive(Debug, Serialize, Deserialize)]
pub struct Template {
    pub template_id: i64,
    pub name: String,
    pub description: Option<String>,
    pub cadence: String,
    pub default_currency: String,
    pub created_at: String,
    pub updated_at: String,
}

/// A category linked to a template with its default amount.
#[derive(Debug, Serialize, Deserialize)]
pub struct TemplateCategory {
    pub template_category_id: i64,
    pub global_category_id: i64,
    pub category_name: String,
    pub allocated_amount: f64,
    pub category_type: String,
    pub sort_order: i64,
}

/// Arguments for creating a template.
#[derive(Debug, Serialize, Deserialize)]
pub struct CreateTemplateArgs {
    pub name: String,
    pub description: Option<String>,
    pub cadence: String,
    pub default_currency: String,
}

/// Arguments for updating a template.
#[derive(Debug, Serialize, Deserialize)]
pub struct UpdateTemplateArgs {
    pub name: String,
    pub description: Option<String>,
    pub cadence: String,
    pub default_currency: String,
}

/// Arguments for adding a category to a template.
#[derive(Debug, Serialize, Deserialize)]
pub struct AddTemplateCategoryArgs {
    pub template_id: i64,
    pub global_category_id: i64,
    pub allocated_amount: f64,
    pub category_type: Option<String>,
}

/// Creates a new budget template.
#[tauri::command]
pub fn create_template(
    args: CreateTemplateArgs,
    db_state: State<DbState>,
) -> Result<Template, String> {
    create_template_internal(&args, &db_state).map_err(|e| e.to_string())
}

fn create_template_internal(
    args: &CreateTemplateArgs,
    db_state: &State<DbState>,
) -> Result<Template, EncryptedDbError> {
    let conn_guard = db_state
        .conn
        .lock()
        .map_err(|_| EncryptedDbError::LockError)?;

    let conn = conn_guard
        .as_ref()
        .ok_or(EncryptedDbError::NotOpen)?;

    // Validate cadence
    let valid_cadences = ["monthly", "biweekly", "weekly", "daily", "yearly", "custom"];
    if !valid_cadences.contains(&args.cadence.as_str()) {
        return Err(EncryptedDbError::DatabaseError(format!(
            "Invalid cadence: {}. Must be one of: {}",
            args.cadence,
            valid_cadences.join(", ")
        )));
    }

    conn.execute(
        "INSERT INTO budget_templates (name, description, cadence, default_currency) VALUES (?, ?, ?, ?)",
        rusqlite::params![&args.name, &args.description, &args.cadence, &args.default_currency],
    )?;

    let id = conn.last_insert_rowid();

    // Fetch the created template
    let template = conn.query_row(
        "SELECT template_id, name, description, cadence, default_currency, created_at, updated_at FROM budget_templates WHERE template_id = ?",
        [id],
        |row| {
            Ok(Template {
                template_id: row.get(0)?,
                name: row.get(1)?,
                description: row.get(2)?,
                cadence: row.get(3)?,
                default_currency: row.get(4)?,
                created_at: row.get(5)?,
                updated_at: row.get(6)?,
            })
        },
    )?;

    Ok(template)
}

/// Lists all budget templates.
#[tauri::command]
pub fn list_templates(db_state: State<DbState>) -> Result<Vec<Template>, String> {
    list_templates_internal(&db_state).map_err(|e| e.to_string())
}

fn list_templates_internal(
    db_state: &State<DbState>,
) -> Result<Vec<Template>, EncryptedDbError> {
    let conn_guard = db_state
        .conn
        .lock()
        .map_err(|_| EncryptedDbError::LockError)?;

    let conn = conn_guard
        .as_ref()
        .ok_or(EncryptedDbError::NotOpen)?;

    let mut stmt = conn.prepare(
        "SELECT template_id, name, description, cadence, default_currency, created_at, updated_at FROM budget_templates ORDER BY name",
    )?;

    let templates = stmt
        .query_map([], |row| {
            Ok(Template {
                template_id: row.get(0)?,
                name: row.get(1)?,
                description: row.get(2)?,
                cadence: row.get(3)?,
                default_currency: row.get(4)?,
                created_at: row.get(5)?,
                updated_at: row.get(6)?,
            })
        })?
        .collect::<Result<Vec<_>, _>>()?;

    Ok(templates)
}

/// Gets a single template by ID.
#[tauri::command]
pub fn get_template(
    template_id: i64,
    db_state: State<DbState>,
) -> Result<Template, String> {
    get_template_internal(template_id, &db_state).map_err(|e| e.to_string())
}

/// Fetches a template by ID using an existing connection. Used by get_template_internal
/// and update_template_internal to avoid re-acquiring the conn lock (which would deadlock).
fn get_template_with_conn(conn: &Connection, template_id: i64) -> Result<Template, EncryptedDbError> {
    let template = conn.query_row(
        "SELECT template_id, name, description, cadence, default_currency, created_at, updated_at FROM budget_templates WHERE template_id = ?",
        [template_id],
        |row| {
            Ok(Template {
                template_id: row.get(0)?,
                name: row.get(1)?,
                description: row.get(2)?,
                cadence: row.get(3)?,
                default_currency: row.get(4)?,
                created_at: row.get(5)?,
                updated_at: row.get(6)?,
            })
        },
    ).map_err(|e| {
        if matches!(e, rusqlite::Error::QueryReturnedNoRows) {
            EncryptedDbError::DatabaseError(format!("Template {} not found.", template_id))
        } else {
            EncryptedDbError::from(e)
        }
    })?;
    Ok(template)
}

fn get_template_internal(
    template_id: i64,
    db_state: &State<DbState>,
) -> Result<Template, EncryptedDbError> {
    let conn_guard = db_state
        .conn
        .lock()
        .map_err(|_| EncryptedDbError::LockError)?;

    let conn = conn_guard
        .as_ref()
        .ok_or(EncryptedDbError::NotOpen)?;

    get_template_with_conn(conn, template_id)
}

/// Updates an existing template.
#[tauri::command]
pub fn update_template(
    template_id: i64,
    args: UpdateTemplateArgs,
    db_state: State<DbState>,
) -> Result<Template, String> {
    update_template_internal(template_id, &args, &db_state).map_err(|e| e.to_string())
}

fn update_template_internal(
    template_id: i64,
    args: &UpdateTemplateArgs,
    db_state: &State<DbState>,
) -> Result<Template, EncryptedDbError> {
    let conn_guard = db_state
        .conn
        .lock()
        .map_err(|_| EncryptedDbError::LockError)?;

    let conn = conn_guard
        .as_ref()
        .ok_or(EncryptedDbError::NotOpen)?;

    // Validate cadence
    let valid_cadences = ["monthly", "biweekly", "weekly", "daily", "yearly", "custom"];
    if !valid_cadences.contains(&args.cadence.as_str()) {
        return Err(EncryptedDbError::DatabaseError(format!(
            "Invalid cadence: {}. Must be one of: {}",
            args.cadence,
            valid_cadences.join(", ")
        )));
    }

    let rows_updated = conn.execute(
        "UPDATE budget_templates SET name = ?, description = ?, cadence = ?, default_currency = ?, updated_at = datetime('now') WHERE template_id = ?",
        rusqlite::params![&args.name, &args.description, &args.cadence, &args.default_currency, template_id],
    )?;

    if rows_updated == 0 {
        return Err(EncryptedDbError::DatabaseError(format!(
            "Template {} not found.",
            template_id
        )));
    }

    // Fetch the updated template using the connection we already hold.
    // Do not call get_template_internal here — it would try to lock db_state.conn again
    // and deadlock (Mutex is not reentrant).
    get_template_with_conn(conn, template_id)
}

/// Deletes a template by ID.
#[tauri::command]
pub fn delete_template(
    template_id: i64,
    db_state: State<DbState>,
) -> Result<(), String> {
    delete_template_internal(template_id, &db_state).map_err(|e| e.to_string())
}

fn delete_template_internal(
    template_id: i64,
    db_state: &State<DbState>,
) -> Result<(), EncryptedDbError> {
    let conn_guard = db_state
        .conn
        .lock()
        .map_err(|_| EncryptedDbError::LockError)?;

    let conn = conn_guard
        .as_ref()
        .ok_or(EncryptedDbError::NotOpen)?;

    let rows_deleted = conn.execute(
        "DELETE FROM budget_templates WHERE template_id = ?",
        [template_id],
    )?;

    if rows_deleted == 0 {
        return Err(EncryptedDbError::DatabaseError(format!(
            "Template {} not found.",
            template_id
        )));
    }

    Ok(())
}

// ============================================================================
// Template Category Commands
// ============================================================================

/// Gets all categories for a template.
#[tauri::command]
pub fn get_template_categories(
    template_id: i64,
    db_state: State<DbState>,
) -> Result<Vec<TemplateCategory>, String> {
    get_template_categories_internal(template_id, &db_state).map_err(|e| e.to_string())
}

fn get_template_categories_internal(
    template_id: i64,
    db_state: &State<DbState>,
) -> Result<Vec<TemplateCategory>, EncryptedDbError> {
    let conn_guard = db_state
        .conn
        .lock()
        .map_err(|_| EncryptedDbError::LockError)?;

    let conn = conn_guard
        .as_ref()
        .ok_or(EncryptedDbError::NotOpen)?;

    let mut stmt = conn.prepare(
        r#"
        SELECT 
            tc.template_category_id,
            tc.global_category_id,
            gc.name AS category_name,
            tc.allocated_amount,
            tc.category_type,
            tc.sort_order
        FROM template_categories tc
        JOIN global_categories gc ON gc.global_category_id = tc.global_category_id
        WHERE tc.template_id = ?
        ORDER BY tc.sort_order, tc.template_category_id
        "#,
    )?;

    let categories = stmt
        .query_map([template_id], |row| {
            Ok(TemplateCategory {
                template_category_id: row.get(0)?,
                global_category_id: row.get(1)?,
                category_name: row.get(2)?,
                allocated_amount: row.get(3)?,
                category_type: row.get(4)?,
                sort_order: row.get(5)?,
            })
        })?
        .collect::<Result<Vec<_>, _>>()?;

    Ok(categories)
}

/// Adds a category to a template.
#[tauri::command]
pub fn add_category_to_template(
    args: AddTemplateCategoryArgs,
    db_state: State<DbState>,
) -> Result<TemplateCategory, String> {
    add_category_to_template_internal(&args, &db_state).map_err(|e| e.to_string())
}

fn add_category_to_template_internal(
    args: &AddTemplateCategoryArgs,
    db_state: &State<DbState>,
) -> Result<TemplateCategory, EncryptedDbError> {
    let conn_guard = db_state
        .conn
        .lock()
        .map_err(|_| EncryptedDbError::LockError)?;

    let conn = conn_guard
        .as_ref()
        .ok_or(EncryptedDbError::NotOpen)?;

    // Get next sort order
    let max_sort: i64 = conn
        .query_row(
            "SELECT COALESCE(MAX(sort_order), 0) FROM template_categories WHERE template_id = ?",
            [args.template_id],
            |row| row.get(0),
        )
        .unwrap_or(0);

    let category_type = args.category_type.clone().unwrap_or_else(|| "expense".to_string());

    conn.execute(
        "INSERT INTO template_categories (template_id, global_category_id, allocated_amount, category_type, sort_order) VALUES (?, ?, ?, ?, ?)",
        rusqlite::params![args.template_id, args.global_category_id, args.allocated_amount, &category_type, max_sort + 1],
    )?;

    let id = conn.last_insert_rowid();

    // Fetch the created template category with joined name
    let tc = conn.query_row(
        r#"
        SELECT 
            tc.template_category_id,
            tc.global_category_id,
            gc.name AS category_name,
            tc.allocated_amount,
            tc.category_type,
            tc.sort_order
        FROM template_categories tc
        JOIN global_categories gc ON gc.global_category_id = tc.global_category_id
        WHERE tc.template_category_id = ?
        "#,
        [id],
        |row| {
            Ok(TemplateCategory {
                template_category_id: row.get(0)?,
                global_category_id: row.get(1)?,
                category_name: row.get(2)?,
                allocated_amount: row.get(3)?,
                category_type: row.get(4)?,
                sort_order: row.get(5)?,
            })
        },
    )?;

    Ok(tc)
}

/// Removes a category from a template.
#[tauri::command]
pub fn remove_category_from_template(
    template_category_id: i64,
    db_state: State<DbState>,
) -> Result<(), String> {
    remove_category_from_template_internal(template_category_id, &db_state).map_err(|e| e.to_string())
}

fn remove_category_from_template_internal(
    template_category_id: i64,
    db_state: &State<DbState>,
) -> Result<(), EncryptedDbError> {
    let conn_guard = db_state
        .conn
        .lock()
        .map_err(|_| EncryptedDbError::LockError)?;

    let conn = conn_guard
        .as_ref()
        .ok_or(EncryptedDbError::NotOpen)?;

    let rows_deleted = conn.execute(
        "DELETE FROM template_categories WHERE template_category_id = ?",
        [template_category_id],
    )?;

    if rows_deleted == 0 {
        return Err(EncryptedDbError::DatabaseError(format!(
            "Template category {} not found.",
            template_category_id
        )));
    }

    Ok(())
}

/// Updates the allocated amount for a template category.
#[tauri::command]
pub fn update_template_category_amount(
    template_category_id: i64,
    allocated_amount: f64,
    db_state: State<DbState>,
) -> Result<(), String> {
    update_template_category_amount_internal(template_category_id, allocated_amount, &db_state)
        .map_err(|e| e.to_string())
}

fn update_template_category_amount_internal(
    template_category_id: i64,
    allocated_amount: f64,
    db_state: &State<DbState>,
) -> Result<(), EncryptedDbError> {
    let conn_guard = db_state
        .conn
        .lock()
        .map_err(|_| EncryptedDbError::LockError)?;

    let conn = conn_guard
        .as_ref()
        .ok_or(EncryptedDbError::NotOpen)?;

    let rows_updated = conn.execute(
        "UPDATE template_categories SET allocated_amount = ? WHERE template_category_id = ?",
        rusqlite::params![allocated_amount, template_category_id],
    )?;

    if rows_updated == 0 {
        return Err(EncryptedDbError::DatabaseError(format!(
            "Template category {} not found.",
            template_category_id
        )));
    }

    Ok(())
}

// ============================================================================
// Period Budget Instance Commands
// ============================================================================

/// A period budget instance (one grid view per period).
#[derive(Debug, Serialize, Deserialize)]
pub struct PeriodBudgetInstance {
    pub budget_instance_id: i64,
    pub cadence: String,
    pub start_date: String,
    pub end_date: Option<String>,
    pub template_id: Option<i64>,
    pub template_name: Option<String>,
    pub income_arrival_date: Option<String>,
    pub created_at: String,
}

/// Arguments for creating a period from a template.
#[derive(Debug, Serialize, Deserialize)]
pub struct CreatePeriodFromTemplateArgs {
    pub template_id: i64,
    pub start_date: String,
    /// Optional end_date — required for 'custom' cadence, computed otherwise.
    pub end_date: Option<String>,
    /// Optional income arrival date for the period.
    pub income_arrival_date: Option<String>,
}

/// Result of creating a period from a template.
#[derive(Debug, Serialize, Deserialize)]
pub struct CreatePeriodResult {
    pub period: PeriodBudgetInstance,
    /// Number of category envelopes copied from the template.
    pub categories_created: usize,
    /// Number of template-default received line items auto-created.
    pub default_line_items_created: usize,
}

/// Computes end_date from start_date + cadence using SQLite date functions.
/// Returns None for 'custom' cadence (user must supply end_date).
fn compute_end_date(
    conn: &Connection,
    start_date: &str,
    cadence: &str,
) -> Result<Option<String>, EncryptedDbError> {
    let modifier = match cadence {
        "monthly" => "+1 month",
        "biweekly" => "+14 days",
        "weekly" => "+7 days",
        "daily" => "+1 day",
        "yearly" => "+1 year",
        "custom" => return Ok(None),
        _ => {
            return Err(EncryptedDbError::DatabaseError(format!(
                "Unknown cadence: {}",
                cadence
            )))
        }
    };

    // For daily cadence, end_date equals start_date (single day period)
    if cadence == "daily" {
        return Ok(Some(start_date.to_string()));
    }

    // Compute: start_date + cadence - 1 day (inclusive end)
    let sql = format!("SELECT date(?, '{}', '-1 day')", modifier);
    let end_date: String = conn
        .query_row(&sql, [start_date], |row| row.get(0))
        .map_err(|e| {
            EncryptedDbError::DatabaseError(format!(
                "Failed to compute end_date for start={}, cadence={}: {}",
                start_date, cadence, e
            ))
        })?;

    Ok(Some(end_date))
}

/// Creates a new period budget instance from a template.
///
/// This command:
/// 1. Validates the template exists and reads its cadence/currency
/// 2. Computes end_date from cadence (unless custom)
/// 3. Creates the period_budget_instances row
/// 4. Copies all template_categories into budget_instance_categories
/// 5. Auto-creates 'received' line items for categories with allocated_amount > 0
///    (with is_template_default=1, per DATA_MODEL.md)
#[tauri::command]
pub fn create_period_from_template(
    args: CreatePeriodFromTemplateArgs,
    db_state: State<DbState>,
) -> Result<CreatePeriodResult, String> {
    create_period_from_template_internal(&args, &db_state).map_err(|e| e.to_string())
}

fn create_period_from_template_internal(
    args: &CreatePeriodFromTemplateArgs,
    db_state: &State<DbState>,
) -> Result<CreatePeriodResult, EncryptedDbError> {
    let conn_guard = db_state
        .conn
        .lock()
        .map_err(|_| EncryptedDbError::LockError)?;

    let conn = conn_guard
        .as_ref()
        .ok_or(EncryptedDbError::NotOpen)?;

    create_period_from_template_with_conn(args, conn)
}

/// Core logic for creating a period from a template (uses a raw Connection).
/// Separated to allow direct testing without State<DbState>.
fn create_period_from_template_with_conn(
    args: &CreatePeriodFromTemplateArgs,
    conn: &Connection,
) -> Result<CreatePeriodResult, EncryptedDbError> {
    // 1. Validate template exists and fetch its data
    let (cadence, default_currency): (String, String) = conn
        .query_row(
            "SELECT cadence, default_currency FROM budget_templates WHERE template_id = ?",
            [args.template_id],
            |row| Ok((row.get(0)?, row.get(1)?)),
        )
        .map_err(|e| match e {
            rusqlite::Error::QueryReturnedNoRows => EncryptedDbError::DatabaseError(format!(
                "Template {} not found.",
                args.template_id
            )),
            other => EncryptedDbError::from(other),
        })?;

    // 2. Compute end_date (user-provided for custom, calculated otherwise)
    let end_date = match &args.end_date {
        Some(ed) => Some(ed.clone()),
        None => compute_end_date(conn, &args.start_date, &cadence)?,
    };

    // 3. Use a transaction for atomicity
    let tx = conn
        .unchecked_transaction()
        .map_err(|e| EncryptedDbError::DatabaseError(e.to_string()))?;

    // 4. Insert period_budget_instances row
    tx.execute(
        r#"
        INSERT INTO period_budget_instances (cadence, start_date, end_date, template_id, income_arrival_date)
        VALUES (?, ?, ?, ?, ?)
        "#,
        rusqlite::params![
            &cadence,
            &args.start_date,
            &end_date,
            args.template_id,
            &args.income_arrival_date,
        ],
    )?;
    let budget_instance_id = tx.last_insert_rowid();

    // 5. Fetch template categories (scoped to drop statement before commit)
    let template_cats: Vec<(i64, f64, i64)> = {
        let mut tc_stmt = tx.prepare(
            r#"
            SELECT
                tc.global_category_id,
                tc.allocated_amount,
                tc.sort_order
            FROM template_categories tc
            WHERE tc.template_id = ?
            ORDER BY tc.sort_order, tc.template_category_id
            "#,
        )?;

        let result = tc_stmt
            .query_map([args.template_id], |row| {
                Ok((row.get(0)?, row.get(1)?, row.get(2)?))
            })?
            .collect::<Result<Vec<_>, _>>()?;
        result
    };

    // 6. Copy template categories → budget_instance_categories
    let mut categories_created: usize = 0;
    let mut default_line_items_created: usize = 0;

    for (global_category_id, allocated_amount, sort_order) in &template_cats {
        tx.execute(
            r#"
            INSERT INTO budget_instance_categories
                (budget_instance_id, global_category_id, default_amount, default_currency, sort_order)
            VALUES (?, ?, ?, ?, ?)
            "#,
            rusqlite::params![
                budget_instance_id,
                global_category_id,
                allocated_amount,
                &default_currency,
                sort_order,
            ],
        )?;
        let bic_id = tx.last_insert_rowid();
        categories_created += 1;

        // 7. Auto-create template-default received line item if allocated_amount > 0
        if *allocated_amount > 0.0 {
            tx.execute(
                r#"
                INSERT INTO category_line_items
                    (budget_instance_category_id, kind, occurred_at, description, amount, currency, is_template_default)
                VALUES (?, 'received', ?, 'Template default', ?, ?, 1)
                "#,
                rusqlite::params![
                    bic_id,
                    format!("{}T00:00:00", &args.start_date),
                    allocated_amount,
                    &default_currency,
                ],
            )?;
            default_line_items_created += 1;
        }
    }

    tx.commit()
        .map_err(|e| EncryptedDbError::DatabaseError(e.to_string()))?;

    // 8. Fetch the created period (with template name)
    let period = fetch_period_by_id(conn, budget_instance_id)?;

    Ok(CreatePeriodResult {
        period,
        categories_created,
        default_line_items_created,
    })
}

/// Lists all period budget instances, ordered by start_date DESC.
#[tauri::command]
pub fn list_periods(db_state: State<DbState>) -> Result<Vec<PeriodBudgetInstance>, String> {
    list_periods_internal(&db_state).map_err(|e| e.to_string())
}

fn list_periods_internal(
    db_state: &State<DbState>,
) -> Result<Vec<PeriodBudgetInstance>, EncryptedDbError> {
    let conn_guard = db_state
        .conn
        .lock()
        .map_err(|_| EncryptedDbError::LockError)?;

    let conn = conn_guard
        .as_ref()
        .ok_or(EncryptedDbError::NotOpen)?;

    let mut stmt = conn.prepare(
        r#"
        SELECT
            pbi.budget_instance_id,
            pbi.cadence,
            pbi.start_date,
            pbi.end_date,
            pbi.template_id,
            bt.name AS template_name,
            pbi.income_arrival_date,
            pbi.created_at
        FROM period_budget_instances pbi
        LEFT JOIN budget_templates bt ON bt.template_id = pbi.template_id
        ORDER BY pbi.start_date DESC, pbi.budget_instance_id DESC
        "#,
    )?;

    let periods = stmt
        .query_map([], |row| {
            Ok(PeriodBudgetInstance {
                budget_instance_id: row.get(0)?,
                cadence: row.get(1)?,
                start_date: row.get(2)?,
                end_date: row.get(3)?,
                template_id: row.get(4)?,
                template_name: row.get(5)?,
                income_arrival_date: row.get(6)?,
                created_at: row.get(7)?,
            })
        })?
        .collect::<Result<Vec<_>, _>>()?;

    Ok(periods)
}

/// Gets a single period budget instance by ID.
#[tauri::command]
pub fn get_period(
    budget_instance_id: i64,
    db_state: State<DbState>,
) -> Result<PeriodBudgetInstance, String> {
    get_period_internal(budget_instance_id, &db_state).map_err(|e| e.to_string())
}

fn get_period_internal(
    budget_instance_id: i64,
    db_state: &State<DbState>,
) -> Result<PeriodBudgetInstance, EncryptedDbError> {
    let conn_guard = db_state
        .conn
        .lock()
        .map_err(|_| EncryptedDbError::LockError)?;

    let conn = conn_guard
        .as_ref()
        .ok_or(EncryptedDbError::NotOpen)?;

    fetch_period_by_id(conn, budget_instance_id)
}

/// Internal helper: fetch a single period by ID with joined template name.
fn fetch_period_by_id(
    conn: &Connection,
    budget_instance_id: i64,
) -> Result<PeriodBudgetInstance, EncryptedDbError> {
    conn.query_row(
        r#"
        SELECT
            pbi.budget_instance_id,
            pbi.cadence,
            pbi.start_date,
            pbi.end_date,
            pbi.template_id,
            bt.name AS template_name,
            pbi.income_arrival_date,
            pbi.created_at
        FROM period_budget_instances pbi
        LEFT JOIN budget_templates bt ON bt.template_id = pbi.template_id
        WHERE pbi.budget_instance_id = ?
        "#,
        [budget_instance_id],
        |row| {
            Ok(PeriodBudgetInstance {
                budget_instance_id: row.get(0)?,
                cadence: row.get(1)?,
                start_date: row.get(2)?,
                end_date: row.get(3)?,
                template_id: row.get(4)?,
                template_name: row.get(5)?,
                income_arrival_date: row.get(6)?,
                created_at: row.get(7)?,
            })
        },
    )
    .map_err(|e| match e {
        rusqlite::Error::QueryReturnedNoRows => EncryptedDbError::DatabaseError(format!(
            "Period {} not found.",
            budget_instance_id
        )),
        other => EncryptedDbError::from(other),
    })
}

/// Deletes a period budget instance by ID.
/// CASCADE removes associated budget_instance_categories and category_line_items.
#[tauri::command]
pub fn delete_period(
    budget_instance_id: i64,
    db_state: State<DbState>,
) -> Result<(), String> {
    delete_period_internal(budget_instance_id, &db_state).map_err(|e| e.to_string())
}

fn delete_period_internal(
    budget_instance_id: i64,
    db_state: &State<DbState>,
) -> Result<(), EncryptedDbError> {
    let conn_guard = db_state
        .conn
        .lock()
        .map_err(|_| EncryptedDbError::LockError)?;

    let conn = conn_guard
        .as_ref()
        .ok_or(EncryptedDbError::NotOpen)?;

    let rows_deleted = conn.execute(
        "DELETE FROM period_budget_instances WHERE budget_instance_id = ?",
        [budget_instance_id],
    )?;

    if rows_deleted == 0 {
        return Err(EncryptedDbError::DatabaseError(format!(
            "Period {} not found.",
            budget_instance_id
        )));
    }

    Ok(())
}

// ============================================================================
// UI Settings Commands
// ============================================================================

/// Gets a UI setting value by key. Returns `null` if the key does not exist.
#[tauri::command]
pub fn get_ui_setting(
    key: String,
    db_state: State<DbState>,
) -> Result<Option<String>, String> {
    get_ui_setting_internal(&key, &db_state).map_err(|e| e.to_string())
}

fn get_ui_setting_internal(
    key: &str,
    db_state: &State<DbState>,
) -> Result<Option<String>, EncryptedDbError> {
    let conn_guard = db_state
        .conn
        .lock()
        .map_err(|_| EncryptedDbError::LockError)?;

    let conn = conn_guard
        .as_ref()
        .ok_or(EncryptedDbError::NotOpen)?;

    let result = conn.query_row(
        "SELECT value FROM ui_settings WHERE key = ?",
        [key],
        |row| row.get::<_, String>(0),
    );

    match result {
        Ok(value) => Ok(Some(value)),
        Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
        Err(e) => Err(EncryptedDbError::from(e)),
    }
}

/// Sets a UI setting value by key (upsert). Creates the key if it doesn't exist.
#[tauri::command]
pub fn set_ui_setting(
    key: String,
    value: String,
    db_state: State<DbState>,
) -> Result<(), String> {
    set_ui_setting_internal(&key, &value, &db_state).map_err(|e| e.to_string())
}

fn set_ui_setting_internal(
    key: &str,
    value: &str,
    db_state: &State<DbState>,
) -> Result<(), EncryptedDbError> {
    let conn_guard = db_state
        .conn
        .lock()
        .map_err(|_| EncryptedDbError::LockError)?;

    let conn = conn_guard
        .as_ref()
        .ok_or(EncryptedDbError::NotOpen)?;

    conn.execute(
        "INSERT OR REPLACE INTO ui_settings (key, value, updated_at) VALUES (?, ?, datetime('now'))",
        rusqlite::params![key, value],
    )?;

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

    /// Debug helper: Extract pure SQLCipher database and print the raw hex key
    /// for use with DB Browser for SQLite.
    ///
    /// Run with: cargo test extract_db_for_browser -- --ignored --nocapture
    #[test]
    #[ignore]
    fn extract_db_for_browser() {
        use std::io::{Read, Seek, SeekFrom};

        // ============================================================
        // CHANGE THESE VALUES TO YOUR FILE AND PASSWORD
        // ============================================================
        let financedb_path = r"C:\Users\k1ker\Downloads\my-budget.financedb";
        let output_db_path = r"C:\Users\k1ker\Downloads\extracted.db";
        let password = "12jjKHoZH2Aq2%";
        // ============================================================

        println!("\n========================================");
        println!("DB EXTRACTION FOR SQLITE BROWSER");
        println!("========================================\n");

        // Read header
        let mut file = std::fs::File::open(financedb_path)
            .expect(&format!("Cannot open file: {}", financedb_path));
        let header = crate::file_header::FileHeader::read_from(&mut file)
            .expect("Cannot read header - is this a valid .financedb file?");

        println!("File header info:");
        println!("  Version: {}", header.version);
        println!("  Header size: {} bytes", header.size());
        println!("  Password hint: {:?}", header.password_hint);
        println!();

        // Derive key using Argon2id
        let key = crate::kdf::derive_key(password, &header.salt)
            .expect("Key derivation failed");
        let key_hex = crate::kdf::key_to_hex(&key);

        println!("========================================");
        println!("RAW HEX KEY FOR DB BROWSER:");
        println!("0x{}", key_hex);
        println!("========================================\n");

        // Extract database portion (skip header)
        let header_size = header.size();
        file.seek(SeekFrom::Start(header_size as u64)).unwrap();
        let mut db_bytes = Vec::new();
        file.read_to_end(&mut db_bytes).unwrap();

        println!("Database size: {} bytes", db_bytes.len());

        // Write pure SQLCipher database
        std::fs::write(output_db_path, &db_bytes)
            .expect(&format!("Cannot write to: {}", output_db_path));

        println!("Extracted database saved to: {}\n", output_db_path);

        println!("========================================");
        println!("DB BROWSER FOR SQLITE SETTINGS:");
        println!("========================================");
        println!("1. Open the EXTRACTED file: {}", output_db_path);
        println!("2. In the encryption dialog:");
        println!("   - Change dropdown from 'Passphrase' to 'Raw Key'");
        println!("   - Paste: 0x{}", key_hex);
        println!("   - Select: 'SQLCipher 4-Standardwerte'");
        println!("3. Click OK");
        println!("========================================\n");
    }

    // ========================================================================
    // Grid Data / Rollup Query Tests
    // ========================================================================

    /// Helper to set up a test database with schema for grid data tests
    fn setup_grid_test_db() -> Connection {
        let temp_file = NamedTempFile::new().unwrap();
        let path = temp_file.path();

        // Create encrypted DB with test key
        let key_hex = "d".repeat(64);
        let conn = create_sqlcipher_db(path, &key_hex).unwrap();

        // Don't drop temp_file yet - keep it alive
        std::mem::forget(temp_file);

        conn
    }

    /// Helper to insert test data for grid tests
    fn insert_grid_test_data(conn: &Connection) -> (i64, i64, i64) {
        // Insert global category
        conn.execute(
            "INSERT INTO global_categories (name, description) VALUES ('Groceries', 'Food expenses')",
            [],
        )
        .unwrap();
        let global_cat_id: i64 = conn.last_insert_rowid();

        // Insert budget template
        conn.execute(
            "INSERT INTO budget_templates (name, cadence, default_currency) VALUES ('Monthly Budget', 'monthly', 'CHF')",
            [],
        )
        .unwrap();
        let template_id: i64 = conn.last_insert_rowid();

        // Insert period budget instance
        conn.execute(
            "INSERT INTO period_budget_instances (cadence, start_date, template_id) VALUES ('monthly', '2026-02-01', ?)",
            [template_id],
        )
        .unwrap();
        let budget_instance_id: i64 = conn.last_insert_rowid();

        // Insert budget instance category
        conn.execute(
            "INSERT INTO budget_instance_categories (budget_instance_id, global_category_id, default_amount, default_currency, sort_order) VALUES (?, ?, 500.00, 'CHF', 0)",
            [budget_instance_id, global_cat_id],
        )
        .unwrap();
        let bic_id: i64 = conn.last_insert_rowid();

        (budget_instance_id, bic_id, global_cat_id)
    }

    #[test]
    fn test_grid_data_empty_instance() {
        let conn = setup_grid_test_db();

        // Insert budget instance with no categories
        conn.execute(
            "INSERT INTO period_budget_instances (cadence, start_date) VALUES ('monthly', '2026-02-01')",
            [],
        )
        .unwrap();
        let budget_instance_id: i64 = conn.last_insert_rowid();

        // Query grid data directly (can't use State<DbState> in unit tests)
        let mut stmt = conn.prepare(
            r#"
            SELECT
                bic.budget_instance_category_id,
                bic.global_category_id,
                gc.name AS category_name,
                bic.default_amount,
                bic.default_currency,
                bic.sort_order,
                COALESCE(SUM(CASE WHEN li.kind = 'received' THEN li.amount ELSE 0 END), 0) AS received_total,
                COALESCE(SUM(CASE WHEN li.kind = 'spent' THEN li.amount ELSE 0 END), 0) AS spent_total
            FROM budget_instance_categories bic
            JOIN global_categories gc ON gc.global_category_id = bic.global_category_id
            LEFT JOIN category_line_items li
                ON li.budget_instance_category_id = bic.budget_instance_category_id
                AND li.deleted_at IS NULL
            WHERE bic.budget_instance_id = ?
            GROUP BY bic.budget_instance_category_id
            ORDER BY bic.sort_order, bic.budget_instance_category_id
            "#,
        ).unwrap();

        let rows: Vec<i64> = stmt
            .query_map([budget_instance_id], |row| row.get(0))
            .unwrap()
            .filter_map(|r| r.ok())
            .collect();

        assert!(rows.is_empty(), "Empty instance should have no category rows");
    }

    #[test]
    fn test_grid_data_no_line_items() {
        let conn = setup_grid_test_db();
        let (budget_instance_id, _bic_id, _global_cat_id) = insert_grid_test_data(&conn);

        // Query without any line items
        let mut stmt = conn.prepare(
            r#"
            SELECT
                bic.budget_instance_category_id,
                bic.default_amount,
                COALESCE(SUM(CASE WHEN li.kind = 'received' THEN li.amount ELSE 0 END), 0) AS received_total,
                COALESCE(SUM(CASE WHEN li.kind = 'spent' THEN li.amount ELSE 0 END), 0) AS spent_total
            FROM budget_instance_categories bic
            JOIN global_categories gc ON gc.global_category_id = bic.global_category_id
            LEFT JOIN category_line_items li
                ON li.budget_instance_category_id = bic.budget_instance_category_id
                AND li.deleted_at IS NULL
            WHERE bic.budget_instance_id = ?
            GROUP BY bic.budget_instance_category_id
            "#,
        ).unwrap();

        let row = stmt.query_row([budget_instance_id], |row| {
            Ok((
                row.get::<_, f64>(1)?,
                row.get::<_, f64>(2)?,
                row.get::<_, f64>(3)?,
            ))
        }).unwrap();

        let (default_amount, received_total, spent_total) = row;
        assert!((default_amount - 500.0).abs() < 0.01, "Default amount should be 500");
        assert!((received_total - 0.0).abs() < 0.01, "Received total should be 0");
        assert!((spent_total - 0.0).abs() < 0.01, "Spent total should be 0");
    }

    #[test]
    fn test_grid_data_received_only() {
        let conn = setup_grid_test_db();
        let (budget_instance_id, bic_id, _global_cat_id) = insert_grid_test_data(&conn);

        // Insert received line items
        conn.execute(
            "INSERT INTO category_line_items (budget_instance_category_id, kind, occurred_at, amount, currency) VALUES (?, 'received', '2026-02-01T00:00:00', 1000.00, 'CHF')",
            [bic_id],
        ).unwrap();
        conn.execute(
            "INSERT INTO category_line_items (budget_instance_category_id, kind, occurred_at, amount, currency) VALUES (?, 'received', '2026-02-05T00:00:00', 500.00, 'CHF')",
            [bic_id],
        ).unwrap();

        // Query rollups
        let (received_total, spent_total): (f64, f64) = conn.query_row(
            r#"
            SELECT
                COALESCE(SUM(CASE WHEN li.kind = 'received' THEN li.amount ELSE 0 END), 0),
                COALESCE(SUM(CASE WHEN li.kind = 'spent' THEN li.amount ELSE 0 END), 0)
            FROM budget_instance_categories bic
            LEFT JOIN category_line_items li
                ON li.budget_instance_category_id = bic.budget_instance_category_id
                AND li.deleted_at IS NULL
            WHERE bic.budget_instance_id = ?
            GROUP BY bic.budget_instance_category_id
            "#,
            [budget_instance_id],
            |row| Ok((row.get(0)?, row.get(1)?)),
        ).unwrap();

        assert!((received_total - 1500.0).abs() < 0.01, "Received should be 1500");
        assert!((spent_total - 0.0).abs() < 0.01, "Spent should be 0");
    }

    #[test]
    fn test_grid_data_spent_only() {
        let conn = setup_grid_test_db();
        let (budget_instance_id, bic_id, _global_cat_id) = insert_grid_test_data(&conn);

        // Insert spent line items
        conn.execute(
            "INSERT INTO category_line_items (budget_instance_category_id, kind, occurred_at, amount, currency) VALUES (?, 'spent', '2026-02-02T10:30:00', 50.00, 'CHF')",
            [bic_id],
        ).unwrap();
        conn.execute(
            "INSERT INTO category_line_items (budget_instance_category_id, kind, occurred_at, amount, currency) VALUES (?, 'spent', '2026-02-03T14:00:00', 75.50, 'CHF')",
            [bic_id],
        ).unwrap();

        // Query rollups
        let (received_total, spent_total): (f64, f64) = conn.query_row(
            r#"
            SELECT
                COALESCE(SUM(CASE WHEN li.kind = 'received' THEN li.amount ELSE 0 END), 0),
                COALESCE(SUM(CASE WHEN li.kind = 'spent' THEN li.amount ELSE 0 END), 0)
            FROM budget_instance_categories bic
            LEFT JOIN category_line_items li
                ON li.budget_instance_category_id = bic.budget_instance_category_id
                AND li.deleted_at IS NULL
            WHERE bic.budget_instance_id = ?
            GROUP BY bic.budget_instance_category_id
            "#,
            [budget_instance_id],
            |row| Ok((row.get(0)?, row.get(1)?)),
        ).unwrap();

        assert!((received_total - 0.0).abs() < 0.01, "Received should be 0");
        assert!((spent_total - 125.50).abs() < 0.01, "Spent should be 125.50");
    }

    #[test]
    fn test_grid_data_mixed_received_and_spent() {
        let conn = setup_grid_test_db();
        let (budget_instance_id, bic_id, _global_cat_id) = insert_grid_test_data(&conn);

        // Insert received
        conn.execute(
            "INSERT INTO category_line_items (budget_instance_category_id, kind, occurred_at, amount, currency) VALUES (?, 'received', '2026-02-01T00:00:00', 1000.00, 'CHF')",
            [bic_id],
        ).unwrap();

        // Insert spent
        conn.execute(
            "INSERT INTO category_line_items (budget_instance_category_id, kind, occurred_at, amount, currency) VALUES (?, 'spent', '2026-02-02T10:30:00', 250.00, 'CHF')",
            [bic_id],
        ).unwrap();
        conn.execute(
            "INSERT INTO category_line_items (budget_instance_category_id, kind, occurred_at, amount, currency) VALUES (?, 'spent', '2026-02-03T14:00:00', 100.00, 'CHF')",
            [bic_id],
        ).unwrap();

        // Query rollups
        let (received_total, spent_total): (f64, f64) = conn.query_row(
            r#"
            SELECT
                COALESCE(SUM(CASE WHEN li.kind = 'received' THEN li.amount ELSE 0 END), 0),
                COALESCE(SUM(CASE WHEN li.kind = 'spent' THEN li.amount ELSE 0 END), 0)
            FROM budget_instance_categories bic
            LEFT JOIN category_line_items li
                ON li.budget_instance_category_id = bic.budget_instance_category_id
                AND li.deleted_at IS NULL
            WHERE bic.budget_instance_id = ?
            GROUP BY bic.budget_instance_category_id
            "#,
            [budget_instance_id],
            |row| Ok((row.get(0)?, row.get(1)?)),
        ).unwrap();

        assert!((received_total - 1000.0).abs() < 0.01, "Received should be 1000");
        assert!((spent_total - 350.0).abs() < 0.01, "Spent should be 350");

        let remaining = received_total - spent_total;
        assert!((remaining - 650.0).abs() < 0.01, "Remaining should be 650");
    }

    #[test]
    fn test_grid_data_excludes_deleted_items() {
        let conn = setup_grid_test_db();
        let (budget_instance_id, bic_id, _global_cat_id) = insert_grid_test_data(&conn);

        // Insert received (not deleted)
        conn.execute(
            "INSERT INTO category_line_items (budget_instance_category_id, kind, occurred_at, amount, currency) VALUES (?, 'received', '2026-02-01T00:00:00', 1000.00, 'CHF')",
            [bic_id],
        ).unwrap();

        // Insert spent (not deleted)
        conn.execute(
            "INSERT INTO category_line_items (budget_instance_category_id, kind, occurred_at, amount, currency) VALUES (?, 'spent', '2026-02-02T10:30:00', 100.00, 'CHF')",
            [bic_id],
        ).unwrap();

        // Insert soft-deleted items (should be excluded)
        conn.execute(
            "INSERT INTO category_line_items (budget_instance_category_id, kind, occurred_at, amount, currency, deleted_at) VALUES (?, 'received', '2026-02-01T12:00:00', 500.00, 'CHF', datetime('now'))",
            [bic_id],
        ).unwrap();
        conn.execute(
            "INSERT INTO category_line_items (budget_instance_category_id, kind, occurred_at, amount, currency, deleted_at) VALUES (?, 'spent', '2026-02-03T14:00:00', 200.00, 'CHF', datetime('now'))",
            [bic_id],
        ).unwrap();

        // Query rollups
        let (received_total, spent_total): (f64, f64) = conn.query_row(
            r#"
            SELECT
                COALESCE(SUM(CASE WHEN li.kind = 'received' THEN li.amount ELSE 0 END), 0),
                COALESCE(SUM(CASE WHEN li.kind = 'spent' THEN li.amount ELSE 0 END), 0)
            FROM budget_instance_categories bic
            LEFT JOIN category_line_items li
                ON li.budget_instance_category_id = bic.budget_instance_category_id
                AND li.deleted_at IS NULL
            WHERE bic.budget_instance_id = ?
            GROUP BY bic.budget_instance_category_id
            "#,
            [budget_instance_id],
            |row| Ok((row.get(0)?, row.get(1)?)),
        ).unwrap();

        // Deleted items should NOT be counted
        assert!((received_total - 1000.0).abs() < 0.01, "Received should be 1000 (exclude deleted 500)");
        assert!((spent_total - 100.0).abs() < 0.01, "Spent should be 100 (exclude deleted 200)");
    }

    #[test]
    fn test_grid_data_multiple_categories() {
        let conn = setup_grid_test_db();

        // Insert multiple global categories
        conn.execute("INSERT INTO global_categories (name) VALUES ('Groceries')", []).unwrap();
        let cat1_id: i64 = conn.last_insert_rowid();
        conn.execute("INSERT INTO global_categories (name) VALUES ('Transport')", []).unwrap();
        let cat2_id: i64 = conn.last_insert_rowid();
        conn.execute("INSERT INTO global_categories (name) VALUES ('Entertainment')", []).unwrap();
        let cat3_id: i64 = conn.last_insert_rowid();

        // Insert budget instance
        conn.execute(
            "INSERT INTO period_budget_instances (cadence, start_date) VALUES ('monthly', '2026-02-01')",
            [],
        ).unwrap();
        let budget_instance_id: i64 = conn.last_insert_rowid();

        // Insert budget instance categories with different sort orders
        conn.execute(
            "INSERT INTO budget_instance_categories (budget_instance_id, global_category_id, default_amount, sort_order) VALUES (?, ?, 300.00, 2)",
            [budget_instance_id, cat1_id],
        ).unwrap();
        let bic1_id: i64 = conn.last_insert_rowid();

        conn.execute(
            "INSERT INTO budget_instance_categories (budget_instance_id, global_category_id, default_amount, sort_order) VALUES (?, ?, 150.00, 1)",
            [budget_instance_id, cat2_id],
        ).unwrap();
        let bic2_id: i64 = conn.last_insert_rowid();

        conn.execute(
            "INSERT INTO budget_instance_categories (budget_instance_id, global_category_id, default_amount, sort_order) VALUES (?, ?, 100.00, 3)",
            [budget_instance_id, cat3_id],
        ).unwrap();

        // Insert some line items
        conn.execute(
            "INSERT INTO category_line_items (budget_instance_category_id, kind, occurred_at, amount) VALUES (?, 'spent', '2026-02-02T00:00:00', 50.00)",
            [bic1_id],
        ).unwrap();
        conn.execute(
            "INSERT INTO category_line_items (budget_instance_category_id, kind, occurred_at, amount) VALUES (?, 'received', '2026-02-01T00:00:00', 200.00)",
            [bic2_id],
        ).unwrap();

        // Query all rows
        let mut stmt = conn.prepare(
            r#"
            SELECT
                gc.name,
                bic.sort_order,
                COALESCE(SUM(CASE WHEN li.kind = 'received' THEN li.amount ELSE 0 END), 0) AS received_total,
                COALESCE(SUM(CASE WHEN li.kind = 'spent' THEN li.amount ELSE 0 END), 0) AS spent_total
            FROM budget_instance_categories bic
            JOIN global_categories gc ON gc.global_category_id = bic.global_category_id
            LEFT JOIN category_line_items li
                ON li.budget_instance_category_id = bic.budget_instance_category_id
                AND li.deleted_at IS NULL
            WHERE bic.budget_instance_id = ?
            GROUP BY bic.budget_instance_category_id
            ORDER BY bic.sort_order, bic.budget_instance_category_id
            "#,
        ).unwrap();

        let rows: Vec<(String, i64, f64, f64)> = stmt
            .query_map([budget_instance_id], |row| {
                Ok((row.get(0)?, row.get(1)?, row.get(2)?, row.get(3)?))
            })
            .unwrap()
            .filter_map(|r| r.ok())
            .collect();

        assert_eq!(rows.len(), 3, "Should have 3 categories");

        // Should be sorted by sort_order: Transport (1), Groceries (2), Entertainment (3)
        assert_eq!(rows[0].0, "Transport");
        assert_eq!(rows[0].1, 1);
        assert!((rows[0].2 - 200.0).abs() < 0.01); // received

        assert_eq!(rows[1].0, "Groceries");
        assert_eq!(rows[1].1, 2);
        assert!((rows[1].3 - 50.0).abs() < 0.01); // spent

        assert_eq!(rows[2].0, "Entertainment");
        assert_eq!(rows[2].1, 3);
        assert!((rows[2].2 - 0.0).abs() < 0.01); // no line items
        assert!((rows[2].3 - 0.0).abs() < 0.01);
    }

    #[test]
    fn test_grid_data_category_name_from_global() {
        let conn = setup_grid_test_db();
        let (budget_instance_id, _bic_id, _global_cat_id) = insert_grid_test_data(&conn);

        // Query to verify category name comes from global_categories
        let category_name: String = conn.query_row(
            r#"
            SELECT gc.name
            FROM budget_instance_categories bic
            JOIN global_categories gc ON gc.global_category_id = bic.global_category_id
            WHERE bic.budget_instance_id = ?
            "#,
            [budget_instance_id],
            |row| row.get(0),
        ).unwrap();

        assert_eq!(category_name, "Groceries", "Category name should come from global_categories");
    }

    #[test]
    fn test_grid_data_received_dates_none_when_no_received() {
        let conn = setup_grid_test_db();
        let (budget_instance_id, bic_id, _global_cat_id) = insert_grid_test_data(&conn);

        // Insert only spent line items (no received)
        conn.execute(
            "INSERT INTO category_line_items (budget_instance_category_id, kind, occurred_at, amount, currency) VALUES (?, 'spent', '2026-02-02T10:30:00', 50.00, 'CHF')",
            [bic_id],
        ).unwrap();

        let (first_date, last_date): (Option<String>, Option<String>) = conn.query_row(
            r#"
            SELECT
                MIN(CASE WHEN li.kind = 'received' THEN DATE(li.occurred_at) END),
                MAX(CASE WHEN li.kind = 'received' THEN DATE(li.occurred_at) END)
            FROM budget_instance_categories bic
            LEFT JOIN category_line_items li
                ON li.budget_instance_category_id = bic.budget_instance_category_id
                AND li.deleted_at IS NULL
            WHERE bic.budget_instance_id = ?
            GROUP BY bic.budget_instance_category_id
            "#,
            [budget_instance_id],
            |row| Ok((row.get(0)?, row.get(1)?)),
        ).unwrap();

        assert!(first_date.is_none(), "first_received_date should be None when no received items");
        assert!(last_date.is_none(), "last_received_date should be None when no received items");
    }

    #[test]
    fn test_grid_data_received_dates_single() {
        let conn = setup_grid_test_db();
        let (budget_instance_id, bic_id, _global_cat_id) = insert_grid_test_data(&conn);

        // Insert one received line item
        conn.execute(
            "INSERT INTO category_line_items (budget_instance_category_id, kind, occurred_at, amount, currency) VALUES (?, 'received', '2026-02-10T09:00:00', 1000.00, 'CHF')",
            [bic_id],
        ).unwrap();

        let (first_date, last_date): (Option<String>, Option<String>) = conn.query_row(
            r#"
            SELECT
                MIN(CASE WHEN li.kind = 'received' THEN DATE(li.occurred_at) END),
                MAX(CASE WHEN li.kind = 'received' THEN DATE(li.occurred_at) END)
            FROM budget_instance_categories bic
            LEFT JOIN category_line_items li
                ON li.budget_instance_category_id = bic.budget_instance_category_id
                AND li.deleted_at IS NULL
            WHERE bic.budget_instance_id = ?
            GROUP BY bic.budget_instance_category_id
            "#,
            [budget_instance_id],
            |row| Ok((row.get(0)?, row.get(1)?)),
        ).unwrap();

        assert_eq!(first_date.as_deref(), Some("2026-02-10"), "first_received_date should be the single date");
        assert_eq!(last_date.as_deref(), Some("2026-02-10"), "last_received_date should equal first when single item");
    }

    #[test]
    fn test_grid_data_received_dates_range() {
        let conn = setup_grid_test_db();
        let (budget_instance_id, bic_id, _global_cat_id) = insert_grid_test_data(&conn);

        // Insert multiple received line items on different dates
        conn.execute(
            "INSERT INTO category_line_items (budget_instance_category_id, kind, occurred_at, amount, currency) VALUES (?, 'received', '2026-02-01T00:00:00', 500.00, 'CHF')",
            [bic_id],
        ).unwrap();
        conn.execute(
            "INSERT INTO category_line_items (budget_instance_category_id, kind, occurred_at, amount, currency) VALUES (?, 'received', '2026-02-15T12:00:00', 500.00, 'CHF')",
            [bic_id],
        ).unwrap();

        let (first_date, last_date): (Option<String>, Option<String>) = conn.query_row(
            r#"
            SELECT
                MIN(CASE WHEN li.kind = 'received' THEN DATE(li.occurred_at) END),
                MAX(CASE WHEN li.kind = 'received' THEN DATE(li.occurred_at) END)
            FROM budget_instance_categories bic
            LEFT JOIN category_line_items li
                ON li.budget_instance_category_id = bic.budget_instance_category_id
                AND li.deleted_at IS NULL
            WHERE bic.budget_instance_id = ?
            GROUP BY bic.budget_instance_category_id
            "#,
            [budget_instance_id],
            |row| Ok((row.get(0)?, row.get(1)?)),
        ).unwrap();

        assert_eq!(first_date.as_deref(), Some("2026-02-01"), "first_received_date should be earliest");
        assert_eq!(last_date.as_deref(), Some("2026-02-15"), "last_received_date should be latest");
    }

    // ========================================================================
    // Write-Back / Persistence Tests (TASK-3.1.1)
    // ========================================================================

    /// Test that write_back_to_file correctly writes modified DB back to the original file.
    /// This is the core fix for TASK-3.1.1: data not persisting after app restart.
    #[test]
    fn test_writeback_persists_mutations() {
        let password = "testPassword123!";
        let final_file = NamedTempFile::new().unwrap();
        let final_path = final_file.path().to_path_buf();
        let final_path_str = final_path.to_string_lossy().to_string();

        // ======== SESSION 1: Create DB, insert data, write back ========

        // Generate salt and derive key
        let salt = kdf::generate_salt();
        let (memory_cost, time_cost, parallelism) = kdf::get_kdf_params();
        let key = kdf::derive_key(password, &salt).unwrap();
        let key_hex = kdf::key_to_hex(&key);

        // Create header
        let header = FileHeader::new(salt, memory_cost, time_cost, parallelism, None).unwrap();

        // Create initial .financedb file
        let temp_dir_create = tempfile::tempdir().unwrap();
        let temp_db_path_create = temp_dir_create.path().join("temp.db");
        let temp_conn = create_sqlcipher_db(&temp_db_path_create, &key_hex).unwrap();
        drop(temp_conn);
        let db_bytes = fs::read(&temp_db_path_create).unwrap();
        {
            let mut output_file = File::create(&final_path).unwrap();
            header.write_to(&mut output_file).unwrap();
            output_file.write_all(&db_bytes).unwrap();
            output_file.sync_all().unwrap();
        }

        // Simulate open_and_store_connection: extract to temp, open
        let temp_dir_session = tempfile::tempdir().unwrap();
        let temp_db_path_session = temp_dir_session.path().join("opened.db");
        {
            let mut file = File::open(&final_path).unwrap();
            let read_header = FileHeader::read_from(&mut file).unwrap();
            file.seek(SeekFrom::Start(read_header.size() as u64)).unwrap();
            let mut extracted = Vec::new();
            file.read_to_end(&mut extracted).unwrap();
            fs::write(&temp_db_path_session, &extracted).unwrap();
        }

        // Open and mutate (add templates + categories, the exact TASK-3.1.1 scenario)
        let conn = open_sqlcipher_db(&temp_db_path_session, &key_hex).unwrap();
        conn.execute("INSERT INTO global_categories (name) VALUES ('Rent')", []).unwrap();
        conn.execute("INSERT INTO global_categories (name) VALUES ('Groceries')", []).unwrap();
        conn.execute(
            "INSERT INTO budget_templates (name, cadence, default_currency) VALUES ('Monthly', 'monthly', 'CHF')",
            [],
        ).unwrap();
        let template_id: i64 = conn.last_insert_rowid();
        conn.execute(
            "INSERT INTO template_categories (template_id, global_category_id, allocated_amount, category_type, sort_order) VALUES (?, 1, 1500.00, 'expense', 1)",
            [template_id],
        ).unwrap();

        // Drop connection (simulates close_db dropping the conn)
        drop(conn);

        // ======== WRITE BACK (this is the fix!) ========
        let file_info = OpenFileInfo {
            original_path: final_path_str.clone(),
            header: header.clone(),
            temp_db_path: temp_db_path_session.clone(),
            _temp_dir: temp_dir_session,
        };
        write_back_to_file(&file_info).unwrap();
        drop(file_info);

        // ======== SESSION 2: Reopen and verify data survived ========
        let temp_dir_reopen = tempfile::tempdir().unwrap();
        let temp_db_path_reopen = temp_dir_reopen.path().join("reopened.db");
        {
            let mut file = File::open(&final_path).unwrap();
            let read_header = FileHeader::read_from(&mut file).unwrap();
            file.seek(SeekFrom::Start(read_header.size() as u64)).unwrap();
            let mut extracted = Vec::new();
            file.read_to_end(&mut extracted).unwrap();
            fs::write(&temp_db_path_reopen, &extracted).unwrap();
        }

        let conn2 = open_sqlcipher_db(&temp_db_path_reopen, &key_hex).unwrap();
        migrations::run_pending(&conn2).unwrap();

        // Verify global categories persisted
        let cat_count: i64 = conn2
            .query_row("SELECT COUNT(*) FROM global_categories", [], |row| row.get(0))
            .unwrap();
        assert_eq!(cat_count, 2, "Both global categories should persist after write-back");

        let cat_name: String = conn2
            .query_row("SELECT name FROM global_categories WHERE global_category_id = 1", [], |row| row.get(0))
            .unwrap();
        assert_eq!(cat_name, "Rent", "First category name should match");

        // Verify template persisted
        let tmpl_count: i64 = conn2
            .query_row("SELECT COUNT(*) FROM budget_templates", [], |row| row.get(0))
            .unwrap();
        assert_eq!(tmpl_count, 1, "Template should persist after write-back");

        // Verify template-category link persisted
        let tc_count: i64 = conn2
            .query_row("SELECT COUNT(*) FROM template_categories", [], |row| row.get(0))
            .unwrap();
        assert_eq!(tc_count, 1, "Template-category link should persist after write-back");

        let alloc: f64 = conn2
            .query_row(
                "SELECT allocated_amount FROM template_categories WHERE template_category_id = 1",
                [],
                |row| row.get(0),
            )
            .unwrap();
        assert!((alloc - 1500.0).abs() < 0.01, "Allocated amount should persist");

        println!("[PASS] write_back_to_file correctly persists mutations across sessions");
    }

    /// Test that multiple write-backs (saves) work correctly.
    /// Simulates: create → mutate → save → mutate more → save → reopen → verify all data.
    #[test]
    fn test_multiple_saves_accumulate_data() {
        let password = "multiSaveTest!";
        let final_file = NamedTempFile::new().unwrap();
        let final_path = final_file.path().to_path_buf();
        let final_path_str = final_path.to_string_lossy().to_string();

        // Generate salt and derive key
        let salt = kdf::generate_salt();
        let (memory_cost, time_cost, parallelism) = kdf::get_kdf_params();
        let key = kdf::derive_key(password, &salt).unwrap();
        let key_hex = kdf::key_to_hex(&key);
        let header = FileHeader::new(salt, memory_cost, time_cost, parallelism, None).unwrap();

        // Create initial .financedb file
        let temp_dir_create = tempfile::tempdir().unwrap();
        let temp_db_path_create = temp_dir_create.path().join("temp.db");
        let temp_conn = create_sqlcipher_db(&temp_db_path_create, &key_hex).unwrap();
        drop(temp_conn);
        let db_bytes = fs::read(&temp_db_path_create).unwrap();
        {
            let mut f = File::create(&final_path).unwrap();
            header.write_to(&mut f).unwrap();
            f.write_all(&db_bytes).unwrap();
            f.sync_all().unwrap();
        }

        // Extract to temp (simulates open)
        let temp_dir_session = tempfile::tempdir().unwrap();
        let temp_db_path_session = temp_dir_session.path().join("opened.db");
        {
            let mut file = File::open(&final_path).unwrap();
            let rh = FileHeader::read_from(&mut file).unwrap();
            file.seek(SeekFrom::Start(rh.size() as u64)).unwrap();
            let mut extracted = Vec::new();
            file.read_to_end(&mut extracted).unwrap();
            fs::write(&temp_db_path_session, &extracted).unwrap();
        }

        let conn = open_sqlcipher_db(&temp_db_path_session, &key_hex).unwrap();

        // First mutation + save
        conn.execute("INSERT INTO global_categories (name) VALUES ('Food')", []).unwrap();

        let file_info = OpenFileInfo {
            original_path: final_path_str.clone(),
            header: header.clone(),
            temp_db_path: temp_db_path_session.clone(),
            _temp_dir: temp_dir_session,
        };
        write_back_to_file(&file_info).unwrap();

        // Second mutation + save (connection still alive)
        conn.execute("INSERT INTO global_categories (name) VALUES ('Transport')", []).unwrap();
        conn.execute("INSERT INTO global_categories (name) VALUES ('Entertainment')", []).unwrap();
        write_back_to_file(&file_info).unwrap();

        // Drop connection and file_info
        drop(conn);
        drop(file_info);

        // Reopen and verify ALL data survived
        let temp_dir_reopen = tempfile::tempdir().unwrap();
        let temp_db_path_reopen = temp_dir_reopen.path().join("reopened.db");
        {
            let mut file = File::open(&final_path).unwrap();
            let rh = FileHeader::read_from(&mut file).unwrap();
            file.seek(SeekFrom::Start(rh.size() as u64)).unwrap();
            let mut extracted = Vec::new();
            file.read_to_end(&mut extracted).unwrap();
            fs::write(&temp_db_path_reopen, &extracted).unwrap();
        }

        let conn2 = open_sqlcipher_db(&temp_db_path_reopen, &key_hex).unwrap();

        let cat_count: i64 = conn2
            .query_row("SELECT COUNT(*) FROM global_categories", [], |row| row.get(0))
            .unwrap();
        assert_eq!(cat_count, 3, "All 3 categories should persist across multiple saves");

        println!("[PASS] Multiple write-backs correctly accumulate data");
    }

    // ========================================================================
    // Period Budget Instance Tests (TASK-3.2)
    // ========================================================================

    /// Helper to set up a test database with a template and categories for period tests.
    /// Returns (conn, template_id, global_cat_ids).
    fn setup_period_test_db() -> (Connection, i64, Vec<i64>) {
        let conn = setup_grid_test_db();

        // Insert global categories
        conn.execute(
            "INSERT INTO global_categories (name) VALUES ('Rent')",
            [],
        )
        .unwrap();
        let cat1 = conn.last_insert_rowid();

        conn.execute(
            "INSERT INTO global_categories (name) VALUES ('Groceries')",
            [],
        )
        .unwrap();
        let cat2 = conn.last_insert_rowid();

        conn.execute(
            "INSERT INTO global_categories (name) VALUES ('Transport')",
            [],
        )
        .unwrap();
        let cat3 = conn.last_insert_rowid();

        // Insert template
        conn.execute(
            "INSERT INTO budget_templates (name, cadence, default_currency) VALUES ('Monthly Budget', 'monthly', 'CHF')",
            [],
        )
        .unwrap();
        let template_id = conn.last_insert_rowid();

        // Insert template categories with amounts
        conn.execute(
            "INSERT INTO template_categories (template_id, global_category_id, allocated_amount, category_type, sort_order) VALUES (?, ?, 1500.00, 'expense', 1)",
            rusqlite::params![template_id, cat1],
        )
        .unwrap();
        conn.execute(
            "INSERT INTO template_categories (template_id, global_category_id, allocated_amount, category_type, sort_order) VALUES (?, ?, 500.00, 'expense', 2)",
            rusqlite::params![template_id, cat2],
        )
        .unwrap();
        conn.execute(
            "INSERT INTO template_categories (template_id, global_category_id, allocated_amount, category_type, sort_order) VALUES (?, ?, 0.00, 'expense', 3)",
            rusqlite::params![template_id, cat3],
        )
        .unwrap();

        (conn, template_id, vec![cat1, cat2, cat3])
    }

    #[test]
    fn test_create_period_from_template_basic() {
        let (conn, template_id, _cats) = setup_period_test_db();

        let args = CreatePeriodFromTemplateArgs {
            template_id,
            start_date: "2026-03-01".to_string(),
            end_date: None,
            income_arrival_date: None,
        };

        let result = create_period_from_template_with_conn(&args, &conn).unwrap();

        // Verify period was created
        assert!(result.period.budget_instance_id > 0);
        assert_eq!(result.period.cadence, "monthly");
        assert_eq!(result.period.start_date, "2026-03-01");
        // Monthly: start + 1 month - 1 day = 2026-03-31
        assert_eq!(result.period.end_date, Some("2026-03-31".to_string()));
        assert_eq!(result.period.template_id, Some(template_id));
        assert_eq!(result.period.template_name, Some("Monthly Budget".to_string()));
        assert!(result.period.income_arrival_date.is_none());

        // Verify period exists in DB
        let count: i64 = conn
            .query_row(
                "SELECT COUNT(*) FROM period_budget_instances WHERE budget_instance_id = ?",
                [result.period.budget_instance_id],
                |row| row.get(0),
            )
            .unwrap();
        assert_eq!(count, 1);
    }

    #[test]
    fn test_create_period_copies_all_categories() {
        let (conn, template_id, cats) = setup_period_test_db();

        let args = CreatePeriodFromTemplateArgs {
            template_id,
            start_date: "2026-03-01".to_string(),
            end_date: None,
            income_arrival_date: None,
        };

        let result = create_period_from_template_with_conn(&args, &conn).unwrap();

        // All 3 template categories should be copied
        assert_eq!(result.categories_created, 3);

        // Verify budget_instance_categories rows
        let bic_count: i64 = conn
            .query_row(
                "SELECT COUNT(*) FROM budget_instance_categories WHERE budget_instance_id = ?",
                [result.period.budget_instance_id],
                |row| row.get(0),
            )
            .unwrap();
        assert_eq!(bic_count, 3);

        // Verify amounts and global_category_ids match template
        let mut stmt = conn
            .prepare(
                r#"
                SELECT bic.global_category_id, bic.default_amount, bic.default_currency, bic.sort_order
                FROM budget_instance_categories bic
                WHERE bic.budget_instance_id = ?
                ORDER BY bic.sort_order
                "#,
            )
            .unwrap();

        let rows: Vec<(i64, f64, String, i64)> = stmt
            .query_map([result.period.budget_instance_id], |row| {
                Ok((row.get(0)?, row.get(1)?, row.get(2)?, row.get(3)?))
            })
            .unwrap()
            .filter_map(|r| r.ok())
            .collect();

        assert_eq!(rows.len(), 3);
        // Rent: 1500 CHF, sort 1
        assert_eq!(rows[0].0, cats[0]);
        assert!((rows[0].1 - 1500.0).abs() < 0.01);
        assert_eq!(rows[0].2, "CHF");
        assert_eq!(rows[0].3, 1);
        // Groceries: 500 CHF, sort 2
        assert_eq!(rows[1].0, cats[1]);
        assert!((rows[1].1 - 500.0).abs() < 0.01);
        // Transport: 0 CHF, sort 3
        assert_eq!(rows[2].0, cats[2]);
        assert!((rows[2].1 - 0.0).abs() < 0.01);
    }

    #[test]
    fn test_create_period_creates_template_default_line_items() {
        let (conn, template_id, _cats) = setup_period_test_db();

        let args = CreatePeriodFromTemplateArgs {
            template_id,
            start_date: "2026-03-01".to_string(),
            end_date: None,
            income_arrival_date: None,
        };

        let result = create_period_from_template_with_conn(&args, &conn).unwrap();

        // Only 2 categories have allocated_amount > 0 (Rent=1500, Groceries=500)
        // Transport has 0 → no line item
        assert_eq!(result.default_line_items_created, 2);

        // Verify line items in DB
        let li_count: i64 = conn
            .query_row(
                r#"
                SELECT COUNT(*) FROM category_line_items li
                JOIN budget_instance_categories bic ON bic.budget_instance_category_id = li.budget_instance_category_id
                WHERE bic.budget_instance_id = ?
                "#,
                [result.period.budget_instance_id],
                |row| row.get(0),
            )
            .unwrap();
        assert_eq!(li_count, 2);

        // Verify template defaults have correct properties
        let mut stmt = conn
            .prepare(
                r#"
                SELECT li.kind, li.occurred_at, li.description, li.amount, li.currency, li.is_template_default
                FROM category_line_items li
                JOIN budget_instance_categories bic ON bic.budget_instance_category_id = li.budget_instance_category_id
                WHERE bic.budget_instance_id = ?
                ORDER BY li.amount DESC
                "#,
            )
            .unwrap();

        let items: Vec<(String, String, String, f64, String, i64)> = stmt
            .query_map([result.period.budget_instance_id], |row| {
                Ok((
                    row.get(0)?,
                    row.get(1)?,
                    row.get(2)?,
                    row.get(3)?,
                    row.get(4)?,
                    row.get(5)?,
                ))
            })
            .unwrap()
            .filter_map(|r| r.ok())
            .collect();

        assert_eq!(items.len(), 2);

        // Rent: 1500 CHF
        assert_eq!(items[0].0, "received");
        assert_eq!(items[0].1, "2026-03-01T00:00:00");
        assert_eq!(items[0].2, "Template default");
        assert!((items[0].3 - 1500.0).abs() < 0.01);
        assert_eq!(items[0].4, "CHF");
        assert_eq!(items[0].5, 1); // is_template_default = true

        // Groceries: 500 CHF
        assert_eq!(items[1].0, "received");
        assert!((items[1].3 - 500.0).abs() < 0.01);
        assert_eq!(items[1].5, 1);
    }

    #[test]
    fn test_create_period_empty_template() {
        let conn = setup_grid_test_db();

        // Create a template with NO categories
        conn.execute(
            "INSERT INTO budget_templates (name, cadence, default_currency) VALUES ('Empty Template', 'weekly', 'EUR')",
            [],
        )
        .unwrap();
        let template_id = conn.last_insert_rowid();

        let args = CreatePeriodFromTemplateArgs {
            template_id,
            start_date: "2026-03-01".to_string(),
            end_date: None,
            income_arrival_date: None,
        };

        let result = create_period_from_template_with_conn(&args, &conn).unwrap();

        assert_eq!(result.categories_created, 0);
        assert_eq!(result.default_line_items_created, 0);
        assert_eq!(result.period.cadence, "weekly");
        // Weekly: start + 7 days - 1 day = 2026-03-07
        assert_eq!(result.period.end_date, Some("2026-03-07".to_string()));
    }

    #[test]
    fn test_create_period_template_not_found() {
        let conn = setup_grid_test_db();

        let args = CreatePeriodFromTemplateArgs {
            template_id: 999,
            start_date: "2026-03-01".to_string(),
            end_date: None,
            income_arrival_date: None,
        };

        let result = create_period_from_template_with_conn(&args, &conn);
        assert!(result.is_err());
        let err = result.unwrap_err().to_string();
        assert!(
            err.contains("Template 999 not found"),
            "Error should mention template not found, got: {}",
            err
        );
    }

    #[test]
    fn test_create_period_end_date_computation() {
        let conn = setup_grid_test_db();

        // Create templates with various cadences
        let cadences = vec![
            ("monthly", "2026-03-01", "2026-03-31"),
            ("monthly", "2026-02-01", "2026-02-28"), // February (non-leap year)
            ("weekly", "2026-03-01", "2026-03-07"),
            ("biweekly", "2026-03-01", "2026-03-14"),
            ("yearly", "2026-01-01", "2026-12-31"),
            ("daily", "2026-03-15", "2026-03-15"), // daily = single day
        ];

        for (cadence, start, expected_end) in &cadences {
            conn.execute(
                "INSERT INTO budget_templates (name, cadence, default_currency) VALUES (?, ?, 'CHF')",
                rusqlite::params![format!("Test {}", cadence), cadence],
            )
            .unwrap();
            let template_id = conn.last_insert_rowid();

            let args = CreatePeriodFromTemplateArgs {
                template_id,
                start_date: start.to_string(),
                end_date: None,
                income_arrival_date: None,
            };

            let result = create_period_from_template_with_conn(&args, &conn).unwrap();
            assert_eq!(
                result.period.end_date,
                Some(expected_end.to_string()),
                "Cadence '{}' starting '{}' should end '{}'",
                cadence,
                start,
                expected_end
            );
        }
    }

    #[test]
    fn test_create_period_custom_cadence_with_user_end_date() {
        let conn = setup_grid_test_db();

        conn.execute(
            "INSERT INTO budget_templates (name, cadence, default_currency) VALUES ('Custom Template', 'custom', 'CHF')",
            [],
        )
        .unwrap();
        let template_id = conn.last_insert_rowid();

        let args = CreatePeriodFromTemplateArgs {
            template_id,
            start_date: "2026-03-01".to_string(),
            end_date: Some("2026-04-15".to_string()),
            income_arrival_date: Some("2026-03-05".to_string()),
        };

        let result = create_period_from_template_with_conn(&args, &conn).unwrap();
        assert_eq!(result.period.end_date, Some("2026-04-15".to_string()));
        assert_eq!(
            result.period.income_arrival_date,
            Some("2026-03-05".to_string())
        );
    }

    #[test]
    fn test_list_periods_ordering() {
        let (conn, template_id, _cats) = setup_period_test_db();

        // Create 3 periods with different start dates
        for start_date in &["2026-01-01", "2026-03-01", "2026-02-01"] {
            let args = CreatePeriodFromTemplateArgs {
                template_id,
                start_date: start_date.to_string(),
                end_date: None,
                income_arrival_date: None,
            };
            create_period_from_template_with_conn(&args, &conn).unwrap();
        }

        // List periods (query directly since we can't use State)
        let mut stmt = conn
            .prepare(
                r#"
                SELECT pbi.start_date
                FROM period_budget_instances pbi
                ORDER BY pbi.start_date DESC
                "#,
            )
            .unwrap();

        let dates: Vec<String> = stmt
            .query_map([], |row| row.get(0))
            .unwrap()
            .filter_map(|r| r.ok())
            .collect();

        assert_eq!(dates.len(), 3);
        // Should be sorted DESC: March, February, January
        assert_eq!(dates[0], "2026-03-01");
        assert_eq!(dates[1], "2026-02-01");
        assert_eq!(dates[2], "2026-01-01");
    }

    #[test]
    fn test_delete_period_cascades() {
        let (conn, template_id, _cats) = setup_period_test_db();

        // Enable foreign keys for CASCADE
        conn.execute("PRAGMA foreign_keys = ON", []).unwrap();

        let args = CreatePeriodFromTemplateArgs {
            template_id,
            start_date: "2026-03-01".to_string(),
            end_date: None,
            income_arrival_date: None,
        };

        let result = create_period_from_template_with_conn(&args, &conn).unwrap();
        let period_id = result.period.budget_instance_id;

        // Verify data exists before delete
        let bic_count_before: i64 = conn
            .query_row(
                "SELECT COUNT(*) FROM budget_instance_categories WHERE budget_instance_id = ?",
                [period_id],
                |row| row.get(0),
            )
            .unwrap();
        assert_eq!(bic_count_before, 3);

        let li_count_before: i64 = conn
            .query_row(
                r#"
                SELECT COUNT(*) FROM category_line_items li
                JOIN budget_instance_categories bic ON bic.budget_instance_category_id = li.budget_instance_category_id
                WHERE bic.budget_instance_id = ?
                "#,
                [period_id],
                |row| row.get(0),
            )
            .unwrap();
        assert_eq!(li_count_before, 2);

        // Delete the period
        conn.execute(
            "DELETE FROM period_budget_instances WHERE budget_instance_id = ?",
            [period_id],
        )
        .unwrap();

        // Verify cascade deleted categories
        let bic_count_after: i64 = conn
            .query_row(
                "SELECT COUNT(*) FROM budget_instance_categories WHERE budget_instance_id = ?",
                [period_id],
                |row| row.get(0),
            )
            .unwrap();
        assert_eq!(bic_count_after, 0, "Categories should be cascade-deleted");

        // Verify cascade deleted line items
        let li_count_after: i64 = conn
            .query_row("SELECT COUNT(*) FROM category_line_items", [], |row| {
                row.get(0)
            })
            .unwrap();
        assert_eq!(li_count_after, 0, "Line items should be cascade-deleted");
    }

    #[test]
    fn test_create_period_grid_data_integration() {
        let (conn, template_id, _cats) = setup_period_test_db();

        let args = CreatePeriodFromTemplateArgs {
            template_id,
            start_date: "2026-03-01".to_string(),
            end_date: None,
            income_arrival_date: None,
        };

        let result = create_period_from_template_with_conn(&args, &conn).unwrap();
        let budget_instance_id = result.period.budget_instance_id;

        // Verify get_grid_data query works on the period we just created
        let mut stmt = conn
            .prepare(
                r#"
                SELECT
                    bic.budget_instance_category_id,
                    bic.global_category_id,
                    gc.name AS category_name,
                    bic.default_amount,
                    bic.default_currency,
                    bic.sort_order,
                    COALESCE(SUM(CASE WHEN li.kind = 'received' THEN li.amount ELSE 0 END), 0) AS received_total,
                    COALESCE(SUM(CASE WHEN li.kind = 'spent' THEN li.amount ELSE 0 END), 0) AS spent_total
                FROM budget_instance_categories bic
                JOIN global_categories gc ON gc.global_category_id = bic.global_category_id
                LEFT JOIN category_line_items li
                    ON li.budget_instance_category_id = bic.budget_instance_category_id
                    AND li.deleted_at IS NULL
                WHERE bic.budget_instance_id = ?
                GROUP BY bic.budget_instance_category_id
                ORDER BY bic.sort_order, bic.budget_instance_category_id
                "#,
            )
            .unwrap();

        let rows: Vec<(String, f64, f64, f64)> = stmt
            .query_map([budget_instance_id], |row| {
                Ok((
                    row.get::<_, String>(2)?,   // category_name
                    row.get::<_, f64>(3)?,      // default_amount
                    row.get::<_, f64>(6)?,      // received_total
                    row.get::<_, f64>(7)?,      // spent_total
                ))
            })
            .unwrap()
            .filter_map(|r| r.ok())
            .collect();

        assert_eq!(rows.len(), 3);

        // Rent: default=1500, received=1500 (template default), spent=0
        assert_eq!(rows[0].0, "Rent");
        assert!((rows[0].1 - 1500.0).abs() < 0.01);
        assert!((rows[0].2 - 1500.0).abs() < 0.01);
        assert!((rows[0].3 - 0.0).abs() < 0.01);

        // Groceries: default=500, received=500 (template default), spent=0
        assert_eq!(rows[1].0, "Groceries");
        assert!((rows[1].1 - 500.0).abs() < 0.01);
        assert!((rows[1].2 - 500.0).abs() < 0.01);

        // Transport: default=0, received=0 (no template default for 0 amount), spent=0
        assert_eq!(rows[2].0, "Transport");
        assert!((rows[2].1 - 0.0).abs() < 0.01);
        assert!((rows[2].2 - 0.0).abs() < 0.01);
    }
}
