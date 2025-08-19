mod modules;
use modules::commands::{budget::*, expense::*, security::*, greet};
use modules::database::{init_state, DbState};
use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let app = tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            let state = init_state(&app.handle()).map_err(|e| Box::<dyn std::error::Error>::from(e.to_string()))?;
            app.manage::<DbState>(state);
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            greet,
            init_database,
            create_monthly_budget,
            list_monthly_budgets,
            add_expense,
            list_expenses,
            verify_master_password,
        ]);

    app.run(tauri::generate_context!())
        .expect("error while running tauri application");
}
