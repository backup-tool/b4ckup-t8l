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
      // Only notify for critical (paused backups have status "paused", not "critical")
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

    const titles: Record<string, string> = {
      de: `${newOverdue.length} Backup(s) überfällig`,
      fr: `${newOverdue.length} sauvegarde(s) en retard`,
      it: `${newOverdue.length} backup scaduti`,
      es: `${newOverdue.length} copia(s) vencida(s)`,
      pt: `${newOverdue.length} cópia(s) atrasada(s)`,
      nl: `${newOverdue.length} back-up(s) verlopen`,
    };
    const bodies: Record<string, string> = {
      de: `Kritisch: ${names}`,
      fr: `Critique : ${names}`,
      it: `Critico: ${names}`,
      es: `Crítico: ${names}`,
      pt: `Crítico: ${names}`,
      nl: `Kritiek: ${names}`,
    };
    const title = titles[lang] || `${newOverdue.length} backup(s) overdue`;
    const body = bodies[lang] || `Critical: ${names}`;

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
