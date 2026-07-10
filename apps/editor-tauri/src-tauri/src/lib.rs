use std::fs;
use std::path::{Path, PathBuf};

use tauri::{AppHandle, RunEvent};
use tauri_plugin_dialog::{DialogExt, FilePath};
use tauri_plugin_updater::UpdaterExt;

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
fn list_project_files(
    project_root: String,
    relative_dir: String,
    extension: Option<String>,
) -> Result<Vec<String>, String> {
    let root = PathBuf::from(&project_root);
    let dir = root.join(&relative_dir);
    if !dir.is_dir() {
        return Ok(vec![]);
    }

    let ext = extension.unwrap_or_default();
    let mut out = Vec::new();
    collect_project_files(&root, &dir, &ext, &mut out)?;
    out.sort();
    Ok(out)
}

fn collect_project_files(
    root: &Path,
    dir: &Path,
    extension: &str,
    out: &mut Vec<String>,
) -> Result<(), String> {
    for entry in fs::read_dir(dir).map_err(|e| e.to_string())? {
        let path = entry.map_err(|e| e.to_string())?.path();
        if path.is_dir() {
            collect_project_files(root, &path, extension, out)?;
            continue;
        }
        if !path.is_file() {
            continue;
        }
        let name = path
            .file_name()
            .and_then(|name| name.to_str())
            .unwrap_or("");
        if !extension.is_empty() && !name.ends_with(extension) {
            continue;
        }
        out.push(
            path.strip_prefix(root)
                .map_err(|e| e.to_string())?
                .to_string_lossy()
                .replace('\\', "/"),
        );
    }
    Ok(())
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

#[tauri::command]
async fn check_for_update(app: AppHandle) -> Result<bool, String> {
    let update = app.updater().map_err(|e| e.to_string())?.check().await.map_err(|e| e.to_string())?;
    Ok(update.is_some())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_process::init())
        .manage(McpSidecarState::default())
        .invoke_handler(tauri::generate_handler![
            read_project_file,
            write_project_file,
            path_exists,
            create_directory,
            list_project_files,
            open_scene_dialog,
            open_project_dialog,
            pick_folder_dialog,
            save_scene_dialog,
            start_mcp_server,
            stop_mcp_server,
            get_mcp_server_status,
            get_mcp_server_logs,
            check_for_update
        ])
        .build(tauri::generate_context!())
        .expect("error while building tauri application")
        .run(|app_handle, event| {
            if let RunEvent::Exit = event {
                on_app_exit(app_handle);
            }
            if let RunEvent::ExitRequested { .. } = event {
                on_app_exit(app_handle);
            }
        });
}
