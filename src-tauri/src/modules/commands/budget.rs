use serde::{Deserialize, Serialize};
use tauri::State;

use crate::modules::database::{DbState, run_migrations};

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateBudgetArgs {
    pub month: u8,
    pub year: i32,
    pub total_income: f64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct BudgetSummary {
    pub budget_id: i64,
    pub month: u8,
    pub year: i32,
    pub total_income: f64,
}

#[tauri::command]
pub fn init_database(db: State<DbState>) -> Result<(), String> {
    run_migrations(&db).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn create_monthly_budget(args: CreateBudgetArgs, db: State<DbState>) -> Result<i64, String> {
    let mut conn = db.get_conn().map_err(|e| e.to_string())?;
    let tx = conn.transaction().map_err(|e| e.to_string())?;
    tx.execute(
        "INSERT INTO MonthlyBudgets (month, year, total_income, template_used) VALUES (?1, ?2, ?3, NULL)",
        rusqlite::params![args.month, args.year, args.total_income],
    ).map_err(|e| e.to_string())?;
    let id = tx.last_insert_rowid();
    tx.commit().map_err(|e| e.to_string())?;
    Ok(id)
}

#[tauri::command]
pub fn list_monthly_budgets(db: State<DbState>) -> Result<Vec<BudgetSummary>, String> {
    let conn = db.get_conn().map_err(|e| e.to_string())?;
    let mut stmt = conn
        .prepare("SELECT budget_id, month, year, total_income FROM MonthlyBudgets ORDER BY year DESC, month DESC")
        .map_err(|e| e.to_string())?;
    let rows = stmt
        .query_map([], |row| {
            Ok(BudgetSummary {
                budget_id: row.get(0)?,
                month: row.get(1)?,
                year: row.get(2)?,
                total_income: row.get(3)?,
            })
        })
        .map_err(|e| e.to_string())?;
    let mut results = Vec::new();
    for r in rows {
        results.push(r.map_err(|e| e.to_string())?);
    }
    Ok(results)
}


