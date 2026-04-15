import { isPermissionGranted, requestPermission, sendNotification } from "@tauri-apps/plugin-notification";
import { getBackupsWithStatus } from "./db";

let checkInterval: ReturnType<typeof setInterval> | null = null;

const INTERVAL_MAP: Record<string, number> = {
  "1h": 60 * 60 * 1000,
  "6h": 6 * 60 * 60 * 1000,
  "12h": 12 * 60 * 60 * 1000,
  "24h": 24 * 60 * 60 * 1000,
};

export function isNotificationsEnabled(): boolean {
  return localStorage.getItem("notification-enabled") !== "false";
}

export function getNotificationInterval(): string {
  return localStorage.getItem("notification-interval") || "1h";
}

export async function startBackupReminders() {
  if (!isNotificationsEnabled()) return;

  await checkOverdueBackups();

  const interval = INTERVAL_MAP[getNotificationInterval()] || INTERVAL_MAP["1h"];
  if (checkInterval) clearInterval(checkInterval);
  checkInterval = setInterval(checkOverdueBackups, interval);
}

export function restartReminders() {
  if (checkInterval) clearInterval(checkInterval);
  startBackupReminders();
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
      sv: `${newOverdue.length} säkerhetskopia(or) försenade`,
      da: `${newOverdue.length} backup(s) forsinket`,
      no: `${newOverdue.length} sikkerhetskopi(er) forfalt`,
      fi: `${newOverdue.length} varmuuskopio(ta) myöhässä`,
      ro: `${newOverdue.length} copie(i) de rezervă întârziate`,
      pl: `${newOverdue.length} kopia(e) zaległa(e)`,
      cs: `${newOverdue.length} záloha(y) po termínu`,
      hu: `${newOverdue.length} biztonsági mentés lejárt`,
      bg: `${newOverdue.length} резервно(и) копие(я) просрочени`,
      sr: `${newOverdue.length} резервна(е) копија(е) касни`,
      hr: `${newOverdue.length} sigurnosna(e) kopija(e) kasni`,
      uk: `${newOverdue.length} резервна(их) копія(й) прострочено`,
      ru: `${newOverdue.length} бэкап(ов) просрочено`,
      el: `${newOverdue.length} αντίγραφα ασφαλείας εκπρόθεσμα`,
      tr: `${newOverdue.length} yedekleme gecikmiş`,
      ar: `${newOverdue.length} نسخ احتياطية متأخرة`,
      he: `${newOverdue.length} גיבויים באיחור`,
      fa: `${newOverdue.length} پشتیبان عقب‌افتاده`,
      ku: `${newOverdue.length} paşgirî dereng`,
      hy: `${newOverdue.length} պahoustdelay ուdelays`,
      ps: `${newOverdue.length} پشتاړې ځنډ شوي`,
      hi: `${newOverdue.length} बैकअप अतिदेय`,
      ur: `${newOverdue.length} بیک اپ میں تاخیر`,
      bn: `${newOverdue.length} ব্যাকআপ বিলম্বিত`,
      zh: `${newOverdue.length} 个备份已过期`,
      ja: `${newOverdue.length} 件のバックアップが期限切れ`,
      ko: `${newOverdue.length} 개 백업 기한 초과`,
      vi: `${newOverdue.length} bản sao lưu quá hạn`,
      th: `${newOverdue.length} การสำรองข้อมูลเลยกำหนด`,
      id: `${newOverdue.length} cadangan terlambat`,
      tl: `${newOverdue.length} backup na overdue`,
      sw: `Nakala ${newOverdue.length} zimechelewa`,
      am: `${newOverdue.length} ምdelays ጊdelays`,
    };
    const bodies: Record<string, string> = {
      de: `Kritisch: ${names}`,
      fr: `Critique : ${names}`,
      it: `Critico: ${names}`,
      es: `Crítico: ${names}`,
      pt: `Crítico: ${names}`,
      nl: `Kritiek: ${names}`,
      sv: `Kritisk: ${names}`,
      da: `Kritisk: ${names}`,
      no: `Kritisk: ${names}`,
      fi: `Kriittinen: ${names}`,
      ro: `Critic: ${names}`,
      pl: `Krytyczny: ${names}`,
      cs: `Kritické: ${names}`,
      hu: `Kritikus: ${names}`,
      bg: `Критично: ${names}`,
      sr: `Критично: ${names}`,
      hr: `Kritično: ${names}`,
      uk: `Критично: ${names}`,
      ru: `Критические: ${names}`,
      el: `Κρίσιμο: ${names}`,
      tr: `Kritik: ${names}`,
      ar: `حرج: ${names}`,
      he: `קריטי: ${names}`,
      fa: `بحرانی: ${names}`,
      ku: `Krîtîk: ${names}`,
      hy: `Կdelays: ${names}`,
      ps: `بحراني: ${names}`,
      hi: `गंभीर: ${names}`,
      ur: `سنگین: ${names}`,
      bn: `জটিল: ${names}`,
      zh: `严重: ${names}`,
      ja: `重要: ${names}`,
      ko: `심각: ${names}`,
      vi: `Nghiêm trọng: ${names}`,
      th: `วิกฤต: ${names}`,
      id: `Kritis: ${names}`,
      tl: `Kritikal: ${names}`,
      sw: `Muhimu: ${names}`,
      am: `ወdelays: ${names}`,
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
