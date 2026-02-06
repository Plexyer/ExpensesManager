// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/

mod stub_file;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            stub_file::create_stub_file,
            stub_file::read_stub_file_info,
            stub_file::verify_stub_password,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
