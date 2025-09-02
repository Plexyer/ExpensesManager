use serde::{Deserialize, Serialize};
use tauri::State;

use crate::modules::database::{DbState, run_migrations};

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateBudgetArgs {
    pub month: u8,
    pub year: i32,
    pub total_income: f64,
    pub name: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct BudgetSummary {
    pub budget_id: i64,
    pub month: u8,
    pub year: i32,
    pub total_income: f64,
    pub created_at: String,
    pub finished_at: Option<String>,
    pub first_finished_at: Option<String>,
    pub name: Option<String>,
    pub last_edited: String,
}

#[tauri::command]
pub fn init_database(db: State<DbState>) -> Result<(), String> {
    println!("Initializing database...");
    match run_migrations(&db) {
        Ok(_) => {
            println!("Database initialized successfully");
            
            // Check if we need to seed example data
            match seed_initial_examples(&db) {
                Ok(_) => println!("Initial data check completed"),
                Err(e) => println!("Warning: Could not seed initial data: {}", e),
            }
            
            Ok(())
        }
        Err(e) => {
            let error_msg = format!("Database initialization failed: {}", e);
            println!("{}", error_msg);
            Err(error_msg)
        }
    }
}

fn seed_initial_examples(db: &DbState) -> Result<(), String> {
    let conn = db.get_conn().map_err(|e| e.to_string())?;
    
    // Check if this is the very first time the app is running by counting budgets
    let mut stmt = conn.prepare("SELECT COUNT(*) FROM MonthlyBudgets").map_err(|e| e.to_string())?;
    let count: i64 = stmt.query_row([], |row| row.get(0)).map_err(|e| e.to_string())?;
    
    if count == 0 {
        println!("First app launch detected - no budgets found, creating initial examples...");
        
        let example_budgets = [
            (1, 2024, 5000.0, "January 2024 Budget"),
            (2, 2024, 4800.0, "February 2024 Budget"),  
            (3, 2024, 5200.0, "March 2024 Budget"),
            (4, 2024, 5100.0, "April 2024 Budget"),
            (5, 2024, 4900.0, "May 2024 Budget"),
        ];
        
        for (month, year, income, name) in example_budgets.iter() {
            conn.execute(
                "INSERT INTO MonthlyBudgets (month, year, total_income, template_used, name, created_at, last_edited) VALUES (?1, ?2, ?3, NULL, ?4, datetime('now'), datetime('now'))",
                rusqlite::params![month, year, income, name],
            ).map_err(|e| {
                format!("Error inserting example budget {}/{}: {}", month, year, e)
            })?;
            
            println!("Created example budget for {}/{} with income ${}", month, year, income);
        }
        
        println!("Successfully created {} example budgets for first-time user", example_budgets.len());
    } else {
        println!("Found {} existing budgets, first-time setup already completed", count);
    }
    
    Ok(())
}

#[tauri::command]
pub fn create_monthly_budget(args: CreateBudgetArgs, db: State<DbState>) -> Result<i64, String> {
    println!("=== CREATE_MONTHLY_BUDGET COMMAND CALLED ===");
    println!("Received create_monthly_budget request: {:?}", args);
    println!("Args details - month: {}, year: {}, total_income: {}, name: {:?}", 
             args.month, args.year, args.total_income, args.name);
    
    let mut conn = db.get_conn().map_err(|e| {
        let error_msg = format!("Database connection error: {}", e);
        println!("{}", error_msg);
        error_msg
    })?;
    
    let tx = conn.transaction().map_err(|e| {
        let error_msg = format!("Transaction error: {}", e);
        println!("{}", error_msg);
        error_msg
    })?;
    
    println!("Executing SQL with params: month={}, year={}, total_income={}, name={:?}", 
             args.month, args.year, args.total_income, args.name);
    
    tx.execute(
        "INSERT INTO MonthlyBudgets (month, year, total_income, template_used, name, created_at, last_edited) VALUES (?1, ?2, ?3, NULL, ?4, datetime('now'), datetime('now'))",
        rusqlite::params![args.month, args.year, args.total_income, args.name],
    ).map_err(|e| {
        let error_msg = if e.to_string().contains("UNIQUE constraint failed") {
            format!("A budget for {}/{} already exists. Please choose a different month/year or edit the existing budget.", 
                   args.month, args.year)
        } else {
            format!("SQL execution error: {}", e)
        };
        println!("{}", error_msg);
        error_msg
    })?;
    
    let id = tx.last_insert_rowid();
    println!("Created budget with ID: {}", id);
    
    tx.commit().map_err(|e| {
        let error_msg = format!("Transaction commit error: {}", e);
        println!("{}", error_msg);
        error_msg
    })?;
    
    Ok(id)
}

#[tauri::command]
pub fn list_monthly_budgets(db: State<DbState>) -> Result<Vec<BudgetSummary>, String> {
    let conn = db.get_conn().map_err(|e| e.to_string())?;
    let mut stmt = conn
        .prepare("SELECT budget_id, month, year, total_income, created_at, finished_at, first_finished_at, name, last_edited FROM MonthlyBudgets ORDER BY last_edited DESC")
        .map_err(|e| e.to_string())?;
    let rows = stmt
        .query_map([], |row| {
            Ok(BudgetSummary {
                budget_id: row.get(0)?,
                month: row.get(1)?,
                year: row.get(2)?,
                total_income: row.get(3)?,
                created_at: row.get(4)?,
                finished_at: row.get(5)?,
                first_finished_at: row.get(6)?,
                name: row.get(7)?,
                last_edited: row.get(8)?,
            })
        })
        .map_err(|e| e.to_string())?;
    let mut results = Vec::new();
    for r in rows {
        results.push(r.map_err(|e| e.to_string())?);
    }
    Ok(results)
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct BudgetChangeHistoryEntry {
    pub change_id: i64,
    pub budget_id: i64,
    pub change_type: String,
    pub field_name: Option<String>,
    pub old_value: Option<String>,
    pub new_value: Option<String>,
    pub change_description: String,
    pub changed_at: String,
}

// New types for category grid system
#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CategoryRow {
    pub category_id: i64,
    pub budget_id: i64,
    pub category_name: String,
    pub allocated_amount: f64,
    pub net_amount: f64,
    pub remaining_amount: f64,
    pub last_activity_at: Option<String>,
    pub entries_count: i64,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct NewEntry {
    pub category_id: i64,
    pub entry_type: String, // "expense" | "income" | "adjustment"
    pub what: String,
    pub r#where: Option<String>,
    pub amount: f64,        // positive
    pub date: String,       // "YYYY-MM-DD"
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateEntry {
    pub entry_id: i64,
    pub entry_type: String,
    pub what: String,
    pub r#where: Option<String>,
    pub amount: f64,
    pub date: String,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LedgerEntry {
    pub entry_id: i64,
    pub category_id: i64,
    pub entry_type: String,
    pub what: String,
    pub r#where: Option<String>,
    pub amount: f64,
    pub date: String,
    pub created_at: String,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct BudgetTemplate {
    pub template_id: i64,
    pub name: String,
    pub created_at: String,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct NewCategory {
    pub budget_id: i64,
    pub category_name: String,
    pub allocated_amount: f64,
}

fn log_budget_change(
    conn: &rusqlite::Connection,
    budget_id: i64,
    change_type: &str,
    field_name: Option<&str>,
    old_value: Option<&str>,
    new_value: Option<&str>,
    description: &str,
) -> Result<(), String> {
    println!("=== LOGGING BUDGET CHANGE ===");
    println!("Budget ID: {}", budget_id);
    println!("Change Type: {}", change_type);
    println!("Field Name: {:?}", field_name);
    println!("Old Value: {:?}", old_value);
    println!("New Value: {:?}", new_value);
    println!("Description: {}", description);
    
    let result = conn.execute(
        "INSERT INTO BudgetChangeHistory (budget_id, change_type, field_name, old_value, new_value, change_description) VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
        rusqlite::params![budget_id, change_type, field_name, old_value, new_value, description],
    );
    
    match result {
        Ok(rows_affected) => {
            println!("Successfully logged change, rows affected: {}", rows_affected);
            Ok(())
        }
        Err(e) => {
            let error_msg = format!("Failed to log budget change: {}", e);
            println!("{}", error_msg);
            Err(error_msg)
        }
    }
}

#[tauri::command]
pub fn get_budget_change_history(budget_id: i64, db: State<DbState>) -> Result<Vec<BudgetChangeHistoryEntry>, String> {
    println!("=== GET_BUDGET_CHANGE_HISTORY COMMAND CALLED ===");
    println!("Fetching change history for budget ID: {}", budget_id);
    
    let conn = db.get_conn().map_err(|e| e.to_string())?;
    let mut stmt = conn
        .prepare("SELECT change_id, budget_id, change_type, field_name, old_value, new_value, change_description, changed_at FROM BudgetChangeHistory WHERE budget_id = ?1 ORDER BY changed_at DESC")
        .map_err(|e| e.to_string())?;
    
    let rows = stmt
        .query_map([budget_id], |row| {
            let entry = BudgetChangeHistoryEntry {
                change_id: row.get(0)?,
                budget_id: row.get(1)?,
                change_type: row.get(2)?,
                field_name: row.get(3)?,
                old_value: row.get(4)?,
                new_value: row.get(5)?,
                change_description: row.get(6)?,
                changed_at: row.get(7)?,
            };
            println!("Found change history entry: {:?}", entry);
            Ok(entry)
        })
        .map_err(|e| e.to_string())?;
    
    let mut results = Vec::new();
    for r in rows {
        results.push(r.map_err(|e| e.to_string())?);
    }
    
    println!("Total change history entries found: {}", results.len());
    Ok(results)
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SortBudgetsArgs {
    pub criteria: String, // "income", "created_date", "finished_date", "budget_date", "name"
    pub ascending: bool,
}

#[tauri::command]
pub fn list_monthly_budgets_sorted(args: SortBudgetsArgs, db: State<DbState>) -> Result<Vec<BudgetSummary>, String> {
    let conn = db.get_conn().map_err(|e| e.to_string())?;
    
    let (order_clause, direction, null_handling) = match args.criteria.as_str() {
        "income" => ("total_income", if args.ascending { "ASC" } else { "DESC" }, ""),
        "created_date" => ("created_at", if args.ascending { "ASC" } else { "DESC" }, ""),
        "finished_date" => ("finished_at", if args.ascending { "ASC" } else { "DESC" }, if args.ascending { "NULLS FIRST" } else { "NULLS LAST" }),
        "budget_date" => {
            // For budget dates, we need to sort by the budget period (month/year the budget is FOR)
            // Descending: November 2025, October 2025, ..., January 2025, December 2024, ..., January 2024
            // Ascending: January 2024, February 2024, ..., December 2024, January 2025, ..., November 2025
            if args.ascending {
                ("year, month", "ASC", "")
            } else {
                ("year DESC, month", "DESC", "")
            }
        },
        "name" => {
            // For alphabetical sorting, we need to use the display name (custom name or fallback to "Month Year")
            // This will be handled with a CASE expression in SQL
            ("CASE WHEN name IS NULL OR name = '' THEN \
                (CASE month \
                    WHEN 1 THEN 'January ' \
                    WHEN 2 THEN 'February ' \
                    WHEN 3 THEN 'March ' \
                    WHEN 4 THEN 'April ' \
                    WHEN 5 THEN 'May ' \
                    WHEN 6 THEN 'June ' \
                    WHEN 7 THEN 'July ' \
                    WHEN 8 THEN 'August ' \
                    WHEN 9 THEN 'September ' \
                    WHEN 10 THEN 'October ' \
                    WHEN 11 THEN 'November ' \
                    WHEN 12 THEN 'December ' \
                END) || year \
                ELSE name END COLLATE NOCASE", 
                if args.ascending { "ASC" } else { "DESC" }, 
                "")
        },
        "last_edited" => ("last_edited", if args.ascending { "ASC" } else { "DESC" }, ""),
        _ => ("last_edited", "DESC", ""), // default to last_edited DESC
    };
    
    let query = match (args.criteria.as_str(), args.ascending) {
        ("budget_date", true) => {
            // Budget date ascending: January 2024, February 2024, ..., October 2025, November 2025
            "SELECT budget_id, month, year, total_income, created_at, finished_at, first_finished_at, name, last_edited FROM MonthlyBudgets ORDER BY year ASC, month ASC".to_string()
        },
        ("budget_date", false) => {
            // Budget date descending: November 2025, October 2025, ..., February 2024, January 2024
            "SELECT budget_id, month, year, total_income, created_at, finished_at, first_finished_at, name, last_edited FROM MonthlyBudgets ORDER BY year DESC, month DESC".to_string()
        },
        ("name", true) => {
            // Alphabetical ascending: "aaaaaaa" first, then "August 2025", etc.
            "SELECT budget_id, month, year, total_income, created_at, finished_at, first_finished_at, name, last_edited FROM MonthlyBudgets ORDER BY \
                CASE WHEN name IS NULL OR name = '' THEN \
                    (CASE month \
                        WHEN 1 THEN 'January ' \
                        WHEN 2 THEN 'February ' \
                        WHEN 3 THEN 'March ' \
                        WHEN 4 THEN 'April ' \
                        WHEN 5 THEN 'May ' \
                        WHEN 6 THEN 'June ' \
                        WHEN 7 THEN 'July ' \
                        WHEN 8 THEN 'August ' \
                        WHEN 9 THEN 'September ' \
                        WHEN 10 THEN 'October ' \
                        WHEN 11 THEN 'November ' \
                        WHEN 12 THEN 'December ' \
                    END) || year \
                    ELSE name END COLLATE NOCASE ASC".to_string()
        },
        ("name", false) => {
            // Alphabetical descending: "September 2025" first, then "August 2025", then "aaaaaaa" (z to a)
            "SELECT budget_id, month, year, total_income, created_at, finished_at, first_finished_at, name, last_edited FROM MonthlyBudgets ORDER BY \
                CASE WHEN name IS NULL OR name = '' THEN \
                    (CASE month \
                        WHEN 1 THEN 'January ' \
                        WHEN 2 THEN 'February ' \
                        WHEN 3 THEN 'March ' \
                        WHEN 4 THEN 'April ' \
                        WHEN 5 THEN 'May ' \
                        WHEN 6 THEN 'June ' \
                        WHEN 7 THEN 'July ' \
                        WHEN 8 THEN 'August ' \
                        WHEN 9 THEN 'September ' \
                        WHEN 10 THEN 'October ' \
                        WHEN 11 THEN 'November ' \
                        WHEN 12 THEN 'December ' \
                    END) || year \
                    ELSE name END COLLATE NOCASE DESC".to_string()
        },
        _ => {
            // All other sorting criteria
            format!(
                "SELECT budget_id, month, year, total_income, created_at, finished_at, first_finished_at, name, last_edited FROM MonthlyBudgets ORDER BY {} {} {}",
                order_clause, direction, null_handling
            )
        }
    };
    
    println!("Executing sort query: {}", query);
    
    let mut stmt = conn.prepare(&query).map_err(|e| e.to_string())?;
    let rows = stmt
        .query_map([], |row| {
            Ok(BudgetSummary {
                budget_id: row.get(0)?,
                month: row.get(1)?,
                year: row.get(2)?,
                total_income: row.get(3)?,
                created_at: row.get(4)?,
                finished_at: row.get(5)?,
                first_finished_at: row.get(6)?,
                name: row.get(7)?,
                last_edited: row.get(8)?,
            })
        })
        .map_err(|e| e.to_string())?;
    let mut results = Vec::new();
    for r in rows {
        results.push(r.map_err(|e| e.to_string())?);
    }
    Ok(results)
}

#[tauri::command]
pub fn finish_monthly_budget(budget_id: i64, db: State<DbState>) -> Result<(), String> {
    println!("=== FINISH_MONTHLY_BUDGET COMMAND CALLED ===");
    println!("Finishing budget with ID: {}", budget_id);
    
    let conn = db.get_conn().map_err(|e| {
        let error_msg = format!("Database connection error: {}", e);
        println!("{}", error_msg);
        error_msg
    })?;
    
    // First check if budget exists
    let exists = conn.query_row(
        "SELECT COUNT(*) FROM MonthlyBudgets WHERE budget_id = ?1",
        rusqlite::params![budget_id],
        |row| row.get::<_, i32>(0)
    ).map_err(|e| {
        let error_msg = format!("Error checking budget existence: {}", e);
        println!("{}", error_msg);
        error_msg
    })?;
    
    if exists == 0 {
        let error_msg = format!("Budget with ID {} not found", budget_id);
        println!("{}", error_msg);
        return Err(error_msg);
    }
    
    // Check if this is the first time finishing this budget
    let first_finish = conn.query_row(
        "SELECT first_finished_at FROM MonthlyBudgets WHERE budget_id = ?1",
        rusqlite::params![budget_id],
        |row| row.get::<_, Option<String>>(0)
    ).map_err(|e| {
        let error_msg = format!("Error checking first finish status: {}", e);
        println!("{}", error_msg);
        error_msg
    })?;
    
    let is_first_finish = first_finish.is_none();
    
    // Update the budget - set both finished_at and first_finished_at if it's the first time
    let update_query = if is_first_finish {
        "UPDATE MonthlyBudgets SET finished_at = datetime('now'), first_finished_at = datetime('now'), last_edited = datetime('now') WHERE budget_id = ?1"
    } else {
        "UPDATE MonthlyBudgets SET finished_at = datetime('now'), last_edited = datetime('now') WHERE budget_id = ?1"
    };
    
    let rows_affected = conn.execute(update_query, rusqlite::params![budget_id])
        .map_err(|e| {
            let error_msg = format!("Error finishing budget: {}", e);
            println!("{}", error_msg);
            error_msg
        })?;
    
    if rows_affected > 0 {
        // Log the change to history
        let description = if is_first_finish {
            "Budget marked as finished for the first time"
        } else {
            "Budget marked as finished again after being reopened"
        };
        
        log_budget_change(&conn, budget_id, "status_change", Some("finished_at"), 
                         Some("null"), Some("current_timestamp"), description)?;
        
        println!("Successfully finished budget with ID: {}", budget_id);
        Ok(())
    } else {
        // Check if budget was already finished
        let already_finished = conn.query_row(
            "SELECT finished_at FROM MonthlyBudgets WHERE budget_id = ?1",
            rusqlite::params![budget_id],
            |row| row.get::<_, Option<String>>(0)
        ).map_err(|e| {
            let error_msg = format!("Error checking budget finish status: {}", e);
            println!("{}", error_msg);
            error_msg
        })?;
        
        if already_finished.is_some() {
            let error_msg = format!("Budget with ID {} is already finished", budget_id);
            println!("{}", error_msg);
            Err(error_msg)
        } else {
            let error_msg = format!("Failed to finish budget with ID: {}", budget_id);
            println!("{}", error_msg);
            Err(error_msg)
        }
    }
}

#[tauri::command]
pub fn unfinish_monthly_budget(budget_id: i64, db: State<DbState>) -> Result<(), String> {
    println!("=== UNFINISH_MONTHLY_BUDGET COMMAND CALLED ===");
    println!("Unfinishing budget with ID: {}", budget_id);
    
    let conn = db.get_conn().map_err(|e| {
        let error_msg = format!("Database connection error: {}", e);
        println!("{}", error_msg);
        error_msg
    })?;
    
    // First check if budget exists
    let exists = conn.query_row(
        "SELECT COUNT(*) FROM MonthlyBudgets WHERE budget_id = ?1",
        rusqlite::params![budget_id],
        |row| row.get::<_, i32>(0)
    ).map_err(|e| {
        let error_msg = format!("Error checking budget existence: {}", e);
        println!("{}", error_msg);
        error_msg
    })?;
    
    if exists == 0 {
        let error_msg = format!("Budget with ID {} not found", budget_id);
        println!("{}", error_msg);
        return Err(error_msg);
    }
    
    // Update the budget to set finished_at to NULL and update last_edited
    let rows_affected = conn.execute(
        "UPDATE MonthlyBudgets SET finished_at = NULL, last_edited = datetime('now') WHERE budget_id = ?1",
        rusqlite::params![budget_id],
    ).map_err(|e| {
        let error_msg = format!("Error unfinishing budget: {}", e);
        println!("{}", error_msg);
        error_msg
    })?;
    
    if rows_affected > 0 {
        // Log the change to history
        log_budget_change(&conn, budget_id, "status_change", Some("finished_at"), 
                         Some("current_timestamp"), Some("null"), 
                         "Budget reopened for editing")?;
                         
        println!("Successfully unfinished budget with ID: {}", budget_id);
        Ok(())
    } else {
        // Check if budget was already unfinished
        let already_unfinished = conn.query_row(
            "SELECT finished_at FROM MonthlyBudgets WHERE budget_id = ?1",
            rusqlite::params![budget_id],
            |row| row.get::<_, Option<String>>(0)
        ).map_err(|e| {
            let error_msg = format!("Error checking budget finish status: {}", e);
            println!("{}", error_msg);
            error_msg
        })?;
        
        if already_unfinished.is_none() {
            let error_msg = format!("Budget with ID {} is already unfinished", budget_id);
            println!("{}", error_msg);
            Err(error_msg)
        } else {
            let error_msg = format!("Failed to unfinish budget with ID: {}", budget_id);
            println!("{}", error_msg);
            Err(error_msg)
        }
    }
}

#[tauri::command]
pub fn delete_monthly_budget(budget_id: i64, db: State<DbState>) -> Result<(), String> {
    println!("=== DELETE_MONTHLY_BUDGET COMMAND CALLED ===");
    println!("Deleting budget with ID: {}", budget_id);
    
    let conn = db.get_conn().map_err(|e| {
        let error_msg = format!("Database connection error: {}", e);
        println!("{}", error_msg);
        error_msg
    })?;
    
    // First check if budget exists
    let exists = conn.query_row(
        "SELECT COUNT(*) FROM MonthlyBudgets WHERE budget_id = ?1",
        rusqlite::params![budget_id],
        |row| row.get::<_, i32>(0)
    ).map_err(|e| {
        let error_msg = format!("Error checking budget existence: {}", e);
        println!("{}", error_msg);
        error_msg
    })?;
    
    if exists == 0 {
        let error_msg = format!("Budget with ID {} not found", budget_id);
        println!("{}", error_msg);
        return Err(error_msg);
    }
    
    // Delete the budget
    let rows_affected = conn.execute(
        "DELETE FROM MonthlyBudgets WHERE budget_id = ?1",
        rusqlite::params![budget_id],
    ).map_err(|e| {
        let error_msg = format!("Error deleting budget: {}", e);
        println!("{}", error_msg);
        error_msg
    })?;
    
    if rows_affected > 0 {
        println!("Successfully deleted budget with ID: {}", budget_id);
        Ok(())
    } else {
        let error_msg = format!("Failed to delete budget with ID: {}", budget_id);
        println!("{}", error_msg);
        Err(error_msg)
    }
}

#[tauri::command]
pub async fn update_budget_title(
    budget_id: i32,
    title: String,
    db: tauri::State<'_, crate::modules::database::DbState>,
) -> Result<(), String> {
    println!("update_budget_title called with budget_id: {}, title: '{}'", budget_id, title);
    
    let conn = db.get_conn().map_err(|e| {
        let error_msg = format!("Database connection error: {}", e);
        println!("{}", error_msg);
        error_msg
    })?;
    
    // Get the current title for change history
    let mut stmt = conn.prepare("SELECT name FROM MonthlyBudgets WHERE budget_id = ?1")
        .map_err(|e| e.to_string())?;
    
    let current_title: Option<String> = stmt
        .query_row([budget_id as i64], |row| row.get(0))
        .map_err(|e| e.to_string())?;
    
    let old_title = current_title.unwrap_or_else(|| "".to_string());
    
    // Update the budget title
    let rows_affected = conn.execute(
        "UPDATE MonthlyBudgets SET name = ?1, last_edited = datetime('now') WHERE budget_id = ?2",
        [&title, &(budget_id as i64).to_string()],
    ).map_err(|e| {
        let error_msg = format!("Error updating budget title: {}", e);
        println!("{}", error_msg);
        error_msg
    })?;
    
    if rows_affected == 0 {
        let error_msg = format!("No budget found with ID: {}", budget_id);
        println!("{}", error_msg);
        return Err(error_msg);
    }
    
    // Log the title change
    log_budget_change(
        &conn,
        budget_id as i64,
        "title_change",
        Some("name"),
        Some(&old_title),
        Some(&title),
        &format!("Budget title changed to '{}'", title),
    )?;
    
    println!("Successfully updated budget title for ID: {}", budget_id);
    Ok(())
}

// Category Grid System Commands
#[tauri::command]
pub fn get_budget_categories_with_stats(budget_id: i64, db: State<DbState>) -> Result<Vec<CategoryRow>, String> {
    println!("=== GET_BUDGET_CATEGORIES_WITH_STATS COMMAND CALLED ===");
    println!("Fetching categories with stats for budget ID: {}", budget_id);
    
    let conn = db.get_conn().map_err(|e| e.to_string())?;
    
    let query = r#"
        SELECT c.category_id,
               c.budget_id,
               c.category_name,
               c.allocated_amount,
               COALESCE(SUM(CASE e.entry_type
                   WHEN 'income' THEN e.amount
                   WHEN 'expense' THEN -e.amount
                   ELSE 0 END), 0) AS net_amount,
               (c.allocated_amount + COALESCE(SUM(CASE e.entry_type
                   WHEN 'income' THEN e.amount
                   WHEN 'expense' THEN -e.amount
                   ELSE 0 END), 0)) AS remaining_amount,
               MAX(e.date) AS last_activity_at,
               COUNT(CASE WHEN e.deleted_at IS NULL THEN e.expense_id END) AS entries_count
        FROM budget_categories c
        LEFT JOIN expenses e
          ON e.category_id = c.category_id AND e.deleted_at IS NULL
        WHERE c.budget_id = ?1
        GROUP BY c.category_id, c.budget_id, c.category_name, c.allocated_amount
        ORDER BY c.created_at ASC
    "#;
    
    let mut stmt = conn.prepare(query).map_err(|e| e.to_string())?;
    let rows = stmt
        .query_map([budget_id], |row| {
            Ok(CategoryRow {
                category_id: row.get(0)?,
                budget_id: row.get(1)?,
                category_name: row.get(2)?,
                allocated_amount: row.get(3)?,
                net_amount: row.get(4)?,
                remaining_amount: row.get(5)?,
                last_activity_at: row.get(6)?,
                entries_count: row.get(7)?,
            })
        })
        .map_err(|e| e.to_string())?;
    
    let mut results = Vec::new();
    for r in rows {
        results.push(r.map_err(|e| e.to_string())?);
    }
    
    println!("Found {} categories with stats", results.len());
    Ok(results)
}

#[tauri::command]
pub fn get_category_ledger(
    category_id: i64, 
    limit: u32, 
    offset: u32, 
    sort: String, 
    db: State<DbState>
) -> Result<Vec<LedgerEntry>, String> {
    println!("=== GET_CATEGORY_LEDGER COMMAND CALLED ===");
    println!("Fetching ledger for category ID: {}, limit: {}, offset: {}, sort: {}", 
             category_id, limit, offset, sort);
    
    let conn = db.get_conn().map_err(|e| e.to_string())?;
    
    let order_clause = match sort.as_str() {
        "date_asc" => "ORDER BY e.date ASC, e.created_at ASC",
        "date_desc" => "ORDER BY e.date DESC, e.created_at DESC",
        "amount_asc" => "ORDER BY e.amount ASC",
        "amount_desc" => "ORDER BY e.amount DESC",
        "created_asc" => "ORDER BY e.created_at ASC",
        "created_desc" => "ORDER BY e.created_at DESC",
        _ => "ORDER BY e.date DESC, e.created_at DESC", // default
    };
    
    let query = format!(r#"
        SELECT e.expense_id,
               e.category_id,
               e.entry_type,
               e.description,
               e.place,
               e.amount,
               e.date,
               e.created_at
        FROM expenses e
        WHERE e.category_id = ?1 AND e.deleted_at IS NULL
        {}
        LIMIT ?2 OFFSET ?3
    "#, order_clause);
    
    let mut stmt = conn.prepare(&query).map_err(|e| e.to_string())?;
    let rows = stmt
        .query_map([category_id, limit as i64, offset as i64], |row| {
            Ok(LedgerEntry {
                entry_id: row.get(0)?,
                category_id: row.get(1)?,
                entry_type: row.get(2)?,
                what: row.get(3)?,
                r#where: row.get(4)?,
                amount: row.get(5)?,
                date: row.get(6)?,
                created_at: row.get(7)?,
            })
        })
        .map_err(|e| e.to_string())?;
    
    let mut results = Vec::new();
    for r in rows {
        results.push(r.map_err(|e| e.to_string())?);
    }
    
    println!("Found {} ledger entries", results.len());
    Ok(results)
}

#[tauri::command]
pub fn add_category_entry(payload: NewEntry, db: State<DbState>) -> Result<LedgerEntry, String> {
    println!("=== ADD_CATEGORY_ENTRY COMMAND CALLED ===");
    println!("Adding entry: {:?}", payload);
    
    let mut conn = db.get_conn().map_err(|e| e.to_string())?;
    let tx = conn.transaction().map_err(|e| e.to_string())?;
    
    // Get category info for logging
    let category_info: (String, i64) = tx.query_row(
        "SELECT category_name, budget_id FROM budget_categories WHERE category_id = ?1",
        [payload.category_id],
        |row| Ok((row.get::<_, String>(0)?, row.get::<_, i64>(1)?))
    ).map_err(|e| format!("Category not found: {}", e))?;
    
    // Insert the entry
    tx.execute(
        "INSERT INTO expenses (category_id, entry_type, description, place, amount, date, created_at) 
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, datetime('now'))",
        rusqlite::params![
            payload.category_id,
            payload.entry_type,
            payload.what,
            payload.r#where,
            payload.amount,
            payload.date
        ],
    ).map_err(|e| e.to_string())?;
    
    let entry_id = tx.last_insert_rowid();
    
    // Get the created entry
    let entry: LedgerEntry = tx.query_row(
        "SELECT expense_id, category_id, entry_type, description, place, amount, date, created_at 
         FROM expenses WHERE expense_id = ?1",
        [entry_id],
        |row| Ok(LedgerEntry {
            entry_id: row.get(0)?,
            category_id: row.get(1)?,
            entry_type: row.get(2)?,
            what: row.get(3)?,
            r#where: row.get(4)?,
            amount: row.get(5)?,
            date: row.get(6)?,
            created_at: row.get(7)?,
        })
    ).map_err(|e| e.to_string())?;
    
    // Log change history
    let place_text = payload.r#where.as_deref().unwrap_or("");
    let place_display = if place_text.is_empty() { "" } else { &format!(" @ {}", place_text) };
    let description = format!("Added {} ${:.2} to {} ({}{})", 
                            payload.entry_type, payload.amount, category_info.0, payload.what, place_display);
    
    log_budget_change(&*tx, category_info.1, "entry_add", Some("expenses"), 
                     None, Some(&format!("{:.2}", payload.amount)), &description)?;
    
    tx.commit().map_err(|e| e.to_string())?;
    
    println!("Successfully added entry with ID: {}", entry_id);
    Ok(entry)
}

#[tauri::command]
pub fn update_category_entry(payload: UpdateEntry, db: State<DbState>) -> Result<(), String> {
    println!("=== UPDATE_CATEGORY_ENTRY COMMAND CALLED ===");
    println!("Updating entry: {:?}", payload);
    
    let mut conn = db.get_conn().map_err(|e| e.to_string())?;
    let tx = conn.transaction().map_err(|e| e.to_string())?;
    
    // Get category info for logging
    let category_info: (String, i64) = tx.query_row(
        "SELECT bc.category_name, bc.budget_id FROM budget_categories bc 
         JOIN expenses e ON e.category_id = bc.category_id 
         WHERE e.expense_id = ?1",
        [payload.entry_id],
        |row| Ok((row.get::<_, String>(0)?, row.get::<_, i64>(1)?))
    ).map_err(|e| format!("Entry or category not found: {}", e))?;
    
    // Update the entry
    let rows_affected = tx.execute(
        "UPDATE expenses SET entry_type = ?1, description = ?2, place = ?3, amount = ?4, date = ?5 
         WHERE expense_id = ?6 AND deleted_at IS NULL",
        rusqlite::params![
            payload.entry_type,
            payload.what,
            payload.r#where,
            payload.amount,
            payload.date,
            payload.entry_id
        ],
    ).map_err(|e| e.to_string())?;
    
    if rows_affected == 0 {
        return Err("Entry not found or already deleted".to_string());
    }
    
    // Log change history
    let description = format!("Updated entry {} in {}", payload.entry_id, category_info.0);
    log_budget_change(&*tx, category_info.1, "entry_update", Some("expenses"), 
                     None, None, &description)?;
    
    tx.commit().map_err(|e| e.to_string())?;
    
    println!("Successfully updated entry with ID: {}", payload.entry_id);
    Ok(())
}

#[tauri::command]
pub fn soft_delete_category_entry(entry_id: i64, db: State<DbState>) -> Result<(), String> {
    println!("=== SOFT_DELETE_CATEGORY_ENTRY COMMAND CALLED ===");
    println!("Soft deleting entry ID: {}", entry_id);
    
    let mut conn = db.get_conn().map_err(|e| e.to_string())?;
    let tx = conn.transaction().map_err(|e| e.to_string())?;
    
    // Get category info for logging
    let category_info: (String, i64) = tx.query_row(
        "SELECT bc.category_name, bc.budget_id FROM budget_categories bc 
         JOIN expenses e ON e.category_id = bc.category_id 
         WHERE e.expense_id = ?1",
        [entry_id],
        |row| Ok((row.get::<_, String>(0)?, row.get::<_, i64>(1)?))
    ).map_err(|e| format!("Entry or category not found: {}", e))?;
    
    // Soft delete the entry
    let rows_affected = tx.execute(
        "UPDATE expenses SET deleted_at = datetime('now') WHERE expense_id = ?1 AND deleted_at IS NULL",
        [entry_id],
    ).map_err(|e| e.to_string())?;
    
    if rows_affected == 0 {
        return Err("Entry not found or already deleted".to_string());
    }
    
    // Log change history
    let description = format!("Deleted entry {} from {}", entry_id, category_info.0);
    log_budget_change(&*tx, category_info.1, "entry_delete", Some("expenses"), 
                     None, None, &description)?;
    
    tx.commit().map_err(|e| e.to_string())?;
    
    println!("Successfully soft deleted entry with ID: {}", entry_id);
    Ok(())
}

#[tauri::command]
pub fn set_category_allocated_amount(category_id: i64, amount: f64, db: State<DbState>) -> Result<(), String> {
    println!("=== SET_CATEGORY_ALLOCATED_AMOUNT COMMAND CALLED ===");
    println!("Setting allocated amount for category ID: {}, amount: {}", category_id, amount);
    
    let mut conn = db.get_conn().map_err(|e| e.to_string())?;
    let tx = conn.transaction().map_err(|e| e.to_string())?;
    
    // Get current allocated amount and category info for logging
    let (current_amount, category_name, budget_id): (f64, String, i64) = tx.query_row(
        "SELECT allocated_amount, category_name, budget_id FROM budget_categories WHERE category_id = ?1",
        [category_id],
        |row| Ok((row.get(0)?, row.get(1)?, row.get(2)?))
    ).map_err(|e| format!("Category not found: {}", e))?;
    
    // Update allocated amount
    let rows_affected = tx.execute(
        "UPDATE budget_categories SET allocated_amount = ?1 WHERE category_id = ?2",
        rusqlite::params![amount, category_id],
    ).map_err(|e| e.to_string())?;
    
    if rows_affected == 0 {
        return Err("Category not found".to_string());
    }
    
    // Log change history
    let description = format!("Updated allocated for {} ${:.2} → ${:.2}", 
                            category_name, current_amount, amount);
    log_budget_change(&*tx, budget_id, "allocation_change", Some("allocated_amount"), 
                     Some(&format!("{:.2}", current_amount)), Some(&format!("{:.2}", amount)), &description)?;
    
    tx.commit().map_err(|e| e.to_string())?;
    
    println!("Successfully updated allocated amount for category ID: {}", category_id);
    Ok(())
}

#[tauri::command]
pub fn add_budget_category(payload: NewCategory, db: State<DbState>) -> Result<i64, String> {
    println!("=== ADD_BUDGET_CATEGORY COMMAND CALLED ===");
    println!("Adding category: {:?}", payload);
    
    let mut conn = db.get_conn().map_err(|e| e.to_string())?;
    let tx = conn.transaction().map_err(|e| e.to_string())?;
    
    // Insert the category
    tx.execute(
        "INSERT INTO budget_categories (budget_id, category_name, allocated_amount, created_at) 
         VALUES (?1, ?2, ?3, datetime('now'))",
        rusqlite::params![
            payload.budget_id,
            payload.category_name,
            payload.allocated_amount
        ],
    ).map_err(|e| e.to_string())?;
    
    let category_id = tx.last_insert_rowid();
    
    // Log change history
    let description = format!("Added category '{}' with allocated ${:.2}", 
                            payload.category_name, payload.allocated_amount);
    log_budget_change(&*tx, payload.budget_id, "category_add", Some("budget_categories"), 
                     None, Some(&payload.category_name), &description)?;
    
    tx.commit().map_err(|e| e.to_string())?;
    
    println!("Successfully added category with ID: {}", category_id);
    Ok(category_id)
}

// Template System Commands
#[tauri::command]
pub fn create_template(name: String, db: State<DbState>) -> Result<i64, String> {
    println!("=== CREATE_TEMPLATE COMMAND CALLED ===");
    println!("Creating template: {}", name);
    
    let conn = db.get_conn().map_err(|e| e.to_string())?;
    
    conn.execute(
        "INSERT INTO budget_templates (name, created_at) VALUES (?1, datetime('now'))",
        [&name],
    ).map_err(|e| e.to_string())?;
    
    let template_id = conn.last_insert_rowid();
    
    println!("Successfully created template with ID: {}", template_id);
    Ok(template_id)
}

#[tauri::command]
pub fn list_templates(db: State<DbState>) -> Result<Vec<BudgetTemplate>, String> {
    println!("=== LIST_TEMPLATES COMMAND CALLED ===");
    
    let conn = db.get_conn().map_err(|e| e.to_string())?;
    let mut stmt = conn
        .prepare("SELECT template_id, name, created_at FROM budget_templates ORDER BY created_at DESC")
        .map_err(|e| e.to_string())?;
    
    let rows = stmt
        .query_map([], |row| {
            Ok(BudgetTemplate {
                template_id: row.get(0)?,
                name: row.get(1)?,
                created_at: row.get(2)?,
            })
        })
        .map_err(|e| e.to_string())?;
    
    let mut results = Vec::new();
    for r in rows {
        results.push(r.map_err(|e| e.to_string())?);
    }
    
    println!("Found {} templates", results.len());
    Ok(results)
}

#[tauri::command]
pub fn run_migration(db: State<DbState>) -> Result<String, String> {
    let conn = db.get_conn().map_err(|e| e.to_string())?;
    
    // Create global categories table
    conn.execute(
        "CREATE TABLE IF NOT EXISTS global_categories (
            global_category_id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL UNIQUE,
            description TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )",
        [],
    ).map_err(|e| e.to_string())?;
    
    // Create budget templates table
    conn.execute(
        "CREATE TABLE IF NOT EXISTS budget_templates (
            template_id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            description TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )",
        [],
    ).map_err(|e| e.to_string())?;
    
    // Create template categories table
    conn.execute(
        "CREATE TABLE IF NOT EXISTS template_categories (
            template_category_id INTEGER PRIMARY KEY AUTOINCREMENT,
            template_id INTEGER NOT NULL,
            global_category_id INTEGER NOT NULL,
            allocated_amount REAL NOT NULL DEFAULT 0.0,
            category_type TEXT NOT NULL DEFAULT 'expense',
            sort_order INTEGER DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (template_id) REFERENCES budget_templates(template_id) ON DELETE CASCADE,
            FOREIGN KEY (global_category_id) REFERENCES global_categories(global_category_id) ON DELETE CASCADE
        )",
        [],
    ).map_err(|e| e.to_string())?;
    
    // Add columns that might not exist (ignore errors for existing columns)
    let _ = conn.execute("ALTER TABLE MonthlyBudgets ADD COLUMN template_id INTEGER REFERENCES budget_templates(template_id)", []);
    let _ = conn.execute("ALTER TABLE budget_categories ADD COLUMN global_category_id INTEGER REFERENCES global_categories(global_category_id)", []);
    let _ = conn.execute("ALTER TABLE budget_categories ADD COLUMN category_type TEXT DEFAULT 'expense'", []);
    
    // Create indexes
    conn.execute("CREATE INDEX IF NOT EXISTS idx_template_categories_template_id ON template_categories(template_id)", []).map_err(|e| e.to_string())?;
    conn.execute("CREATE INDEX IF NOT EXISTS idx_template_categories_global_category_id ON template_categories(global_category_id)", []).map_err(|e| e.to_string())?;
    conn.execute("CREATE INDEX IF NOT EXISTS idx_budget_categories_global_category_id ON budget_categories(global_category_id)", []).map_err(|e| e.to_string())?;
    conn.execute("CREATE INDEX IF NOT EXISTS idx_monthly_budgets_template_id ON MonthlyBudgets(template_id)", []).map_err(|e| e.to_string())?;
    
    // Insert default categories
    let default_categories = [
        ("Food & Dining", "Groceries, restaurants, and food expenses"),
        ("Transportation", "Gas, public transport, car maintenance"),
        ("Housing", "Rent, mortgage, utilities, home maintenance"),
        ("Healthcare", "Medical expenses, insurance, medications"),
        ("Entertainment", "Movies, games, hobbies, subscriptions"),
        ("Shopping", "Clothing, personal items, general shopping"),
        ("Education", "Books, courses, training, school supplies"),
        ("Savings", "Emergency fund, retirement, investments"),
        ("Insurance", "Life, health, car, home insurance"),
        ("Debt Payment", "Credit cards, loans, other debt payments"),
    ];
    
    for (name, description) in default_categories.iter() {
        let _ = conn.execute(
            "INSERT OR IGNORE INTO global_categories (name, description) VALUES (?1, ?2)",
            rusqlite::params![name, description],
        );
    }
    
    conn.execute("PRAGMA foreign_keys = ON", []).map_err(|e| e.to_string())?;
    
    Ok("Migration completed successfully".to_string())
}

// ===== GLOBAL CATEGORIES MANAGEMENT =====

#[derive(Debug, Serialize, Deserialize)]
pub struct GlobalCategory {
    pub global_category_id: i64,
    pub name: String,
    pub description: Option<String>,
    pub created_at: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CreateGlobalCategoryArgs {
    pub name: String,
    pub description: Option<String>,
}

#[tauri::command]
pub fn get_global_categories(db: State<DbState>) -> Result<Vec<GlobalCategory>, String> {
    let conn = db.get_conn().map_err(|e| e.to_string())?;
    
    let mut stmt = conn.prepare(
        "SELECT global_category_id, name, description, created_at 
         FROM global_categories 
         ORDER BY name"
    ).map_err(|e| e.to_string())?;
    
    let rows = stmt.query_map([], |row| {
        Ok(GlobalCategory {
            global_category_id: row.get(0)?,
            name: row.get(1)?,
            description: row.get(2)?,
            created_at: row.get(3)?,
        })
    }).map_err(|e| e.to_string())?;
    
    let mut categories = Vec::new();
    for row in rows {
        categories.push(row.map_err(|e| e.to_string())?);
    }
    
    Ok(categories)
}

#[tauri::command]
pub fn create_global_category(db: State<DbState>, args: CreateGlobalCategoryArgs) -> Result<GlobalCategory, String> {
    let conn = db.get_conn().map_err(|e| e.to_string())?;
    
    conn.execute(
        "INSERT INTO global_categories (name, description) VALUES (?1, ?2)",
        rusqlite::params![args.name, args.description],
    ).map_err(|e| format!("Failed to create category: {}", e))?;
    
    let category_id = conn.last_insert_rowid();
    
    // Get the created category
    let category: GlobalCategory = conn.query_row(
        "SELECT global_category_id, name, description, created_at FROM global_categories WHERE global_category_id = ?1",
        [category_id],
        |row| Ok(GlobalCategory {
            global_category_id: row.get(0)?,
            name: row.get(1)?,
            description: row.get(2)?,
            created_at: row.get(3)?,
        })
    ).map_err(|e| format!("Failed to retrieve created category: {}", e))?;
    
    Ok(category)
}

#[tauri::command]
pub fn update_global_category(db: State<DbState>, category_id: i64, args: CreateGlobalCategoryArgs) -> Result<GlobalCategory, String> {
    let conn = db.get_conn().map_err(|e| e.to_string())?;
    
    let rows_affected = conn.execute(
        "UPDATE global_categories SET name = ?1, description = ?2, updated_at = CURRENT_TIMESTAMP WHERE global_category_id = ?3",
        rusqlite::params![args.name, args.description, category_id],
    ).map_err(|e| format!("Failed to update category: {}", e))?;
    
    if rows_affected == 0 {
        return Err("Category not found".to_string());
    }
    
    // Get the updated category
    let category: GlobalCategory = conn.query_row(
        "SELECT global_category_id, name, description, created_at FROM global_categories WHERE global_category_id = ?1",
        [category_id],
        |row| Ok(GlobalCategory {
            global_category_id: row.get(0)?,
            name: row.get(1)?,
            description: row.get(2)?,
            created_at: row.get(3)?,
        })
    ).map_err(|e| format!("Failed to retrieve updated category: {}", e))?;
    
    Ok(category)
}

#[tauri::command]
pub fn delete_global_category(db: State<DbState>, category_id: i64) -> Result<(), String> {
    let conn = db.get_conn().map_err(|e| e.to_string())?;
    
    let rows_affected = conn.execute(
        "DELETE FROM global_categories WHERE global_category_id = ?1",
        [category_id],
    ).map_err(|e| format!("Failed to delete category: {}", e))?;
    
    if rows_affected == 0 {
        return Err("Category not found".to_string());
    }
    
    Ok(())
}

// ===== BUDGET TEMPLATES MANAGEMENT =====

#[derive(Debug, Serialize, Deserialize)]
pub struct BudgetTemplateSimple {
    pub template_id: i64,
    pub name: String,
    pub description: Option<String>,
    pub created_at: String,
    pub category_count: i32,
    pub total_amount: f64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct BudgetTemplateWithCategories {
    pub template_id: i64,
    pub name: String,
    pub description: Option<String>,
    pub created_at: String,
    pub categories: Vec<TemplateCategoryItem>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct TemplateCategoryItem {
    pub template_category_id: i64,
    pub global_category_id: i64,
    pub category_name: String,
    pub allocated_amount: f64,
    pub category_type: String,
    pub sort_order: i32,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CreateBudgetTemplateArgs {
    pub name: String,
    pub description: Option<String>,
    pub categories: Vec<CreateTemplateCategoryArgs>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CreateTemplateCategoryArgs {
    pub global_category_id: i64,
    pub allocated_amount: f64,
    pub category_type: String, // 'expense' or 'savings'
    pub sort_order: i32,
}

#[tauri::command]
pub fn get_budget_templates(db: State<DbState>) -> Result<Vec<BudgetTemplateSimple>, String> {
    let conn = db.get_conn().map_err(|e| e.to_string())?;
    
    let mut stmt = conn.prepare(
        "SELECT bt.template_id, bt.name, bt.description, bt.created_at,
                COUNT(tc.template_category_id) as category_count,
                COALESCE(SUM(tc.allocated_amount), 0) as total_amount
         FROM budget_templates bt
         LEFT JOIN template_categories tc ON bt.template_id = tc.template_id
         GROUP BY bt.template_id, bt.name, bt.description, bt.created_at
         ORDER BY bt.created_at DESC"
    ).map_err(|e| e.to_string())?;
    
    let rows = stmt.query_map([], |row| {
        Ok(BudgetTemplateSimple {
            template_id: row.get(0)?,
            name: row.get(1)?,
            description: row.get(2)?,
            created_at: row.get(3)?,
            category_count: row.get(4)?,
            total_amount: row.get(5)?,
        })
    }).map_err(|e| e.to_string())?;
    
    let mut templates = Vec::new();
    for row in rows {
        templates.push(row.map_err(|e| e.to_string())?);
    }
    
    Ok(templates)
}

#[tauri::command]
pub fn get_budget_template_with_categories(db: State<DbState>, template_id: i64) -> Result<BudgetTemplateWithCategories, String> {
    let conn = db.get_conn().map_err(|e| e.to_string())?;
    
    // Get template info
    let template: (String, Option<String>, String) = conn.query_row(
        "SELECT name, description, created_at FROM budget_templates WHERE template_id = ?1",
        [template_id],
        |row| Ok((row.get(0)?, row.get(1)?, row.get(2)?))
    ).map_err(|e| format!("Template not found: {}", e))?;
    
    // Get template categories
    let mut stmt = conn.prepare(
        "SELECT tc.template_category_id, tc.global_category_id, gc.name, 
                tc.allocated_amount, tc.category_type, tc.sort_order
         FROM template_categories tc
         JOIN global_categories gc ON tc.global_category_id = gc.global_category_id
         WHERE tc.template_id = ?1
         ORDER BY tc.sort_order, tc.template_category_id"
    ).map_err(|e| e.to_string())?;
    
    let rows = stmt.query_map([template_id], |row| {
        Ok(TemplateCategoryItem {
            template_category_id: row.get(0)?,
            global_category_id: row.get(1)?,
            category_name: row.get(2)?,
            allocated_amount: row.get(3)?,
            category_type: row.get(4)?,
            sort_order: row.get(5)?,
        })
    }).map_err(|e| e.to_string())?;
    
    let mut categories = Vec::new();
    for row in rows {
        categories.push(row.map_err(|e| e.to_string())?);
    }
    
    Ok(BudgetTemplateWithCategories {
        template_id,
        name: template.0,
        description: template.1,
        created_at: template.2,
        categories,
    })
}

#[tauri::command]
pub fn create_budget_template(db: State<DbState>, args: CreateBudgetTemplateArgs) -> Result<BudgetTemplateWithCategories, String> {
    let mut conn = db.get_conn().map_err(|e| e.to_string())?;
    let tx = conn.transaction().map_err(|e| e.to_string())?;
    
    // Create template
    tx.execute(
        "INSERT INTO budget_templates (name, description) VALUES (?1, ?2)",
        rusqlite::params![args.name, args.description],
    ).map_err(|e| format!("Failed to create template: {}", e))?;
    
    let template_id = tx.last_insert_rowid();
    
    // Create template categories
    for category_args in args.categories {
        tx.execute(
            "INSERT INTO template_categories (template_id, global_category_id, allocated_amount, category_type, sort_order)
             VALUES (?1, ?2, ?3, ?4, ?5)",
            rusqlite::params![
                template_id,
                category_args.global_category_id,
                category_args.allocated_amount,
                category_args.category_type,
                category_args.sort_order
            ],
        ).map_err(|e| format!("Failed to create template category: {}", e))?;
    }
    
    tx.commit().map_err(|e| e.to_string())?;
    
    // Return the created template with categories
    get_budget_template_with_categories(db, template_id)
}

#[tauri::command]
pub fn update_budget_template(db: State<DbState>, template_id: i64, args: CreateBudgetTemplateArgs) -> Result<BudgetTemplateWithCategories, String> {
    let mut conn = db.get_conn().map_err(|e| e.to_string())?;
    let tx = conn.transaction().map_err(|e| e.to_string())?;
    
    // Update template
    let rows_affected = tx.execute(
        "UPDATE budget_templates SET name = ?1, description = ?2, updated_at = CURRENT_TIMESTAMP WHERE template_id = ?3",
        rusqlite::params![args.name, args.description, template_id],
    ).map_err(|e| format!("Failed to update template: {}", e))?;
    
    if rows_affected == 0 {
        return Err("Template not found".to_string());
    }
    
    // Delete existing template categories
    tx.execute(
        "DELETE FROM template_categories WHERE template_id = ?1",
        [template_id],
    ).map_err(|e| format!("Failed to delete existing categories: {}", e))?;
    
    // Create new template categories
    for category_args in args.categories {
        tx.execute(
            "INSERT INTO template_categories (template_id, global_category_id, allocated_amount, category_type, sort_order)
             VALUES (?1, ?2, ?3, ?4, ?5)",
            rusqlite::params![
                template_id,
                category_args.global_category_id,
                category_args.allocated_amount,
                category_args.category_type,
                category_args.sort_order
            ],
        ).map_err(|e| format!("Failed to create template category: {}", e))?;
    }
    
    tx.commit().map_err(|e| e.to_string())?;
    
    // Return the updated template with categories
    get_budget_template_with_categories(db, template_id)
}

#[tauri::command]
pub fn delete_budget_template(db: State<DbState>, template_id: i64) -> Result<(), String> {
    let conn = db.get_conn().map_err(|e| e.to_string())?;
    
    let rows_affected = conn.execute(
        "DELETE FROM budget_templates WHERE template_id = ?1",
        [template_id],
    ).map_err(|e| format!("Failed to delete template: {}", e))?;
    
    if rows_affected == 0 {
        return Err("Template not found".to_string());
    }
    
    Ok(())
}

#[tauri::command]
pub fn apply_template_to_budget(budget_id: i64, template_id: i64, db: State<DbState>) -> Result<(), String> {
    let mut conn = db.get_conn().map_err(|e| e.to_string())?;
    let tx = conn.transaction().map_err(|e| e.to_string())?;
    
    // Verify budget exists
    let _budget_exists: bool = tx.query_row(
        "SELECT 1 FROM monthly_budgets WHERE budget_id = ?1",
        [budget_id],
        |_| Ok(true)
    ).map_err(|_| "Budget not found".to_string())?;
    
    // Get template name for logging
    let template_name: String = tx.query_row(
        "SELECT name FROM budget_templates WHERE template_id = ?1",
        [template_id],
        |row| row.get(0)
    ).map_err(|_| "Template not found".to_string())?;
    
    // Update budget to use this template
    tx.execute(
        "UPDATE monthly_budgets SET template_id = ?1, updated_at = CURRENT_TIMESTAMP WHERE budget_id = ?2",
        rusqlite::params![template_id, budget_id],
    ).map_err(|e| e.to_string())?;
    
    // Clear existing budget categories
    tx.execute(
        "DELETE FROM budget_categories WHERE budget_id = ?1",
        [budget_id],
    ).map_err(|e| e.to_string())?;
    
    // Get template categories and create budget categories
    let template_categories: Vec<(i64, String, f64, String)> = {
        let mut stmt = tx.prepare(
            "SELECT tc.global_category_id, gc.name, tc.allocated_amount, tc.category_type
             FROM template_categories tc
             JOIN global_categories gc ON tc.global_category_id = gc.global_category_id
             WHERE tc.template_id = ?1
             ORDER BY tc.sort_order, tc.template_category_id"
        ).map_err(|e| e.to_string())?;
        
        let rows = stmt.query_map([template_id], |row| {
            Ok((
                row.get::<_, i64>(0)?,     // global_category_id
                row.get::<_, String>(1)?,  // name
                row.get::<_, f64>(2)?,     // allocated_amount
                row.get::<_, String>(3)?,  // category_type
            ))
        }).map_err(|e| e.to_string())?;
        
        let mut categories = Vec::new();
        for row_result in rows {
            categories.push(row_result.map_err(|e| e.to_string())?);
        }
        categories
    };
    
    let mut created_count = 0;
    for (global_category_id, category_name, allocated_amount, category_type) in template_categories {
        tx.execute(
            "INSERT INTO budget_categories (budget_id, global_category_id, category_name, allocated_amount, category_type, created_at) 
             VALUES (?1, ?2, ?3, ?4, ?5, datetime('now'))",
            rusqlite::params![budget_id, global_category_id, category_name, allocated_amount, category_type],
        ).map_err(|e| e.to_string())?;
        
        created_count += 1;
    }
    
    // Log change history
    let description = format!("Applied template '{}' to budget ({} categories)", template_name, created_count);
    tx.execute(
        "INSERT INTO BudgetChangeHistory (budget_id, change_type, field_name, old_value, new_value, change_description) 
         VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
        rusqlite::params![
            budget_id, 
            "template_apply", 
            Some("budget_templates"), 
            None as Option<String>, 
            Some(&template_name), 
            &description
        ],
    ).map_err(|e| e.to_string())?;
    
    tx.commit().map_err(|e| e.to_string())?;
    
    println!("Successfully applied template '{}' with {} categories", template_name, created_count);
    Ok(())
}

