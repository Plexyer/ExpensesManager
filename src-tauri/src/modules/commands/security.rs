use serde::{Deserialize, Serialize};
use tauri::State;

use crate::modules::security::auth;
use crate::modules::database::DbState;

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct VerifyPasswordArgs {
    pub username: String,
    pub master_password: String,
}

#[tauri::command]
pub fn verify_master_password(args: VerifyPasswordArgs, db: State<DbState>) -> Result<bool, String> {
    let conn = db.get_conn().map_err(|e| e.to_string())?;
    auth::verify_password(&conn, &args.username, &args.master_password).map_err(|e| e.to_string())
}


