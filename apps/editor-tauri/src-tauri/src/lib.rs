use std::fs;
use std::path::{Path, PathBuf};

use tauri::{AppHandle, RunEvent};
use tauri_plugin_dialog::{DialogExt, FilePath};

mod mcp_sidecar;

use mcp_sidecar::{
    get_mcp_server_logs, get_mcp_server_status, on_app_exit, start_mcp_server, stop_mcp_server,
    McpSidecarState,
};

#[tauri::command]
fn read_project_file(path: String) -> Result<String, String> {
    fs::read_to_string(&path).map_err(|e| e.to_string())
}

#[tauri::command]
fn write_project_file(path: String, contents: String) -> Result<(), String> {
    if let Some(parent) = PathBuf::from(&path).parent() {
        fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    fs::write(&path, contents).map_err(|e| e.to_string())
}

#[tauri::command]
fn path_exists(path: String) -> bool {
    Path::new(&path).exists()
}

#[tauri::command]
fn create_directory(path: String) -> Result<(), String> {
    fs::create_dir_all(&path).map_err(|e| e.to_string())
}

#[tauri::command]
async fn open_scene_dialog(app: AppHandle) -> Result<Option<String>, String> {
    let file = app
        .dialog()
        .file()
        .add_filter("Scene JSON", &["json"])
        .blocking_pick_file();

    Ok(file.map(|p| match p {
        FilePath::Path(path) => path.to_string_lossy().to_string(),
        FilePath::Url(url) => url.to_string(),
    }))
}

#[tauri::command]
async fn open_project_dialog(app: AppHandle) -> Result<Option<String>, String> {
    let file = app
        .dialog()
        .file()
        .add_filter("ArcForge Project", &["json"])
        .set_file_name("project.arcforge.json")
        .blocking_pick_file();

    Ok(file.map(|p| match p {
        FilePath::Path(path) => path.to_string_lossy().to_string(),
        FilePath::Url(url) => url.to_string(),
    }))
}

#[tauri::command]
async fn pick_folder_dialog(app: AppHandle) -> Result<Option<String>, String> {
    let folder = app.dialog().file().blocking_pick_folder();

    Ok(folder.map(|p| match p {
        FilePath::Path(path) => path.to_string_lossy().to_string(),
        FilePath::Url(url) => url.to_string(),
    }))
}

#[tauri::command]
async fn save_scene_dialog(
    app: AppHandle,
    default_name: String,
) -> Result<Option<String>, String> {
    let file = app
        .dialog()
        .file()
        .add_filter("Scene JSON", &["json"])
        .set_file_name(&default_name)
        .blocking_save_file();

    Ok(file.map(|p| match p {
        FilePath::Path(path) => path.to_string_lossy().to_string(),
        FilePath::Url(url) => url.to_string(),
    }))
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .manage(McpSidecarState::default())
        .invoke_handler(tauri::generate_handler![
            read_project_file,
            write_project_file,
            path_exists,
            create_directory,
            open_scene_dialog,
            open_project_dialog,
            pick_folder_dialog,
            save_scene_dialog,
            start_mcp_server,
            stop_mcp_server,
            get_mcp_server_status,
            get_mcp_server_logs
        ])
        .build(tauri::generate_context!())
        .expect("error while building tauri application")
        .run(|app_handle, event| {
            if let RunEvent::Exit = event {
                on_app_exit(app_handle);
            }
            // Also stop when the last window is destroyed (before full Exit on some platforms).
            if let RunEvent::ExitRequested { .. } = event {
                on_app_exit(app_handle);
            }
        });
}
