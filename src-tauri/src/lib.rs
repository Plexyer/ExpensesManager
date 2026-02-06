// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/

mod encrypted_db;
mod file_header;
mod kdf;
mod migrations;

use encrypted_db::DbState;

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
            encrypted_db::diagnose_db_file,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
