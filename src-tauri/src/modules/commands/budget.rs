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


