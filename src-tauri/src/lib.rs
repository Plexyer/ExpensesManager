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
            run_migration,
            create_monthly_budget,
            delete_monthly_budget,
            finish_monthly_budget,
            unfinish_monthly_budget,
            get_budget_change_history,
            update_budget_title,
            list_monthly_budgets,
            list_monthly_budgets_sorted,
            // Category Grid System
            get_budget_categories_with_stats,
            get_category_ledger,
            add_category_entry,
            update_category_entry,
            soft_delete_category_entry,
            set_category_allocated_amount,
            add_budget_category,
            // Global Categories
            get_global_categories,
            create_global_category,
            update_global_category,
            delete_global_category,
            // Budget Templates
            get_budget_templates,
            get_budget_template_with_categories,
            create_budget_template,
            update_budget_template,
            delete_budget_template,
            apply_template_to_budget,
            // Template System (legacy - can be removed later)
            create_template,
            list_templates,
            // Expenses (existing)
            add_expense,
            list_expenses,
            verify_master_password,
        ]);

    app.run(tauri::generate_context!())
        .expect("error while running tauri application");
}
