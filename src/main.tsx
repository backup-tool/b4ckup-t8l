import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./lib/i18n";
import "./index.css";
import { startBackupReminders } from "./lib/notifications";
import { startFileWatcher } from "./lib/watcher";
import { invoke } from "@tauri-apps/api/core";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// Start background services
startBackupReminders();
startFileWatcher();

// Auto-backup database on startup (max once per day)
const lastBackup = localStorage.getItem("last-db-backup");
const today = new Date().toISOString().split("T")[0];
if (lastBackup !== today) {
  invoke("backup_database").then(() => {
    localStorage.setItem("last-db-backup", today);
    console.log("DB backup created");
  }).catch(console.error);
}
