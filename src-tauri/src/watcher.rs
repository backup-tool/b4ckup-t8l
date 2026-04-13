use notify::{Config, Event, EventKind, RecommendedWatcher, RecursiveMode, Watcher};
use std::collections::HashSet;
use std::path::Path;
use std::sync::mpsc;
use std::time::Duration;
use tauri::{Emitter, Manager};

pub fn start_watcher(app_handle: tauri::AppHandle) {
    let (tx, rx) = mpsc::channel::<notify::Result<Event>>();

    let mut watcher = match RecommendedWatcher::new(tx, Config::default().with_poll_interval(Duration::from_secs(30))) {
        Ok(w) => w,
        Err(e) => {
            log::error!("Failed to create file watcher: {:?}", e);
            return;
        }
    };

    log::info!("File watcher started");

    // Periodically refresh watched paths from DB via checking known locations
    let handle = app_handle.clone();
    let mut watched_paths: HashSet<String> = HashSet::new();

    // Check for new paths to watch every 5 minutes
    let mut last_check = std::time::Instant::now();

    loop {
        // Refresh watched directories periodically
        if last_check.elapsed() >= Duration::from_secs(300) || watched_paths.is_empty() {
            if let Ok(paths) = get_watch_paths(&handle) {
                for path_str in &paths {
                    if !watched_paths.contains(path_str) {
                        let p = Path::new(path_str);
                        if p.exists() && p.is_dir() {
                            match watcher.watch(p, RecursiveMode::NonRecursive) {
                                Ok(_) => {
                                    log::info!("Watching: {}", path_str);
                                    watched_paths.insert(path_str.clone());
                                }
                                Err(e) => {
                                    log::error!("Failed to watch {}: {:?}", path_str, e);
                                }
                            }
                        }
                    }
                }
                // Unwatch removed paths
                let to_remove: Vec<String> = watched_paths
                    .iter()
                    .filter(|p| !paths.contains(p))
                    .cloned()
                    .collect();
                for path_str in to_remove {
                    let _ = watcher.unwatch(Path::new(&path_str));
                    watched_paths.remove(&path_str);
                    log::info!("Unwatched: {}", path_str);
                }
            }
            last_check = std::time::Instant::now();
        }

        // Process events with timeout so we can loop back to check paths
        match rx.recv_timeout(Duration::from_secs(30)) {
            Ok(Ok(event)) => {
                match event.kind {
                    EventKind::Create(_) | EventKind::Modify(_) => {
                        let paths: Vec<String> = event
                            .paths
                            .iter()
                            .map(|p| p.to_string_lossy().to_string())
                            .collect();

                        let _ = app_handle.emit("fs-change", serde_json::json!({
                            "paths": paths,
                            "kind": format!("{:?}", event.kind),
                        }));
                    }
                    _ => {}
                }
            }
            Ok(Err(e)) => {
                log::error!("Watcher error: {:?}", e);
            }
            Err(mpsc::RecvTimeoutError::Timeout) => {
                // Normal timeout, continue loop to check for new paths
            }
            Err(mpsc::RecvTimeoutError::Disconnected) => {
                break;
            }
        }
    }
}

/// Get watch paths from storage locations that have auto_detect enabled
fn get_watch_paths(_app_handle: &tauri::AppHandle) -> Result<Vec<String>, String> {
    // We can't easily query SQLite from Rust without a shared DB handle,
    // so we use a simple approach: read from a known config location.
    // The frontend writes watched paths to a JSON file that we read here.
    let app_dir = _app_handle.path().app_data_dir()
        .map_err(|e| format!("{}", e))?;
    let watch_file = app_dir.join("watch-paths.json");

    if !watch_file.exists() {
        return Ok(vec![]);
    }

    let content = std::fs::read_to_string(&watch_file)
        .map_err(|e| format!("Cannot read watch-paths.json: {}", e))?;

    serde_json::from_str::<Vec<String>>(&content)
        .map_err(|e| format!("Cannot parse watch-paths.json: {}", e))
}
