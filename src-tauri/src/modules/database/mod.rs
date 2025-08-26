use rusqlite::{Connection, OpenFlags};
use std::path::PathBuf;
use tauri::{AppHandle, Manager};
use thiserror::Error;

#[derive(Debug, Error)]
pub enum DbError {
    #[error("IO error: {0}")]
    Io(String),
    #[error("SQLite error: {0}")]
    Sql(String),
}

pub struct DbState {
    pub path: PathBuf,
}

impl DbState {
    pub fn new(app: &AppHandle) -> Result<Self, DbError> {
        let app_dir = app.path().app_data_dir().map_err(|e| DbError::Io(e.to_string()))?;
        std::fs::create_dir_all(&app_dir).map_err(|e| DbError::Io(e.to_string()))?;
        let db_path = app_dir.join("expenses_encrypted.sqlite");
        Ok(Self { path: db_path })
    }

    pub fn get_conn(&self) -> Result<Connection, DbError> {
        Connection::open_with_flags(&self.path, OpenFlags::SQLITE_OPEN_READ_WRITE | OpenFlags::SQLITE_OPEN_CREATE)
            .map_err(|e| DbError::Sql(e.to_string()))
    }
}

pub fn init_state(app: &AppHandle) -> Result<DbState, DbError> {
    DbState::new(app)
}

