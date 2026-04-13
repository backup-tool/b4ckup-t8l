import { isPermissionGranted, requestPermission, sendNotification } from "@tauri-apps/plugin-notification";
import { getBackupsWithStatus } from "./db";

let checkInterval: ReturnType<typeof setInterval> | null = null;

export async function startBackupReminders() {
  // Check immediately on start
  await checkOverdueBackups();

  // Then check every 60 minutes
  if (checkInterval) clearInterval(checkInterval);
  checkInterval = setInterval(checkOverdueBackups, 60 * 60 * 1000);
}

async function checkOverdueBackups() {
  try {
    // Check notification permission
    let granted = await isPermissionGranted();
    if (!granted) {
      const permission = await requestPermission();
      granted = permission === "granted";
    }
    if (!granted) return;

    const backups = await getBackupsWithStatus();
    const overdue = backups.filter((b) => {
      if (b.status !== "critical") return false;
      // Only notify if it has entries (skip brand new backups with no history)
      return b.latest_entry !== null;
    });

    if (overdue.length === 0) return;

    // Don't spam - only notify once per session per backup
    const notifiedKey = "notified-backups";
    const alreadyNotified = new Set(
      JSON.parse(sessionStorage.getItem(notifiedKey) || "[]")
    );

    const newOverdue = overdue.filter(
      (b: any) => !alreadyNotified.has(b.id as number)
    );

    if (newOverdue.length === 0) return;

    // Send one combined notification
    const names = newOverdue.map((b: any) => b.name as string).join(", ");
    const lang = localStorage.getItem("language") || "en";

    const title = lang === "de"
      ? `${newOverdue.length} Backup(s) überfällig`
      : lang === "ru"
      ? `${newOverdue.length} бэкап(ов) просрочено`
      : `${newOverdue.length} backup(s) overdue`;

    const body = lang === "de"
      ? `Kritisch: ${names}`
      : lang === "ru"
      ? `Критические: ${names}`
      : `Critical: ${names}`;

    sendNotification({ title, body });

    // Mark as notified for this session
    for (const b of newOverdue) {
      alreadyNotified.add((b as any).id as number);
    }
    sessionStorage.setItem(notifiedKey, JSON.stringify([...alreadyNotified]));
  } catch (err) {
    console.error("Notification check failed:", err);
  }
}
