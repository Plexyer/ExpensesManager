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
pub const CURRENT_SCHEMA_VERSION: u32 = 4;

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
        2 => apply_migration_v2(conn),
        3 => apply_migration_v3(conn),
        4 => apply_migration_v4(conn),
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

/// Migration v2: Create budget_instance_categories table.
///
/// This table links budget instances to global categories, creating
/// envelope rows for each period. Each row represents a category
/// in a specific budget instance with its default amount from the template.
fn apply_migration_v2(conn: &Connection) -> Result<(), MigrationError> {
    let tx = conn.unchecked_transaction()?;

    tx.execute_batch(MIGRATION_V2_SQL)?;

    tx.execute(
        "INSERT OR REPLACE INTO _meta (key, value) VALUES ('schema_version', '2')",
        [],
    )?;

    tx.commit()?;

    Ok(())
}

/// SQL for migration v2: Budget instance categories table.
///
/// Creates the table that links budget instances to global categories,
/// representing envelope rows in the main grid for each period.
const MIGRATION_V2_SQL: &str = r#"
-- ============================================================================
-- Migration v2: Budget Instance Categories Table
-- ============================================================================
-- Creates the budget_instance_categories table that links budget instances
-- to global categories, representing envelope rows in the main grid.
-- Each row is a category "envelope" for a specific budget period.
-- ============================================================================

-- Budget instance categories: Envelope rows for each period's grid
CREATE TABLE IF NOT EXISTS budget_instance_categories (
    budget_instance_category_id INTEGER PRIMARY KEY AUTOINCREMENT,
    budget_instance_id INTEGER NOT NULL,
    global_category_id INTEGER NOT NULL,
    default_amount REAL NOT NULL DEFAULT 0,
    default_currency TEXT NOT NULL DEFAULT 'CHF',
    sort_order INTEGER DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (budget_instance_id) REFERENCES period_budget_instances(budget_instance_id) ON DELETE CASCADE,
    FOREIGN KEY (global_category_id) REFERENCES global_categories(global_category_id) ON DELETE CASCADE,
    UNIQUE(budget_instance_id, global_category_id)
);

-- ============================================================================
-- Indexes for performance
-- ============================================================================

-- Primary lookup: Get all categories for a budget instance (main grid view)
CREATE INDEX IF NOT EXISTS idx_bic_budget_instance_id 
    ON budget_instance_categories(budget_instance_id);

-- Secondary lookup: Find all budget instances using a specific category
CREATE INDEX IF NOT EXISTS idx_bic_global_category_id 
    ON budget_instance_categories(global_category_id);

-- Composite index: For sorting categories within a budget instance
CREATE INDEX IF NOT EXISTS idx_bic_instance_sort 
    ON budget_instance_categories(budget_instance_id, sort_order);
"#;

/// Migration v3: Create category_line_items table.
///
/// This table stores received/spent line items for each category within
/// a budget instance. Line items have explicit timestamps and support
/// soft deletion.
fn apply_migration_v3(conn: &Connection) -> Result<(), MigrationError> {
    let tx = conn.unchecked_transaction()?;

    tx.execute_batch(MIGRATION_V3_SQL)?;

    tx.execute(
        "INSERT OR REPLACE INTO _meta (key, value) VALUES ('schema_version', '3')",
        [],
    )?;

    tx.commit()?;

    Ok(())
}

/// SQL for migration v3: Category line items table.
///
/// Creates the table that stores received/spent line items for each
/// category envelope within a budget instance. Supports:
/// - 'received' and 'spent' line item types via `kind` column
/// - ISO 8601 timestamps for occurred_at
/// - Multi-currency (CHF/EUR for MVP)
/// - Soft deletion via deleted_at
/// - Template default tracking via is_template_default flag
const MIGRATION_V3_SQL: &str = r#"
-- ============================================================================
-- Migration v3: Category Line Items Table
-- ============================================================================
-- Creates the category_line_items table that stores received/spent entries
-- for each category envelope. Each line item has an explicit timestamp and
-- amount, supporting rollup calculations for the main grid.
-- ============================================================================

