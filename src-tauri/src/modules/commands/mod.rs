pub mod budget;
pub mod expense;
pub mod security;

// Simple greet for sanity
#[tauri::command]
pub fn greet(name: &str) -> String {
    format!("Hello, {}!", name)
}


