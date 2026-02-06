//! Database schema migrations for the finance file.
//!
//! This module handles schema versioning and migrations for the encrypted SQLite database.
//! Migrations run automatically on both create and open paths to ensure the database
//! is always at the current schema version.
//!
//! ## Version Tracking
//! Schema version is stored in `_meta` table with key `schema_version`.
//! Version 0 indicates a legacy database that needs migration.
//!
//! ## Migration Strategy
//! - All tables use `CREATE TABLE IF NOT EXISTS` for idempotency
//! - Each migration is wrapped in a transaction
//! - Schema version is only updated after successful migration

use rusqlite::Connection;
use thiserror::Error;

/// Current schema version. Increment when adding new migrations.
pub const CURRENT_SCHEMA_VERSION: u32 = 1;

/// Errors that can occur during migrations.
#[derive(Debug, Error)]
pub enum MigrationError {
    #[error("Migration failed: {0}")]
    MigrationFailed(String),

    #[error("Database error during migration: {0}")]
    DatabaseError(String),

    #[error("Unknown migration version: {0}")]
    UnknownVersion(u32),
}

impl From<rusqlite::Error> for MigrationError {
    fn from(err: rusqlite::Error) -> Self {
        MigrationError::DatabaseError(err.to_string())
    }
}

/// Gets the current schema version from the database.
/// Returns 0 if `schema_version` key doesn't exist (legacy DB).
pub fn get_schema_version(conn: &Connection) -> Result<u32, MigrationError> {
    let result: Result<Option<String>, _> = conn.query_row(
        "SELECT value FROM _meta WHERE key = 'schema_version'",
        [],
        |row| row.get(0),
    );

    match result {
        Ok(Some(v)) => Ok(v.parse().unwrap_or(0)),
        Ok(None) => Ok(0),
        Err(rusqlite::Error::QueryReturnedNoRows) => Ok(0),
        Err(e) => Err(MigrationError::from(e)),
    }
}

/// Sets the schema version in the database.
/// Note: Also used in tests; migration SQL sets version directly for atomicity.
#[allow(dead_code)]
fn set_schema_version(conn: &Connection, version: u32) -> Result<(), MigrationError> {
    conn.execute(
        "INSERT OR REPLACE INTO _meta (key, value) VALUES ('schema_version', ?)",
        [version.to_string()],
    )?;
    Ok(())
}

/// Runs all pending migrations to bring the database to the current schema version.
///
/// This function is idempotent - it's safe to call multiple times.
/// Migrations that have already been applied (based on schema_version) are skipped.
pub fn run_pending(conn: &Connection) -> Result<(), MigrationError> {
    let current = get_schema_version(conn)?;

    if current >= CURRENT_SCHEMA_VERSION {
        // Already at current version, nothing to do
        return Ok(());
    }

    // Apply each migration in order
    for version in (current + 1)..=CURRENT_SCHEMA_VERSION {
        apply_migration(conn, version)?;
    }

    Ok(())
}

/// Applies the initial schema for a brand-new database.
///
/// Called during `create_encrypted_db` to set up all tables immediately.
/// This is essentially the same as running all migrations, but optimized
/// for new databases.
pub fn apply_initial_schema(conn: &Connection) -> Result<(), MigrationError> {
    // For new DBs, we apply all migrations at once
    run_pending(conn)
}

/// Applies a single migration by version number.
fn apply_migration(conn: &Connection, version: u32) -> Result<(), MigrationError> {
    match version {
        1 => apply_migration_v1(conn),
        _ => Err(MigrationError::UnknownVersion(version)),
    }
}

/// Migration v1: Create base MVP tables.
///
/// Tables created (in FK dependency order):
/// - global_categories
/// - budget_templates (with cadence column)
/// - template_categories
/// - period_budget_instances
fn apply_migration_v1(conn: &Connection) -> Result<(), MigrationError> {
    // Use a transaction for atomicity
    let tx = conn.unchecked_transaction()?;

    tx.execute_batch(MIGRATION_V1_SQL)?;

    // Set schema version
    tx.execute(
        "INSERT OR REPLACE INTO _meta (key, value) VALUES ('schema_version', '1')",
        [],
    )?;

    tx.commit()?;

    Ok(())
}