-- Category line items: Received/spent entries per category envelope
CREATE TABLE IF NOT EXISTS category_line_items (
    line_item_id INTEGER PRIMARY KEY AUTOINCREMENT,
    budget_instance_category_id INTEGER NOT NULL,
    kind TEXT NOT NULL CHECK (kind IN ('received', 'spent')),
    occurred_at TEXT NOT NULL, -- ISO 8601 datetime
    description TEXT,
    amount REAL NOT NULL,
    currency TEXT NOT NULL DEFAULT 'CHF',
    notes TEXT,
    is_template_default INTEGER NOT NULL DEFAULT 0, -- 0 = false, 1 = true
    deleted_at TEXT NULL, -- soft delete, ISO 8601 datetime
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (budget_instance_category_id) 
        REFERENCES budget_instance_categories(budget_instance_category_id) ON DELETE CASCADE
);

-- ============================================================================
-- Indexes for performance
-- ============================================================================

-- Primary lookup: Get all line items for a category envelope
CREATE INDEX IF NOT EXISTS idx_line_items_bic_id 
    ON category_line_items(budget_instance_category_id);

-- Date-based queries: Filter by occurred_at
CREATE INDEX IF NOT EXISTS idx_line_items_occurred_at 
    ON category_line_items(occurred_at);

-- Filter by kind (received vs spent)
CREATE INDEX IF NOT EXISTS idx_line_items_kind 
    ON category_line_items(kind);

-- Composite index: For rollup queries filtering by category, kind, and deletion status
CREATE INDEX IF NOT EXISTS idx_line_items_bic_kind_deleted 
    ON category_line_items(budget_instance_category_id, kind, deleted_at);

-- Partial index: For date range queries on non-deleted items
CREATE INDEX IF NOT EXISTS idx_line_items_bic_occurred_active 
    ON category_line_items(budget_instance_category_id, occurred_at) 
    WHERE deleted_at IS NULL;
"#;

/// Migration v4: Create ui_settings table.
///
/// A simple key-value store for persisting user interface preferences
/// (e.g., column widths) across app restarts. Values are stored as
/// JSON strings to support complex data structures.
fn apply_migration_v4(conn: &Connection) -> Result<(), MigrationError> {
    let tx = conn.unchecked_transaction()?;

    tx.execute_batch(MIGRATION_V4_SQL)?;

    tx.execute(
        "INSERT OR REPLACE INTO _meta (key, value) VALUES ('schema_version', '4')",
        [],
    )?;

    tx.commit()?;

    Ok(())
}

/// SQL for migration v4: UI settings key-value table.
const MIGRATION_V4_SQL: &str = r#"
-- ============================================================================
-- Migration v4: UI Settings Table
-- ============================================================================
-- A simple key-value store for persisting user interface preferences
-- (e.g., grid column widths) across app restarts.
-- ============================================================================

