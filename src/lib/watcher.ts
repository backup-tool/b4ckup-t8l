import { listen } from "@tauri-apps/api/event";
import { invoke } from "@tauri-apps/api/core";
import { sendNotification, isPermissionGranted } from "@tauri-apps/plugin-notification";
import { getWatchedLocations, createEntry } from "./db";

interface FsChangePayload {
  paths: string[];
  kind: string;
}

let listening = false;

export async function startFileWatcher() {
  if (listening) return;
  listening = true;

  // Periodically check watched directories for changes (every 5 minutes)
  setInterval(checkWatchedDirectories, 5 * 60 * 1000);

  // Also check on startup after a delay
  setTimeout(checkWatchedDirectories, 10_000);

  // Listen for fs-change events from Rust watcher
  await listen<FsChangePayload>("fs-change", async (event) => {
    const { paths } = event.payload;
    if (!paths || paths.length === 0) return;

    try {
      const watched = await getWatchedLocations();
      for (const loc of watched) {
        const watchPath = loc.path_on_media as string;
        if (!watchPath) continue;

        // Check if any changed path is under a watched path
        const isRelevant = paths.some((p) =>
          p.startsWith(watchPath) || watchPath.startsWith(p)
        );

        if (isRelevant) {
          await handleWatchedChange(loc);
        }
      }
    } catch (err) {
      console.error("Watcher handler error:", err);
    }
  });
}

async function checkWatchedDirectories() {
  try {
    const watched = await getWatchedLocations();
    for (const loc of watched) {
      const watchPath = loc.path_on_media as string;
      if (!watchPath) continue;

      // Check if directory exists and get its modification time
      try {
        const exists = await invoke<boolean>("watch_directory", { path: watchPath });
        if (!exists) continue;
      } catch {
        continue;
      }

      await handleWatchedChange(loc);
    }
  } catch (err) {
    console.error("Watch check error:", err);
  }
}

async function handleWatchedChange(loc: Record<string, any>) {
  const watchPath = loc.path_on_media as string;
  const backupId = loc.backup_id as number;
  const mediaId = loc.storage_media_id as number;
  const scanMode = (loc.scan_mode as string) || "subdirectories";

  try {
    // Scan the directory
    const results = await invoke<Array<{ name: string; size_bytes: number; modified_date: string }>>(
      "scan_directory",
      { path: watchPath, mode: scanMode }
    );

    if (results.length === 0) return;

    // Get existing entries for this backup+media combination
    const { getEntriesForBackup } = await import("./db");
    const existing = await getEntriesForBackup(backupId);
    const existingDates = new Set(
      existing
        .filter((e) => (e.storage_media_id as number) === mediaId)
        .map((e) => (e.backup_date as string).split("T")[0])
    );

    // Find new entries that don't exist yet
    let newCount = 0;
    for (const r of results) {
      if (!existingDates.has(r.modified_date)) {
        await createEntry({
          backup_id: backupId,
          storage_media_id: mediaId,
          size_bytes: r.size_bytes,
          backup_date: r.modified_date,
          notes: r.name,
        });
        newCount++;
      }
    }

    // Notify if new backups were detected
    if (newCount > 0) {
      const granted = await isPermissionGranted();
      if (granted) {
        const backupName = loc.backup_name as string;
        const lang = localStorage.getItem("language") || "en";

        const title = lang === "de"
          ? `${newCount} neue(r) Backup-Eintrag/-e erkannt`
          : lang === "ru"
          ? `${newCount} новых записей обнаружено`
          : `${newCount} new backup entry/entries detected`;

        const body = lang === "de"
          ? `${backupName}: ${newCount} automatisch hinzugefügt`
          : lang === "ru"
          ? `${backupName}: ${newCount} добавлено автоматически`
          : `${backupName}: ${newCount} added automatically`;

        sendNotification({ title, body });
      }
    }
  } catch {
    // Silently ignore scan failures (path might not be accessible)
  }
}