/// SQL for migration v1: Base MVP tables.
///
/// Creates all foundational tables needed for the budgeting app.
/// Uses IF NOT EXISTS for idempotency.
const MIGRATION_V1_SQL: &str = r#"
-- ============================================================================
-- Migration v1: Base MVP Tables
-- ============================================================================
-- Creates the foundational tables for the envelope budgeting system.
-- Tables are created in FK dependency order.
-- ============================================================================

-- Global categories: Reusable category definitions (unique per dataset)
CREATE TABLE IF NOT EXISTS global_categories (
    global_category_id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Budget templates: Define cadence and default category amounts
CREATE TABLE IF NOT EXISTS budget_templates (
    template_id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT,
    cadence TEXT NOT NULL DEFAULT 'monthly',
    default_currency TEXT NOT NULL DEFAULT 'CHF',
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Template categories: Link templates to global categories with default amounts
CREATE TABLE IF NOT EXISTS template_categories (
    template_category_id INTEGER PRIMARY KEY AUTOINCREMENT,
    template_id INTEGER NOT NULL,
    global_category_id INTEGER NOT NULL,
    allocated_amount REAL DEFAULT 0,
    category_type TEXT NOT NULL DEFAULT 'expense',
    sort_order INTEGER DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (template_id) REFERENCES budget_templates(template_id) ON DELETE CASCADE,
    FOREIGN KEY (global_category_id) REFERENCES global_categories(global_category_id) ON DELETE CASCADE,
    UNIQUE(template_id, global_category_id)
);

-- Period budget instances: One budget per explicit period (the main grid)
CREATE TABLE IF NOT EXISTS period_budget_instances (
    budget_instance_id INTEGER PRIMARY KEY AUTOINCREMENT,
    cadence TEXT NOT NULL,
    start_date TEXT NOT NULL,
    end_date TEXT,
    template_id INTEGER,
    income_arrival_date TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (template_id) REFERENCES budget_templates(template_id)
);

-- ============================================================================
-- Indexes for performance
-- ============================================================================

-- Period budget instances indexes
CREATE INDEX IF NOT EXISTS idx_budget_instances_start_date 
    ON period_budget_instances(start_date);
CREATE INDEX IF NOT EXISTS idx_budget_instances_cadence 
    ON period_budget_instances(cadence);
CREATE INDEX IF NOT EXISTS idx_period_budget_instances_template_id 
    ON period_budget_instances(template_id);

-- Template categories indexes
CREATE INDEX IF NOT EXISTS idx_template_categories_template_id 
    ON template_categories(template_id);
CREATE INDEX IF NOT EXISTS idx_template_categories_global_category_id 
    ON template_categories(global_category_id);

-- Global categories index (for name lookups)
CREATE INDEX IF NOT EXISTS idx_global_categories_name 
    ON global_categories(name);
"#;

#[cfg(test)]
mod tests {
    use super::*;
    use rusqlite::Connection;

    /// Helper to create a fresh in-memory database with _meta table
    fn create_test_db() -> Connection {
        let conn = Connection::open_in_memory().unwrap();
        conn.execute_batch(
            "CREATE TABLE IF NOT EXISTS _meta (
                key TEXT PRIMARY KEY,
                value TEXT NOT NULL
            );
            INSERT OR REPLACE INTO _meta (key, value) VALUES ('created_at', datetime('now'));
            INSERT OR REPLACE INTO _meta (key, value) VALUES ('format_version', '1');",
        )
        .unwrap();
        conn
    }

    #[test]
    fn test_get_schema_version_default() {
        let conn = create_test_db();
        // No schema_version key exists yet
        let version = get_schema_version(&conn).unwrap();
        assert_eq!(version, 0, "Default schema version should be 0");
    }

    #[test]
    fn test_set_and_get_schema_version() {
        let conn = create_test_db();

        set_schema_version(&conn, 1).unwrap();
        let version = get_schema_version(&conn).unwrap();
        assert_eq!(version, 1);

        set_schema_version(&conn, 5).unwrap();
        let version = get_schema_version(&conn).unwrap();
        assert_eq!(version, 5);
    }

    #[test]
    fn test_apply_initial_schema() {
        let conn = create_test_db();

        apply_initial_schema(&conn).unwrap();

        // Verify schema version was set
        let version = get_schema_version(&conn).unwrap();
        assert_eq!(version, CURRENT_SCHEMA_VERSION);

        // Verify tables exist
        let tables: Vec<String> = conn
            .prepare("SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name")
            .unwrap()
            .query_map([], |row| row.get(0))
            .unwrap()
            .filter_map(|r| r.ok())
            .collect();

        assert!(tables.contains(&"_meta".to_string()));
        assert!(tables.contains(&"global_categories".to_string()));
        assert!(tables.contains(&"budget_templates".to_string()));
        assert!(tables.contains(&"template_categories".to_string()));
        assert!(tables.contains(&"period_budget_instances".to_string()));
    }

    #[test]
    fn test_run_pending_idempotent() {
        let conn = create_test_db();

        // Run migrations first time
        run_pending(&conn).unwrap();
        let version1 = get_schema_version(&conn).unwrap();

        // Run migrations again - should be idempotent
        run_pending(&conn).unwrap();
        let version2 = get_schema_version(&conn).unwrap();

        assert_eq!(version1, version2);
        assert_eq!(version1, CURRENT_SCHEMA_VERSION);
    }

    #[test]
    fn test_migration_creates_indexes() {
        let conn = create_test_db();
        apply_initial_schema(&conn).unwrap();

        // Query for indexes
        let indexes: Vec<String> = conn
            .prepare("SELECT name FROM sqlite_master WHERE type = 'index' AND name LIKE 'idx_%' ORDER BY name")
            .unwrap()
            .query_map([], |row| row.get(0))
            .unwrap()
            .filter_map(|r| r.ok())
            .collect();

        // Check expected indexes exist
        assert!(indexes.contains(&"idx_budget_instances_start_date".to_string()));
        assert!(indexes.contains(&"idx_budget_instances_cadence".to_string()));
        assert!(indexes.contains(&"idx_period_budget_instances_template_id".to_string()));
        assert!(indexes.contains(&"idx_template_categories_template_id".to_string()));
        assert!(indexes.contains(&"idx_template_categories_global_category_id".to_string()));
        assert!(indexes.contains(&"idx_global_categories_name".to_string()));
    }

    #[test]
    fn test_migration_table_structure() {
        let conn = create_test_db();
        apply_initial_schema(&conn).unwrap();

        // Verify we can insert data into each table

        // Insert global category
        conn.execute(
            "INSERT INTO global_categories (name, description) VALUES ('Groceries', 'Food expenses')",
            [],
        )
        .unwrap();

        // Insert budget template
        conn.execute(
            "INSERT INTO budget_templates (name, cadence, default_currency) VALUES ('Monthly Budget', 'monthly', 'CHF')",
            [],
        )
        .unwrap();

        // Insert template category (FK references)
        conn.execute(
            "INSERT INTO template_categories (template_id, global_category_id, allocated_amount) VALUES (1, 1, 500.00)",
            [],
        )
        .unwrap();

        // Insert period budget instance
        conn.execute(
            "INSERT INTO period_budget_instances (cadence, start_date, template_id) VALUES ('monthly', '2026-02-01', 1)",
            [],
        )
        .unwrap();

        // Verify data was inserted
        let count: i64 = conn
            .query_row("SELECT COUNT(*) FROM period_budget_instances", [], |row| {
                row.get(0)
            })
            .unwrap();
        assert_eq!(count, 1);
    }

    #[test]
    fn test_already_migrated_db_skips() {
        let conn = create_test_db();

        // Manually set schema version to current
        set_schema_version(&conn, CURRENT_SCHEMA_VERSION).unwrap();

        // run_pending should be a no-op (tables won't exist but that's OK for this test)
        let result = run_pending(&conn);
        assert!(result.is_ok());
    }
}
