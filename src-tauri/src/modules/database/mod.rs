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
        "#,
    )
    .map_err(|e| DbError::Sql(e.to_string()))?;
    Ok(())
}


