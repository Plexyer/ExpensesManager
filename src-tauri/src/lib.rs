// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/

mod encrypted_db;
mod file_header;
mod kdf;
mod migrations;

use encrypted_db::DbState;
use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .manage(DbState::new())
        .invoke_handler(tauri::generate_handler![
            encrypted_db::create_encrypted_db,
            encrypted_db::open_encrypted_db,
            encrypted_db::get_db_info,
            encrypted_db::close_db,
            encrypted_db::save_db,
            encrypted_db::diagnose_db_file,
            encrypted_db::get_grid_data,
            // Global category commands
            encrypted_db::create_global_category,
            encrypted_db::list_global_categories,
            encrypted_db::delete_global_category,
            // Template commands
            encrypted_db::create_template,
            encrypted_db::list_templates,
            encrypted_db::get_template,
            encrypted_db::update_template,
            encrypted_db::delete_template,
            // Template category commands
            encrypted_db::get_template_categories,
            encrypted_db::add_category_to_template,
            encrypted_db::remove_category_from_template,
            encrypted_db::update_template_category_amount,
            // Period budget instance commands
            encrypted_db::create_period_from_template,
            encrypted_db::list_periods,
            encrypted_db::get_period,
            encrypted_db::delete_period,
        ])
        .build(tauri::generate_context!())
        .expect("error while building tauri application")
        .run(|app_handle, event| {
            if let tauri::RunEvent::Exit = event {
                // BUG-004: Save any open database before the app exits.
                // This prevents data loss when the user closes the window
                // without clicking "Close File".
                let db_state = app_handle.state::<DbState>();
                if let Err(e) = db_state.save_if_open() {
                    eprintln!("[BUG-004] Failed to save database on app exit: {}", e);
                }
            }
        });
}
