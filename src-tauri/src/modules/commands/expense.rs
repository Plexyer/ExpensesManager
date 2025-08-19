use serde::{Deserialize, Serialize};
use tauri::State;

use crate::modules::database::DbState;

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AddExpenseArgs {
    pub allocation_id: i64,
    pub amount: f64,
    pub description: String,
    pub date: String,
    pub location: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ExpenseRow {
    pub expense_id: i64,
    pub allocation_id: i64,
    pub amount: f64,
    pub description: String,
    pub date: String,
    pub location: Option<String>,
}

#[tauri::command]
pub fn add_expense(args: AddExpenseArgs, db: State<DbState>) -> Result<i64, String> {
    let conn = db.get_conn().map_err(|e| e.to_string())?;
    conn.execute(
        "INSERT INTO Expenses (allocation_id, amount, description, date, location) VALUES (?1, ?2, ?3, ?4, ?5)",
        rusqlite::params![args.allocation_id, args.amount, args.description, args.date, args.location],
    )
    .map_err(|e| e.to_string())?;
    Ok(conn.last_insert_rowid())
}

#[tauri::command]
pub fn list_expenses(allocation_id: i64, db: State<DbState>) -> Result<Vec<ExpenseRow>, String> {
    let conn = db.get_conn().map_err(|e| e.to_string())?;
    let mut stmt = conn
        .prepare("SELECT expense_id, allocation_id, amount, description, date, location FROM Expenses WHERE allocation_id = ?1 ORDER BY date DESC")
        .map_err(|e| e.to_string())?;
    let rows = stmt
        .query_map([allocation_id], |row| {
            Ok(ExpenseRow {
                expense_id: row.get(0)?,
                allocation_id: row.get(1)?,
                amount: row.get(2)?,
                description: row.get(3)?,
                date: row.get(4)?,
                location: row.get(5).ok(),
            })
        })
        .map_err(|e| e.to_string())?;
    let mut results = Vec::new();
    for r in rows {
        results.push(r.map_err(|e| e.to_string())?);
    }
    Ok(results)
}


