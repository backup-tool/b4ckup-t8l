import { useTranslation } from "react-i18next";
import { useEffect, useState } from "react";
import { Eye, FolderOpen, Sun, Moon, Monitor, Download, Upload, Database } from "lucide-react";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { getWatchedLocations, exportAllData, importData } from "@/lib/db";
import { formatBytes } from "@/lib/format";
import { invoke } from "@tauri-apps/api/core";
import { useThemeStore } from "@/lib/store";
import { cn } from "@/lib/cn";

const ACCENT_COLORS = [
  { id: "b4ckup" as const, color: "#1a1a2e", darkColor: "#1a1a2e", label: "B4cKuP" },
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

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold">{t("settings.title")}</h1>

      {/* Language */}
      <Card>
        <CardHeader>
          <CardTitle>{t("settings.language")}</CardTitle>
        </CardHeader>
        <div className="flex flex-wrap gap-2">
          {[
            { code: "en", label: "settings.english" },
            { code: "de", label: "settings.german" },
            { code: "fr", label: "settings.french" },
            { code: "it", label: "settings.italian" },
            { code: "es", label: "settings.spanish" },
            { code: "pt", label: "settings.portuguese" },
            { code: "nl", label: "settings.dutch" },
            { code: "sv", label: "settings.swedish" },
            { code: "da", label: "settings.danish" },
            { code: "no", label: "settings.norwegian" },
            { code: "fi", label: "settings.finnish" },
            { code: "ro", label: "settings.romanian" },
            { code: "pl", label: "settings.polish" },
            { code: "cs", label: "settings.czech" },
            { code: "hu", label: "settings.hungarian" },
            { code: "bg", label: "settings.bulgarian" },
          ].map((lang) => (
            <Button
              key={lang.code}
              variant={i18n.language === lang.code ? "primary" : "secondary"}
              size="sm"
              onClick={() => changeLang(lang.code)}
            >
              {t(lang.label)}
            </Button>
          ))}
        </div>
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
                  ? "ring-2 ring-offset-2 ring-offset-background ring-foreground scale-110"
                  : "hover:scale-110"
              )}
              style={{ backgroundColor: mode === "dark" || (mode === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches) ? c.darkColor : c.color }}
              title={c.label}
            />
          ))}
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
    </div>
  );
}
