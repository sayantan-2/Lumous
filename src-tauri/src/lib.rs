mod commands;
mod models;
mod database;
mod indexer;
mod thumbnail;

use commands::*;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .plugin(tauri_plugin_dialog::init())
    .plugin(tauri_plugin_fs::init())
    .plugin(tauri_plugin_log::Builder::default()
      .level(log::LevelFilter::Info)
      .build())
    .invoke_handler(tauri::generate_handler![
      get_settings,
      update_settings,
      index_folder,
      get_files,
      get_thumbnail,
      create_album,
      add_to_album,
      search_files,
      edit_image,
      export_metadata,
      open_in_explorer,
      watch_folder
    ])
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
