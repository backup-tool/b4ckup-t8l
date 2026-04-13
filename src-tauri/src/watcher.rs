use notify::{Config, Event, EventKind, RecommendedWatcher, Watcher};
use std::sync::mpsc;
use std::time::Duration;
use tauri::Emitter;

pub fn start_watcher(app_handle: tauri::AppHandle) {
    let (tx, rx) = mpsc::channel::<notify::Result<Event>>();

    let _watcher = RecommendedWatcher::new(tx, Config::default().with_poll_interval(Duration::from_secs(30)));

    if _watcher.is_err() {
        log::error!("Failed to create file watcher");
        return;
    }

    log::info!("File watcher started (events will be forwarded to frontend)");

    // Listen for events and forward to frontend
    loop {
        match rx.recv() {
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
            Err(_) => {
                break;
            }
        }
    }
}