CREATE TABLE IF NOT EXISTS ui_settings (
    key   TEXT PRIMARY KEY NOT NULL,
    value TEXT NOT NULL,
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
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

    #[test]
    fn test_migration_v2_creates_budget_instance_categories() {
        let conn = create_test_db();

        // Apply only v1 and v2 (not all migrations)
        apply_migration_v1(&conn).unwrap();
        apply_migration_v2(&conn).unwrap();

        // Verify schema version is now 2
        let version = get_schema_version(&conn).unwrap();
        assert_eq!(version, 2);

        // Verify budget_instance_categories table exists
        let tables: Vec<String> = conn
            .prepare("SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name")
            .unwrap()
            .query_map([], |row| row.get(0))
            .unwrap()
            .filter_map(|r| r.ok())
            .collect();

        assert!(
            tables.contains(&"budget_instance_categories".to_string()),
            "budget_instance_categories table should exist"
        );
    }

    #[test]
    fn test_migration_v2_creates_indexes() {
        let conn = create_test_db();
        apply_initial_schema(&conn).unwrap();

        // Query for v2 indexes
        let indexes: Vec<String> = conn
            .prepare(
                "SELECT name FROM sqlite_master WHERE type = 'index' AND name LIKE 'idx_bic_%' ORDER BY name",
            )
            .unwrap()
            .query_map([], |row| row.get(0))
            .unwrap()
            .filter_map(|r| r.ok())
            .collect();

        // Check expected indexes exist
        assert!(
            indexes.contains(&"idx_bic_budget_instance_id".to_string()),
            "idx_bic_budget_instance_id should exist"
        );
        assert!(
            indexes.contains(&"idx_bic_global_category_id".to_string()),
            "idx_bic_global_category_id should exist"
        );
        assert!(
            indexes.contains(&"idx_bic_instance_sort".to_string()),
            "idx_bic_instance_sort should exist"
        );
    }

    #[test]
    fn test_migration_v2_table_structure() {
        let conn = create_test_db();
        apply_initial_schema(&conn).unwrap();

        // Insert test data to verify structure
        conn.execute(
            "INSERT INTO global_categories (name) VALUES ('Test Category')",
            [],
        )
        .unwrap();

        conn.execute(
            "INSERT INTO budget_templates (name, cadence) VALUES ('Test Template', 'monthly')",
            [],
        )
        .unwrap();

        conn.execute(
            "INSERT INTO period_budget_instances (cadence, start_date, template_id) VALUES ('monthly', '2026-02-01', 1)",
            [],
        )
        .unwrap();

        // Insert budget_instance_category
        conn.execute(
            "INSERT INTO budget_instance_categories (budget_instance_id, global_category_id, default_amount, default_currency, sort_order) VALUES (1, 1, 500.00, 'CHF', 0)",
            [],
        )
        .unwrap();

        // Verify data was inserted
        let count: i64 = conn
            .query_row(
                "SELECT COUNT(*) FROM budget_instance_categories",
                [],
                |row| row.get(0),
            )
            .unwrap();
        assert_eq!(count, 1);

        // Verify the data values
        let (amount, currency): (f64, String) = conn
            .query_row(
                "SELECT default_amount, default_currency FROM budget_instance_categories WHERE budget_instance_category_id = 1",
                [],
                |row| Ok((row.get(0)?, row.get(1)?)),
            )
            .unwrap();
        assert!((amount - 500.0).abs() < 0.01);
        assert_eq!(currency, "CHF");
    }

    #[test]
    fn test_migration_v2_unique_constraint() {
        let conn = create_test_db();
        apply_initial_schema(&conn).unwrap();

        // Insert prerequisite data
        conn.execute(
            "INSERT INTO global_categories (name) VALUES ('Test Category')",
            [],
        )
        .unwrap();
        conn.execute(
            "INSERT INTO budget_templates (name, cadence) VALUES ('Test Template', 'monthly')",
            [],
        )
        .unwrap();
        conn.execute(
            "INSERT INTO period_budget_instances (cadence, start_date, template_id) VALUES ('monthly', '2026-02-01', 1)",
            [],
        )
        .unwrap();

        // Insert first category
        conn.execute(
            "INSERT INTO budget_instance_categories (budget_instance_id, global_category_id, default_amount) VALUES (1, 1, 100.00)",
            [],
        )
        .unwrap();

        // Try to insert duplicate - should fail due to UNIQUE constraint
        let result = conn.execute(
            "INSERT INTO budget_instance_categories (budget_instance_id, global_category_id, default_amount) VALUES (1, 1, 200.00)",
            [],
        );
        assert!(result.is_err(), "Duplicate (budget_instance_id, global_category_id) should fail");
    }

    #[test]
    fn test_migration_v2_cascade_delete() {
        let conn = create_test_db();
        // Enable foreign keys
        conn.execute("PRAGMA foreign_keys = ON", []).unwrap();
        apply_initial_schema(&conn).unwrap();

        // Insert prerequisite data
        conn.execute(
            "INSERT INTO global_categories (name) VALUES ('Test Category')",
            [],
        )
        .unwrap();
        conn.execute(
            "INSERT INTO budget_templates (name, cadence) VALUES ('Test Template', 'monthly')",
            [],
        )
        .unwrap();
        conn.execute(
            "INSERT INTO period_budget_instances (cadence, start_date, template_id) VALUES ('monthly', '2026-02-01', 1)",
            [],
        )
        .unwrap();
        conn.execute(
            "INSERT INTO budget_instance_categories (budget_instance_id, global_category_id, default_amount) VALUES (1, 1, 100.00)",
            [],
        )
        .unwrap();

        // Verify category exists
        let count_before: i64 = conn
            .query_row(
                "SELECT COUNT(*) FROM budget_instance_categories",
                [],
                |row| row.get(0),
            )
            .unwrap();
        assert_eq!(count_before, 1);

        // Delete the budget instance - should cascade to budget_instance_categories
        conn.execute(
            "DELETE FROM period_budget_instances WHERE budget_instance_id = 1",
            [],
        )
        .unwrap();

        // Verify category was deleted via cascade
        let count_after: i64 = conn
            .query_row(
                "SELECT COUNT(*) FROM budget_instance_categories",
                [],
                |row| row.get(0),
            )
            .unwrap();
        assert_eq!(count_after, 0, "budget_instance_categories should be deleted via cascade");
    }

    #[test]
    fn test_migration_v1_to_v2_upgrade() {
        let conn = create_test_db();

        // First apply v1 only
        apply_migration_v1(&conn).unwrap();
        let version_after_v1 = get_schema_version(&conn).unwrap();
        assert_eq!(version_after_v1, 1);

        // Verify budget_instance_categories does NOT exist yet
        let tables_v1: Vec<String> = conn
            .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'budget_instance_categories'")
            .unwrap()
            .query_map([], |row| row.get(0))
            .unwrap()
            .filter_map(|r| r.ok())
            .collect();
        assert!(tables_v1.is_empty(), "budget_instance_categories should not exist after v1");

        // Apply v2 only
        apply_migration_v2(&conn).unwrap();

        // Verify version is now 2
        let version_after_v2 = get_schema_version(&conn).unwrap();
        assert_eq!(version_after_v2, 2);

        // Verify budget_instance_categories now exists
        let tables_v2: Vec<String> = conn
            .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'budget_instance_categories'")
            .unwrap()
            .query_map([], |row| row.get(0))
            .unwrap()
            .filter_map(|r| r.ok())
            .collect();
        assert!(
            tables_v2.contains(&"budget_instance_categories".to_string()),
            "budget_instance_categories should exist after upgrade to v2"
        );
    }

    // ========================================================================
    // Migration v3 Tests: category_line_items table
    // ========================================================================

    #[test]
    fn test_migration_v3_creates_category_line_items() {
        let conn = create_test_db();
        apply_initial_schema(&conn).unwrap();

        // Verify schema version is at least 3 (apply_initial_schema runs all migrations)
        let version = get_schema_version(&conn).unwrap();
        assert_eq!(version, CURRENT_SCHEMA_VERSION);

        // Verify category_line_items table exists
        let tables: Vec<String> = conn
            .prepare("SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name")
            .unwrap()
            .query_map([], |row| row.get(0))
            .unwrap()
            .filter_map(|r| r.ok())
            .collect();

        assert!(
            tables.contains(&"category_line_items".to_string()),
            "category_line_items table should exist"
        );
    }

    #[test]
    fn test_migration_v3_creates_indexes() {
        let conn = create_test_db();
        apply_initial_schema(&conn).unwrap();

        // Query for v3 indexes
        let indexes: Vec<String> = conn
            .prepare(
                "SELECT name FROM sqlite_master WHERE type = 'index' AND name LIKE 'idx_line_items_%' ORDER BY name",
            )
            .unwrap()
            .query_map([], |row| row.get(0))
            .unwrap()
            .filter_map(|r| r.ok())
            .collect();

        // Check expected indexes exist
        assert!(
            indexes.contains(&"idx_line_items_bic_id".to_string()),
            "idx_line_items_bic_id should exist"
        );
        assert!(
            indexes.contains(&"idx_line_items_occurred_at".to_string()),
            "idx_line_items_occurred_at should exist"
        );
        assert!(
            indexes.contains(&"idx_line_items_kind".to_string()),
            "idx_line_items_kind should exist"
        );
        assert!(
            indexes.contains(&"idx_line_items_bic_kind_deleted".to_string()),
            "idx_line_items_bic_kind_deleted should exist"
        );
        assert!(
            indexes.contains(&"idx_line_items_bic_occurred_active".to_string()),
            "idx_line_items_bic_occurred_active should exist"
        );
    }

    #[test]
    fn test_migration_v3_table_structure() {
        let conn = create_test_db();
        apply_initial_schema(&conn).unwrap();

        // Insert prerequisite data
        conn.execute(
            "INSERT INTO global_categories (name) VALUES ('Test Category')",
            [],
        )
        .unwrap();
        conn.execute(
            "INSERT INTO budget_templates (name, cadence) VALUES ('Test Template', 'monthly')",
            [],
        )
        .unwrap();
        conn.execute(
            "INSERT INTO period_budget_instances (cadence, start_date, template_id) VALUES ('monthly', '2026-02-01', 1)",
            [],
        )
        .unwrap();
        conn.execute(
            "INSERT INTO budget_instance_categories (budget_instance_id, global_category_id, default_amount) VALUES (1, 1, 500.00)",
            [],
        )
        .unwrap();

        // Insert a received line item
        conn.execute(
            "INSERT INTO category_line_items (budget_instance_category_id, kind, occurred_at, description, amount, currency, is_template_default) VALUES (1, 'received', '2026-02-01T00:00:00', 'Salary', 5000.00, 'CHF', 1)",
            [],
        )
        .unwrap();

        // Insert a spent line item
        conn.execute(
            "INSERT INTO category_line_items (budget_instance_category_id, kind, occurred_at, description, amount, currency) VALUES (1, 'spent', '2026-02-05T14:30:00', 'Groceries', 150.50, 'CHF')",
            [],
        )
        .unwrap();

        // Verify data was inserted
        let count: i64 = conn
            .query_row(
                "SELECT COUNT(*) FROM category_line_items",
                [],
                |row| row.get(0),
            )
            .unwrap();
        assert_eq!(count, 2);

        // Verify received item values
        let (kind, amount, is_default): (String, f64, i64) = conn
            .query_row(
                "SELECT kind, amount, is_template_default FROM category_line_items WHERE line_item_id = 1",
                [],
                |row| Ok((row.get(0)?, row.get(1)?, row.get(2)?)),
            )
            .unwrap();
        assert_eq!(kind, "received");
        assert!((amount - 5000.0).abs() < 0.01);
        assert_eq!(is_default, 1);

        // Verify spent item values
        let (kind2, amount2): (String, f64) = conn
            .query_row(
                "SELECT kind, amount FROM category_line_items WHERE line_item_id = 2",
                [],
                |row| Ok((row.get(0)?, row.get(1)?)),
            )
            .unwrap();
        assert_eq!(kind2, "spent");
        assert!((amount2 - 150.50).abs() < 0.01);
    }

    #[test]
    fn test_migration_v3_kind_check_constraint() {
        let conn = create_test_db();
        apply_initial_schema(&conn).unwrap();

        // Insert prerequisite data
        conn.execute(
            "INSERT INTO global_categories (name) VALUES ('Test Category')",
            [],
        )
        .unwrap();
        conn.execute(
            "INSERT INTO budget_templates (name, cadence) VALUES ('Test Template', 'monthly')",
            [],
        )
        .unwrap();
        conn.execute(
            "INSERT INTO period_budget_instances (cadence, start_date, template_id) VALUES ('monthly', '2026-02-01', 1)",
            [],
        )
        .unwrap();
        conn.execute(
            "INSERT INTO budget_instance_categories (budget_instance_id, global_category_id, default_amount) VALUES (1, 1, 500.00)",
            [],
        )
        .unwrap();

        // Try to insert with invalid kind - should fail due to CHECK constraint
        let result = conn.execute(
            "INSERT INTO category_line_items (budget_instance_category_id, kind, occurred_at, amount) VALUES (1, 'invalid', '2026-02-01T00:00:00', 100.00)",
            [],
        );
        assert!(
            result.is_err(),
            "Invalid kind value should be rejected by CHECK constraint"
        );

        // Valid kinds should work
        let result_received = conn.execute(
            "INSERT INTO category_line_items (budget_instance_category_id, kind, occurred_at, amount) VALUES (1, 'received', '2026-02-01T00:00:00', 100.00)",
            [],
        );
        assert!(result_received.is_ok(), "'received' should be valid");

        let result_spent = conn.execute(
            "INSERT INTO category_line_items (budget_instance_category_id, kind, occurred_at, amount) VALUES (1, 'spent', '2026-02-02T00:00:00', 50.00)",
            [],
        );
        assert!(result_spent.is_ok(), "'spent' should be valid");
    }

    #[test]
    fn test_migration_v3_cascade_delete() {
        let conn = create_test_db();
        // Enable foreign keys
        conn.execute("PRAGMA foreign_keys = ON", []).unwrap();
        apply_initial_schema(&conn).unwrap();

        // Insert prerequisite data
        conn.execute(
            "INSERT INTO global_categories (name) VALUES ('Test Category')",
            [],
        )
        .unwrap();
        conn.execute(
            "INSERT INTO budget_templates (name, cadence) VALUES ('Test Template', 'monthly')",
            [],
        )
        .unwrap();
        conn.execute(
            "INSERT INTO period_budget_instances (cadence, start_date, template_id) VALUES ('monthly', '2026-02-01', 1)",
            [],
        )
        .unwrap();
        conn.execute(
            "INSERT INTO budget_instance_categories (budget_instance_id, global_category_id, default_amount) VALUES (1, 1, 500.00)",
            [],
        )
        .unwrap();
        conn.execute(
            "INSERT INTO category_line_items (budget_instance_category_id, kind, occurred_at, amount) VALUES (1, 'spent', '2026-02-01T00:00:00', 100.00)",
            [],
        )
        .unwrap();

        // Verify line item exists
        let count_before: i64 = conn
            .query_row(
                "SELECT COUNT(*) FROM category_line_items",
                [],
                |row| row.get(0),
            )
            .unwrap();
        assert_eq!(count_before, 1);

        // Delete the budget_instance_category - should cascade to line items
        conn.execute(
            "DELETE FROM budget_instance_categories WHERE budget_instance_category_id = 1",
            [],
        )
        .unwrap();

        // Verify line item was deleted via cascade
        let count_after: i64 = conn
            .query_row(
                "SELECT COUNT(*) FROM category_line_items",
                [],
                |row| row.get(0),
            )
            .unwrap();
        assert_eq!(
            count_after, 0,
            "category_line_items should be deleted via cascade"
        );
    }

    #[test]
    fn test_migration_v2_to_v3_upgrade() {
        let conn = create_test_db();

        // First apply v1 and v2
        apply_migration_v1(&conn).unwrap();
        apply_migration_v2(&conn).unwrap();
        let version_after_v2 = get_schema_version(&conn).unwrap();
        assert_eq!(version_after_v2, 2);

        // Verify category_line_items does NOT exist yet
        let tables_v2: Vec<String> = conn
            .prepare(
                "SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'category_line_items'",
            )
            .unwrap()
            .query_map([], |row| row.get(0))
            .unwrap()
            .filter_map(|r| r.ok())
            .collect();
        assert!(
            tables_v2.is_empty(),
            "category_line_items should not exist after v2"
        );

        // Now run pending migrations (should apply v3 and v4)
        run_pending(&conn).unwrap();

        // Verify version is now at CURRENT_SCHEMA_VERSION
        let version_after = get_schema_version(&conn).unwrap();
        assert_eq!(version_after, CURRENT_SCHEMA_VERSION);

        // Verify category_line_items now exists
        let tables_v3: Vec<String> = conn
            .prepare(
                "SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'category_line_items'",
            )
            .unwrap()
            .query_map([], |row| row.get(0))
            .unwrap()
            .filter_map(|r| r.ok())
            .collect();
        assert!(
            tables_v3.contains(&"category_line_items".to_string()),
            "category_line_items should exist after upgrade to v3"
        );
    }
}
