import { useTranslation } from "react-i18next";
import { useEffect, useState } from "react";
import { Eye, FolderOpen, Sun, Moon, Monitor, Download, Upload, Database, RefreshCw, Loader2, CheckCircle } from "lucide-react";
import { check } from "@tauri-apps/plugin-updater";
import { relaunch } from "@tauri-apps/plugin-process";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { getWatchedLocations, exportAllData, importData } from "@/lib/db";
import { formatBytes } from "@/lib/format";
import { invoke } from "@tauri-apps/api/core";
import { useThemeStore } from "@/lib/store";
import { cn } from "@/lib/cn";
import { CustomSelect } from "@/components/ui/CustomSelect";
import { isNotificationsEnabled, getNotificationInterval, restartReminders } from "@/lib/notifications";

const ACCENT_COLORS = [
  { id: "b4ckup" as const, color: "#111111", darkColor: "#111111", label: "B4cKuP" },
  { id: "default" as const, color: "#171717", darkColor: "#fafafa", label: "Default" },
  { id: "blue" as const, color: "#3b82f6", darkColor: "#3b82f6", label: "Blue" },
  { id: "purple" as const, color: "#8b5cf6", darkColor: "#8b5cf6", label: "Purple" },
  { id: "green" as const, color: "#22c55e", darkColor: "#22c55e", label: "Green" },
  { id: "orange" as const, color: "#f97316", darkColor: "#f97316", label: "Orange" },
  { id: "pink" as const, color: "#ec4899", darkColor: "#ec4899", label: "Pink" },
  { id: "red" as const, color: "#ef4444", darkColor: "#ef4444", label: "Red" },
  { id: "teal" as const, color: "#14b8a6", darkColor: "#14b8a6", label: "Teal" },
];

