mod watcher;

use serde::Serialize;
use std::path::Path;
use std::time::Duration;
use tauri::Manager;

#[derive(Serialize, Clone)]
struct ScanResult {
    name: String,
    size_bytes: u64,
    modified_date: String,
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_sql::Builder::new().build())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_dialog::init())
        .setup(|app| {
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }

            // System Tray
            let show_i = tauri::menu::MenuItem::with_id(app, "show", "Show B4cKuP T8L", true, None::<&str>)?;
            let quit_i = tauri::menu::MenuItem::with_id(app, "quit", "Quit", true, None::<&str>)?;
            let menu = tauri::menu::Menu::with_items(app, &[&show_i, &tauri::menu::PredefinedMenuItem::separator(app)?, &quit_i])?;

            let icon = tauri::image::Image::from_bytes(include_bytes!("../icons/32x32.png"))?;

            let handle_menu = app.handle().clone();
            let handle_tray = app.handle().clone();

            tauri::tray::TrayIconBuilder::new()
                .icon(icon)
                .menu(&menu)
                .tooltip("B4cKuP T8L")
                .on_menu_event(move |_app, event| {
                    match event.id.as_ref() {
                        "show" => {
                            if let Some(w) = handle_menu.get_webview_window("main") {
                                w.show().ok();
                                w.set_focus().ok();
                            }
                        }
                        "quit" => { handle_menu.exit(0); }
                        _ => {}
                    }
                })
                .on_tray_icon_event(move |_tray, event| {
                    if let tauri::tray::TrayIconEvent::Click { .. } = event {
                        if let Some(w) = handle_tray.get_webview_window("main") {
                            w.show().ok();
                            w.set_focus().ok();
                        }
                    }
                })
                .build(app)?;

            // File watcher
            let handle = app.handle().clone();
            std::thread::spawn(move || {
                watcher::start_watcher(handle);
            });

            Ok(())
        })
        .on_window_event(|win, event| {
            if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                let _ = win.hide();
                api.prevent_close();
            }
        })
        .invoke_handler(tauri::generate_handler![
            get_dir_size,
            watch_directory,
            scan_directory,
            backup_database,
            list_db_backups,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

#[tauri::command]
async fn get_dir_size(path: String) -> Result<u64, String> {
    let resolved = resolve_path(&path);
    validate_path(&resolved)?;
    tokio::time::timeout(Duration::from_secs(120), tokio::task::spawn_blocking(move || {
        dir_size_recursive(&resolved, 100)
    }))
    .await
    .map_err(|_| "Directory size calculation timed out after 120 seconds".to_string())?
    .map_err(|e| format!("Task error: {}", e))
}

#[tauri::command]
async fn watch_directory(path: String) -> Result<bool, String> {
    let p = resolve_path(&path);
    validate_path(&p)?;
    if p.exists() && p.is_dir() {
        Ok(true)
    } else {
        Err(format!("Path not accessible: {}. Resolved to: {}", path, p.display()))
    }
}

/// Recursive size calculation with max depth limit for speed on NAS
fn dir_size_recursive(path: &Path, max_depth: usize) -> u64 {
    walkdir::WalkDir::new(path)
        .max_depth(max_depth)
        .into_iter()
        .filter_map(|e| e.ok())
        .filter(|e| e.file_type().is_file())
        .map(|e| e.metadata().map(|m| m.len()).unwrap_or(0))
        .sum()
}

/// Get creation date (birthtime) of a directory, fallback to modified date
fn dir_created_date(path: &Path) -> String {
    let date = std::fs::metadata(path)
        .and_then(|m| m.created().or_else(|_| m.modified()))
        .unwrap_or(std::time::SystemTime::UNIX_EPOCH);
    let dt: chrono::DateTime<chrono::Local> = date.into();
    dt.format("%Y-%m-%d").to_string()
}

/// Try to extract a date from a folder name (e.g. "2024-01-15", "Backup - Nr. 003 - 01.08.2024")
fn extract_date_from_name(name: &str) -> Option<String> {
    // Try YYYY-MM-DD
    let re_iso = regex_lite::Regex::new(r"(\d{4})-(\d{2})-(\d{2})").ok()?;
    if let Some(caps) = re_iso.captures(name) {
        return Some(format!("{}-{}-{}", &caps[1], &caps[2], &caps[3]));
    }
    // Try DD.MM.YYYY
    let re_de = regex_lite::Regex::new(r"(\d{2})\.(\d{2})\.(\d{4})").ok()?;
    if let Some(caps) = re_de.captures(name) {
        return Some(format!("{}-{}-{}", &caps[3], &caps[2], &caps[1]));
    }
    None
}

/// Validate that a path is safe to access (not a sensitive system directory)
fn validate_path(path: &Path) -> Result<(), String> {
    let path_str = path.to_string_lossy();

    // Reject overly long paths
    if path_str.len() > 4096 {
        return Err("Path exceeds maximum length of 4096 characters".to_string());
    }

    // Block sensitive system directories
    let blocked_prefixes: &[&str] = if cfg!(target_os = "macos") {
        &["/System", "/usr", "/bin", "/sbin", "/private/etc", "/private/var/root"]
    } else if cfg!(target_os = "windows") {
        &["C:\\Windows", "C:\\Program Files", "C:\\ProgramData"]
    } else {
        &["/bin", "/sbin", "/usr", "/boot", "/proc", "/sys", "/etc"]
    };

    for prefix in blocked_prefixes {
        if path_str.starts_with(prefix) {
            return Err(format!("Access to system directory '{}' is not allowed", prefix));
        }
    }

    // Reject paths with path traversal patterns
    if path_str.contains("..") {
        return Err("Path traversal ('..') is not allowed".to_string());
    }

    // Reject empty paths
    if path_str.trim().is_empty() {
        return Err("Path must not be empty".to_string());
    }

    Ok(())
}

fn resolve_path(path: &str) -> std::path::PathBuf {
    let p = path.trim();

    // Convert smb://Server/Share/... to /Volumes/Share/...
    if let Some(rest) = p.strip_prefix("smb://").or_else(|| p.strip_prefix("SMB://")) {
        // smb://Server/Share/path -> skip server name, mount at /Volumes/Share/path
        let parts: Vec<&str> = rest.splitn(2, '/').collect();
        if parts.len() == 2 {
            return Path::new("/Volumes").join(parts[1]);
        }
    }

    // Convert \\Server\Share\... to /Volumes/Share/...
    if p.starts_with("\\\\") {
        let normalized = p.replace('\\', "/");
        let rest = normalized.trim_start_matches('/');
        let parts: Vec<&str> = rest.splitn(2, '/').collect();
        if parts.len() == 2 {
            return Path::new("/Volumes").join(parts[1]);
        }
    }

    Path::new(p).to_path_buf()
}

#[tauri::command]
async fn scan_directory(path: String, mode: String) -> Result<Vec<ScanResult>, String> {
    if mode != "subdirectories" && mode != "flat" {
        return Err("Invalid scan mode. Must be 'subdirectories' or 'flat'.".to_string());
    }
    let root = resolve_path(&path);
    validate_path(&root)?;
    if !root.exists() || !root.is_dir() {
        return Err(format!("Path not accessible: {}. Resolved to: {}. Make sure the network share is mounted.", path, root.display()));
    }

    let mut results = Vec::new();

    if mode == "subdirectories" {
        // Each direct subdirectory = one backup
        let entries = std::fs::read_dir(&root)
            .map_err(|e| format!("Cannot read directory: {}", e))?;

        for entry in entries.flatten() {
            let entry_path = entry.path();
            if entry_path.is_dir() {
                let name = entry_path
                    .file_name()
                    .unwrap_or_default()
                    .to_string_lossy()
                    .to_string();
                // Skip size during scan for speed - user can calculate via "Scan sizes"
                let size = 0;
                let date = extract_date_from_name(&name)
                    .unwrap_or_else(|| dir_created_date(&entry_path));
                results.push(ScanResult {
                    name,
                    size_bytes: size,
                    modified_date: date,
                });
            }
        }

        // Sort by name (typically date-based folder names)
        results.sort_by(|a, b| a.name.cmp(&b.name));
    } else {
        // "flat" - entire directory is one backup
        let name = root
            .file_name()
            .unwrap_or_default()
            .to_string_lossy()
            .to_string();
        let size = 0;
        let modified = extract_date_from_name(&name)
            .unwrap_or_else(|| dir_created_date(&root));
        results.push(ScanResult {
            name,
            size_bytes: size,
            modified_date: modified,
        });
    }

    Ok(results)
}

#[tauri::command]
async fn backup_database(app_handle: tauri::AppHandle) -> Result<String, String> {
    let app_dir = app_handle.path()
        .app_data_dir()
        .map_err(|e| format!("Cannot get app dir: {}", e))?;

    let db_path = app_dir.join("backup-tracker.db");
    if !db_path.exists() {
        return Err("Database file not found".to_string());
    }

    let backup_dir = app_dir.join("db-backups");
    std::fs::create_dir_all(&backup_dir)
        .map_err(|e| format!("Cannot create backup dir: {}", e))?;

    let timestamp = chrono::Local::now().format("%Y-%m-%d_%H-%M-%S");
    let backup_name = format!("backup-tracker_{}.db", timestamp);
    let backup_path = backup_dir.join(&backup_name);

    std::fs::copy(&db_path, &backup_path)
        .map_err(|e| format!("Cannot copy database: {}", e))?;

    // Keep only last 10 backups
    let mut entries: Vec<_> = std::fs::read_dir(&backup_dir)
        .map_err(|e| format!("Cannot read backup dir: {}", e))?
        .filter_map(|e| e.ok())
        .filter(|e| e.file_name().to_string_lossy().ends_with(".db"))
        .collect();
    entries.sort_by_key(|e| std::cmp::Reverse(e.file_name()));
    for old in entries.into_iter().skip(10) {
        let _ = std::fs::remove_file(old.path());
    }

    Ok(backup_name)
}

#[derive(Serialize, Clone)]
struct DbBackupInfo {
    name: String,
    size_bytes: u64,
    created: String,
}

#[tauri::command]
async fn list_db_backups(app_handle: tauri::AppHandle) -> Result<Vec<DbBackupInfo>, String> {
    let app_dir = app_handle.path()
        .app_data_dir()
        .map_err(|e| format!("Cannot get app dir: {}", e))?;

    let backup_dir = app_dir.join("db-backups");
    if !backup_dir.exists() {
        return Ok(vec![]);
    }

    let mut results: Vec<DbBackupInfo> = vec![];
    for entry in std::fs::read_dir(&backup_dir)
        .map_err(|e| format!("{}", e))?
        .filter_map(|e| e.ok())
    {
        let name = entry.file_name().to_string_lossy().to_string();
        if !name.ends_with(".db") { continue; }
        let meta = entry.metadata().map_err(|e| format!("{}", e))?;
        let created: chrono::DateTime<chrono::Local> = meta.modified()
            .unwrap_or(std::time::SystemTime::UNIX_EPOCH)
            .into();
        results.push(DbBackupInfo {
            name,
            size_bytes: meta.len(),
            created: created.format("%Y-%m-%d %H:%M").to_string(),
        });
    }
    results.sort_by(|a, b| b.name.cmp(&a.name));
    Ok(results)
}