pub fn run_migrations(state: &DbState) -> Result<(), DbError> {
    let conn = state.get_conn()?;
    // Basic schema to start; encryption via SQLCipher is TODO in a follow-up
    conn.execute_batch(
        r#"
        PRAGMA foreign_keys = ON;
        CREATE TABLE IF NOT EXISTS Users (
            user_id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            encryption_settings TEXT
        );

        CREATE TABLE IF NOT EXISTS BudgetTemplates (
            template_id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            is_default INTEGER NOT NULL DEFAULT 0,
            created_at TEXT NOT NULL DEFAULT (datetime('now'))
        );

        CREATE TABLE IF NOT EXISTS BudgetCategories (
            category_id INTEGER PRIMARY KEY AUTOINCREMENT,
            template_id INTEGER NOT NULL,
            name TEXT NOT NULL,
            allocation_type TEXT,
            formula TEXT,
            FOREIGN KEY(template_id) REFERENCES BudgetTemplates(template_id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS MonthlyBudgets (
            budget_id INTEGER PRIMARY KEY AUTOINCREMENT,
            month INTEGER NOT NULL,
            year INTEGER NOT NULL,
            total_income REAL NOT NULL,
            template_used INTEGER,
            created_at TEXT NOT NULL DEFAULT (datetime('now')),
            finished_at TEXT,
            name TEXT,
            UNIQUE(month, year)
        );

        CREATE TABLE IF NOT EXISTS CategoryAllocations (
            allocation_id INTEGER PRIMARY KEY AUTOINCREMENT,
            budget_id INTEGER NOT NULL,
            category_id INTEGER NOT NULL,
            allocated_amount REAL NOT NULL DEFAULT 0,
            FOREIGN KEY(budget_id) REFERENCES MonthlyBudgets(budget_id) ON DELETE CASCADE,
            FOREIGN KEY(category_id) REFERENCES BudgetCategories(category_id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS Expenses (
            expense_id INTEGER PRIMARY KEY AUTOINCREMENT,
            allocation_id INTEGER NOT NULL,
            amount REAL NOT NULL,
            description TEXT NOT NULL,
            date TEXT NOT NULL,
            location TEXT,
            FOREIGN KEY(allocation_id) REFERENCES CategoryAllocations(allocation_id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS CategoryMergeHistory (
            merge_id INTEGER PRIMARY KEY AUTOINCREMENT,
            source_category_id INTEGER NOT NULL,
            target_category_id INTEGER NOT NULL,
            merge_date TEXT NOT NULL DEFAULT (datetime('now'))
        );

        CREATE TABLE IF NOT EXISTS BudgetChangeHistory (
            change_id INTEGER PRIMARY KEY AUTOINCREMENT,
            budget_id INTEGER NOT NULL,
            change_type TEXT NOT NULL, -- 'field_change', 'status_change', 'creation'
            field_name TEXT, -- 'name', 'total_income', 'finished_at', etc.
            old_value TEXT,
            new_value TEXT,
            change_description TEXT, -- Human readable description
            changed_at TEXT NOT NULL DEFAULT (datetime('now')),
            FOREIGN KEY(budget_id) REFERENCES MonthlyBudgets(budget_id) ON DELETE CASCADE
        );
        "#,
    )
    .map_err(|e| DbError::Sql(e.to_string()))?;

    // Add columns to existing MonthlyBudgets table if they don't exist
    // Check if columns exist before adding them
    let mut check_columns = conn.prepare("PRAGMA table_info(MonthlyBudgets)").map_err(|e| DbError::Sql(e.to_string()))?;
    let column_rows = check_columns.query_map([], |row| {
        Ok(row.get::<_, String>(1)?) // column name is in index 1
    }).map_err(|e| DbError::Sql(e.to_string()))?;
    
    let mut existing_columns: Vec<String> = Vec::new();
    for row in column_rows {
        existing_columns.push(row.map_err(|e| DbError::Sql(e.to_string()))?);
    }
    
    if !existing_columns.contains(&"created_at".to_string()) {
        // Add column without default first
        conn.execute("ALTER TABLE MonthlyBudgets ADD COLUMN created_at TEXT", [])
            .map_err(|e| DbError::Sql(format!("Failed to add created_at column: {}", e)))?;
        
        // Update existing rows to have a created_at value
        conn.execute("UPDATE MonthlyBudgets SET created_at = datetime('now') WHERE created_at IS NULL", [])
            .map_err(|e| DbError::Sql(format!("Failed to update created_at values: {}", e)))?;
        
        println!("Added created_at column to MonthlyBudgets");
    }
    
    if !existing_columns.contains(&"finished_at".to_string()) {
        conn.execute("ALTER TABLE MonthlyBudgets ADD COLUMN finished_at TEXT", [])
            .map_err(|e| DbError::Sql(format!("Failed to add finished_at column: {}", e)))?;
        println!("Added finished_at column to MonthlyBudgets");
    }
    
    if !existing_columns.contains(&"name".to_string()) {
        conn.execute("ALTER TABLE MonthlyBudgets ADD COLUMN name TEXT", [])
            .map_err(|e| DbError::Sql(format!("Failed to add name column: {}", e)))?;
        println!("Added name column to MonthlyBudgets");
    }

    if !existing_columns.contains(&"last_edited".to_string()) {
        conn.execute("ALTER TABLE MonthlyBudgets ADD COLUMN last_edited TEXT", [])
            .map_err(|e| DbError::Sql(format!("Failed to add last_edited column: {}", e)))?;
        
        // Update existing rows to have a last_edited value equal to created_at
        conn.execute("UPDATE MonthlyBudgets SET last_edited = COALESCE(created_at, datetime('now')) WHERE last_edited IS NULL", [])
            .map_err(|e| DbError::Sql(format!("Failed to update last_edited values: {}", e)))?;
        
        println!("Added last_edited column to MonthlyBudgets");
    }

    if !existing_columns.contains(&"first_finished_at".to_string()) {
        conn.execute("ALTER TABLE MonthlyBudgets ADD COLUMN first_finished_at TEXT", [])
            .map_err(|e| DbError::Sql(format!("Failed to add first_finished_at column: {}", e)))?;
        
        // For existing finished budgets, set first_finished_at to finished_at
        conn.execute("UPDATE MonthlyBudgets SET first_finished_at = finished_at WHERE finished_at IS NOT NULL AND first_finished_at IS NULL", [])
            .map_err(|e| DbError::Sql(format!("Failed to update first_finished_at values: {}", e)))?;
        
        println!("Added first_finished_at column to MonthlyBudgets");
    }

    // Ensure all existing budgets have proper created_at timestamps
    conn.execute("UPDATE MonthlyBudgets SET created_at = datetime('now') WHERE created_at IS NULL", [])
        .map_err(|e| DbError::Sql(format!("Failed to update null created_at values: {}", e)))?;
        
    println!("Ensured all budgets have proper created_at timestamps");

    Ok(())
}

