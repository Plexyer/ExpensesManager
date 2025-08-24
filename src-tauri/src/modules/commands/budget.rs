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
    pub name: Option<String>,
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
                "INSERT INTO MonthlyBudgets (month, year, total_income, template_used, name, created_at) VALUES (?1, ?2, ?3, NULL, ?4, datetime('now'))",
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
        "INSERT INTO MonthlyBudgets (month, year, total_income, template_used, name, created_at) VALUES (?1, ?2, ?3, NULL, ?4, datetime('now'))",
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
        .prepare("SELECT budget_id, month, year, total_income, created_at, finished_at, name FROM MonthlyBudgets ORDER BY created_at DESC")
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
                name: row.get(6)?,
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
pub struct SortBudgetsArgs {
    pub criteria: String, // "income", "created_date", "finished_date", "budget_date", "name"
    pub ascending: bool,
}

#[tauri::command]
pub fn list_monthly_budgets_sorted(args: SortBudgetsArgs, db: State<DbState>) -> Result<Vec<BudgetSummary>, String> {
    let conn = db.get_conn().map_err(|e| e.to_string())?;
    
    let order_clause = match args.criteria.as_str() {
        "income" => "total_income",
        "created_date" => "created_at", 
        "finished_date" => "finished_at",
        "budget_date" => "year, month",
        "name" => "name COLLATE NOCASE",
        _ => "created_at", // default
    };
    
    let direction = if args.ascending { "ASC" } else { "DESC" };
    let null_handling = if args.criteria == "finished_date" {
        if args.ascending { "NULLS FIRST" } else { "NULLS LAST" }
    } else if args.criteria == "name" {
        if args.ascending { "NULLS LAST" } else { "NULLS FIRST" }
    } else {
        ""
    };
    
    let query = format!(
        "SELECT budget_id, month, year, total_income, created_at, finished_at, name FROM MonthlyBudgets ORDER BY {} {} {}",
        order_clause, direction, null_handling
    );
    
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
                name: row.get(6)?,
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


