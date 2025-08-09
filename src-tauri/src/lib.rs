mod commands;
mod models;
mod indexer;
mod thumbnail;

use commands::*;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .plugin(tauri_plugin_dialog::init())
    .plugin(tauri_plugin_fs::init())
    .setup(|app| {
  // Load persisted DB (best-effort) at startup
  initialize_persistent_db();
      if cfg!(debug_assertions) {
        app.handle().plugin(
          tauri_plugin_log::Builder::default()
            .level(log::LevelFilter::Info)
            .build(),
        )?;
      }
      Ok(())
    })
    .invoke_handler(tauri::generate_handler![
      get_settings,
      update_settings,
      index_folder,
      index_folder_streaming,
      get_files,
      is_folder_indexed,
      get_indexed_folders,
      get_thumbnail,
      create_album,
      add_to_album,
      search_files,
      edit_image,
      export_metadata,
      open_in_explorer,
      watch_folder,
      get_library_state,
      update_last_selected_folder,
      reset_library,
      reset_folder
  ,get_sidecar_caption
    ])
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