export function Settings() {
  const { t, i18n } = useTranslation();
  const [watchers, setWatchers] = useState<Array<Record<string, any>>>([]);
  const [dbBackups, setDbBackups] = useState<Array<{ name: string; size_bytes: number; created: string }>>([]);
  const { mode, accent, setMode, setAccent } = useThemeStore();
  const [notifEnabled, setNotifEnabled] = useState(isNotificationsEnabled());
  const [notifInterval, setNotifInterval] = useState(getNotificationInterval());
  const [updateChecking, setUpdateChecking] = useState(false);
  const [updateResult, setUpdateResult] = useState<any>(null);
  const [updateError, setUpdateError] = useState<string | null>(null);
  const [updateDownloading, setUpdateDownloading] = useState(false);
  const [updateProgress, setUpdateProgress] = useState(0);
  const [updateReady, setUpdateReady] = useState(false);

  useEffect(() => {
    async function load() {
      setWatchers(await getWatchedLocations());
      setDbBackups(await invoke<typeof dbBackups>("list_db_backups"));
    }
    load();
  }, []);

  function changeLang(lang: string) {
    i18n.changeLanguage(lang);
    localStorage.setItem("language", lang);
  }

  async function handleCheckUpdate() {
    setUpdateChecking(true);
    setUpdateError(null);
    setUpdateResult(null);
    try {
      const result = await check();
      if (result?.available) {
        setUpdateResult(result);
      } else {
        setUpdateResult("up-to-date");
      }
    } catch (err) {
      setUpdateError(String(err));
    } finally {
      setUpdateChecking(false);
    }
  }

  async function handleDownloadUpdate() {
    if (!updateResult || updateResult === "up-to-date") return;
    setUpdateDownloading(true);
    try {
      let totalSize = 0;
      let downloaded = 0;
      await updateResult.downloadAndInstall((event: any) => {
        if (event.event === "Started" && event.data?.contentLength) {
          totalSize = event.data.contentLength;
        } else if (event.event === "Progress" && event.data?.chunkLength) {
          downloaded += event.data.chunkLength;
          if (totalSize > 0) setUpdateProgress(Math.round((downloaded / totalSize) * 100));
        } else if (event.event === "Finished") {
          setUpdateReady(true);
        }
      });
      setUpdateReady(true);
    } catch (err) {
      setUpdateError(String(err));
      setUpdateDownloading(false);
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold">{t("settings.title")}</h1>

      {/* Language */}
      <Card>
        <CardHeader>
          <CardTitle>{t("settings.language")}</CardTitle>
        </CardHeader>
        <CustomSelect
          className="w-64"
          value={i18n.language}
          onChange={changeLang}
          options={[
            { value: "en", label: "\ud83c\uddec\ud83c\udde7  English" },
            { value: "de", label: "\ud83c\udde9\ud83c\uddea  Deutsch" },
            { value: "fr", label: "\ud83c\uddeb\ud83c\uddf7  Fran\u00e7ais" },
            { value: "it", label: "\ud83c\uddee\ud83c\uddf9  Italiano" },
            { value: "es", label: "\ud83c\uddea\ud83c\uddf8  Espa\u00f1ol" },
            { value: "pt", label: "\ud83c\uddf5\ud83c\uddf9  Portugu\u00eas" },
            { value: "nl", label: "\ud83c\uddf3\ud83c\uddf1  Nederlands" },
            { value: "sv", label: "\ud83c\uddf8\ud83c\uddea  Svenska" },
            { value: "da", label: "\ud83c\udde9\ud83c\uddf0  Dansk" },
            { value: "no", label: "\ud83c\uddf3\ud83c\uddf4  Norsk" },
            { value: "fi", label: "\ud83c\uddeb\ud83c\uddee  Suomi" },
            { value: "ro", label: "\ud83c\uddf7\ud83c\uddf4  Rom\u00e2n\u0103" },
            { value: "pl", label: "\ud83c\uddf5\ud83c\uddf1  Polski" },
            { value: "cs", label: "\ud83c\udde8\ud83c\uddff  \u010ce\u0161tina" },
            { value: "hu", label: "\ud83c\udded\ud83c\uddfa  Magyar" },
            { value: "bg", label: "\ud83c\udde7\ud83c\uddec  \u0411\u044a\u043b\u0433\u0430\u0440\u0441\u043a\u0438" },
            { value: "sr", label: "\ud83c\uddf7\ud83c\uddf8  \u0421\u0440\u043f\u0441\u043a\u0438" },
            { value: "hr", label: "\ud83c\udded\ud83c\uddf7  Hrvatski" },
            { value: "uk", label: "\ud83c\uddfa\ud83c\udde6  \u0423\u043a\u0440\u0430\u0457\u043d\u0441\u044c\u043a\u0430" },
            { value: "ru", label: "\ud83c\uddf7\ud83c\uddfa  \u0420\u0443\u0441\u0441\u043a\u0438\u0439" },
            { value: "el", label: "\ud83c\uddec\ud83c\uddf7  \u0395\u03bb\u03bb\u03b7\u03bd\u03b9\u03ba\u03ac" },
            { value: "tr", label: "\ud83c\uddf9\ud83c\uddf7  T\u00fcrk\u00e7e" },
            { value: "ar", label: "\ud83c\uddf8\ud83c\udde6  \u0627\u0644\u0639\u0631\u0628\u064a\u0629" },
            { value: "he", label: "\ud83c\uddee\ud83c\uddf1  \u05e2\u05d1\u05e8\u05d9\u05ea" },
            { value: "fa", label: "\ud83c\uddee\ud83c\uddf7  \u0641\u0627\u0631\u0633\u06cc" },
            { value: "ku", label: "\ud83c\uddee\ud83c\uddf6  Kurd\u00ee" },
            { value: "hy", label: "\ud83c\udde6\ud83c\uddf2  \u0540\u0561\u0575\u0565\u0580\u0565\u0576" },
            { value: "ps", label: "\ud83c\udde6\ud83c\uddeb  \u067e\u069a\u062a\u0648" },
            { value: "hi", label: "\ud83c\uddee\ud83c\uddf3  \u0939\u093f\u0928\u094d\u0926\u0940" },
            { value: "ur", label: "\ud83c\uddf5\ud83c\uddf0  \u0627\u0631\u062f\u0648" },
            { value: "bn", label: "\ud83c\udde7\ud83c\udde9  \u09ac\u09be\u0982\u09b2\u09be" },
            { value: "zh", label: "\ud83c\udde8\ud83c\uddf3  \u4e2d\u6587" },
            { value: "ja", label: "\ud83c\uddef\ud83c\uddf5  \u65e5\u672c\u8a9e" },
            { value: "ko", label: "\ud83c\uddf0\ud83c\uddf7  \ud55c\uad6d\uc5b4" },
            { value: "vi", label: "\ud83c\uddfb\ud83c\uddf3  Ti\u1ebfng Vi\u1ec7t" },
            { value: "th", label: "\ud83c\uddf9\ud83c\udded  \u0e44\u0e17\u0e22" },
            { value: "id", label: "\ud83c\uddee\ud83c\udde9  Bahasa Indonesia" },
            { value: "tl", label: "\ud83c\uddf5\ud83c\udded  Filipino" },
            { value: "sw", label: "\ud83c\uddf0\ud83c\uddea  Kiswahili" },
            { value: "am", label: "\ud83c\uddea\ud83c\uddf9  \u12a0\u121b\u122d\u129b" },
          ]}
        />
      </Card>

      {/* Theme Mode */}
      <Card>
        <CardHeader>
          <CardTitle>{t("settings.theme")}</CardTitle>
        </CardHeader>
        <div className="flex gap-2">
          <Button
            variant={mode === "light" ? "primary" : "secondary"}
            size="sm"
            onClick={() => setMode("light")}
          >
            <Sun className="w-3.5 h-3.5" />
            {t("settings.light")}
          </Button>
          <Button
            variant={mode === "dark" ? "primary" : "secondary"}
            size="sm"
            onClick={() => setMode("dark")}
          >
            <Moon className="w-3.5 h-3.5" />
            {t("settings.dark")}
          </Button>
          <Button
            variant={mode === "system" ? "primary" : "secondary"}
            size="sm"
            onClick={() => setMode("system")}
          >
            <Monitor className="w-3.5 h-3.5" />
            {t("settings.system")}
          </Button>
        </div>
      </Card>

      {/* Accent Color */}
      <Card>
        <CardHeader>
          <CardTitle>{t("settings.accentColor")}</CardTitle>
        </CardHeader>
        <div className="flex gap-3 flex-wrap">
          {ACCENT_COLORS.map((c) => (
            <button
              key={c.id}
              onClick={() => setAccent(c.id)}
              className={cn(
                "w-8 h-8 rounded-full transition-all",
                accent === c.id
                  ? c.id === "b4ckup" ? "ring-2 ring-offset-2 ring-offset-background ring-[#4ade80] scale-110" : "ring-2 ring-offset-2 ring-offset-background ring-foreground scale-110"
                  : "hover:scale-110"
              )}
              style={{
                backgroundColor: mode === "dark" || (mode === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches) ? c.darkColor : c.color,
                ...(c.id === "b4ckup" ? { boxShadow: "inset 0 0 0 2.5px #4ade80" } : {}),
              }}
              title={c.label}
            />
          ))}
        </div>
      </Card>

      {/* Notifications */}
      <Card>
        <CardHeader>
          <CardTitle>{t("settings.notifications")}</CardTitle>
        </CardHeader>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm">{t("settings.notificationsEnabled")}</span>
            <button
              onClick={() => {
                const next = !notifEnabled;
                setNotifEnabled(next);
                localStorage.setItem("notification-enabled", String(next));
                restartReminders();
              }}
              className={cn(
                "w-11 h-6 rounded-full transition-colors relative shrink-0",
                notifEnabled ? "bg-emerald-500" : "bg-muted"
              )}
            >
              <span className={cn(
                "absolute top-[2px] left-[2px] w-5 h-5 rounded-full bg-white shadow transition-transform",
                notifEnabled ? "translate-x-5" : "translate-x-0"
              )} />
            </button>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm">{t("settings.checkInterval")}</span>
            <CustomSelect
              className="w-28"
              value={notifInterval}
              onChange={(val) => {
                setNotifInterval(val);
                localStorage.setItem("notification-interval", val);
                restartReminders();
              }}
              options={[
                { value: "1h", label: "1h" },
                { value: "6h", label: "6h" },
                { value: "12h", label: "12h" },
                { value: "24h", label: "24h" },
              ]}
            />
          </div>
        </div>
      </Card>

      {/* DB Backup */}
      <Card>
        <CardHeader>
          <CardTitle>{t("settings.dbBackup")}</CardTitle>
        </CardHeader>
        <p className="text-sm text-muted-foreground mb-3">{t("settings.dbBackupDesc")}</p>
        <Button
          variant="secondary"
          size="sm"
          onClick={async () => {
            await invoke("backup_database");
            setDbBackups(await invoke("list_db_backups"));
          }}
        >
          <Database className="w-3.5 h-3.5" />
          {t("settings.backupNow")}
        </Button>
        {dbBackups.length > 0 && (
          <div className="mt-3 space-y-1">
            {dbBackups.map((b) => (
              <div key={b.name} className="flex justify-between text-xs text-muted-foreground py-1">
                <span className="font-mono">{b.name}</span>
                <span>{formatBytes(b.size_bytes)} · {b.created}</span>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Export */}
      <Card>
        <CardHeader>
          <CardTitle>{t("settings.exportData")}</CardTitle>
        </CardHeader>
        <div className="flex gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={async () => {
              const input = document.createElement("input");
              input.type = "file";
              input.accept = ".json";
              input.onchange = async () => {
                const file = input.files?.[0];
                if (!file) return;
                try {
                  const text = await file.text();
                  const data = JSON.parse(text);
                  const result = await importData(data);
                  alert(`${t("settings.importSuccess")}: ${result.imported} ${t("settings.importImported")}, ${result.skipped} ${t("settings.importSkipped")}`);
                } catch (err) {
                  alert(`${t("settings.importError")}: ${err}`);
                }
              };
              input.click();
            }}
          >
            <Upload className="w-3.5 h-3.5" />
            {t("settings.importJSON")}
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={async () => {
              const data = await exportAllData();
              const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url;
              a.download = `backup-tool-export-${new Date().toISOString().split("T")[0]}.json`;
              a.click();
              URL.revokeObjectURL(url);
            }}
          >
            <Download className="w-3.5 h-3.5" />
            {t("settings.exportJSON")}
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={async () => {
              const data = await exportAllData();
              const rows = [["Quelle", "Backup", "Kategorie", "Datum", "Größe", "Speichermedium", "Notizen"]];
              for (const e of data.entries) {
                rows.push([
                  e.device_name || "",
                  e.backup_name || "",
                  e.category || "",
                  e.backup_date || "",
                  formatBytes(e.size_bytes || 0),
                  e.media_name || "",
                  e.notes || "",
                ]);
              }
              const csv = rows.map((r) => r.map((c: string) => `"${c.replace(/"/g, '""')}"`).join(",")).join("\n");
              const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url;
              a.download = `backup-tool-export-${new Date().toISOString().split("T")[0]}.csv`;
              a.click();
              URL.revokeObjectURL(url);
            }}
          >
            <Download className="w-3.5 h-3.5" />
            {t("settings.exportCSV")}
          </Button>
        </div>
      </Card>

      {/* Watchers */}
      <Card>
        <CardHeader>
          <CardTitle>{t("settings.watchers")}</CardTitle>
        </CardHeader>
        <p className="text-sm text-muted-foreground mb-4">
          {t("settings.watcherDesc")}
        </p>
        {watchers.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {t("settings.noWatchers")}
          </p>
        ) : (
          <div className="space-y-2">
            {watchers.map((w) => (
              <div
                key={w.id as number}
                className="flex items-center justify-between py-2 px-3 rounded-lg bg-muted/50"
              >
                <div className="flex items-center gap-2">
                  <FolderOpen className="w-4 h-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">
                      {w.backup_name as string}
                      <span className="text-muted-foreground font-normal ml-1">
                        &rarr; {w.media_name as string}
                      </span>
                    </p>
                    {w.path_on_media && (
                      <p className="text-xs text-muted-foreground font-mono">
                        {w.path_on_media as string}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <Eye className="w-4 h-4 text-emerald-500" />
                  <span className="text-xs text-emerald-600">{t("settings.active")}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Updates */}
      <Card>
        <CardHeader>
          <CardTitle>{t("settings.updates")}</CardTitle>
        </CardHeader>
        <div className="flex items-center gap-3">
          {updateReady ? (
            <Button onClick={() => relaunch()} size="sm">
              <RefreshCw className="w-3.5 h-3.5" />
              {t("update.restart")}
            </Button>
          ) : updateResult && updateResult !== "up-to-date" ? (
            <Button onClick={handleDownloadUpdate} disabled={updateDownloading} size="sm">
              {updateDownloading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
              {updateDownloading ? t("update.downloading") : t("update.install")} {updateResult.version}
            </Button>
          ) : (
            <Button onClick={handleCheckUpdate} disabled={updateChecking} size="sm" variant="secondary">
              {updateChecking ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
              {t("settings.checkUpdates")}
            </Button>
          )}
          {updateResult === "up-to-date" && (
            <span className="flex items-center gap-1.5 text-sm text-emerald-600">
              <CheckCircle className="w-4 h-4" />
              {t("settings.upToDate")}
            </span>
          )}
          {updateError && (
            <span className="text-sm text-destructive">{updateError}</span>
          )}
        </div>
        {updateDownloading && !updateReady && (
          <div className="mt-3">
            <div className="h-1.5 bg-muted rounded-full overflow-hidden">
              <div className="h-full bg-primary rounded-full transition-all duration-300" style={{ width: `${updateProgress}%` }} />
            </div>
            <p className="text-[10px] text-muted-foreground mt-1 tabular-nums">{updateProgress}%</p>
          </div>
        )}
      </Card>
    </div>
  );
}
