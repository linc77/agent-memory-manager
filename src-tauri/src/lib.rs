mod memory;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            memory::commands::scan_memories,
            memory::commands::get_source_excerpt,
            memory::commands::draft_correction,
            memory::commands::draft_correction_from_content,
            memory::commands::write_correction,
            memory::commands::run_codex_audit,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
