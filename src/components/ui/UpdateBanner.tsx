import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Download, X, Loader2, RefreshCw } from "lucide-react";
import { check } from "@tauri-apps/plugin-updater";
import { relaunch } from "@tauri-apps/plugin-process";

export function UpdateBanner() {
  const { t } = useTranslation();
  const [update, setUpdate] = useState<any>(null);
  const [downloading, setDownloading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [dismissed, setDismissed] = useState(false);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [debugLog, setDebugLog] = useState<string[]>([]);

  function log(msg: string) {
    console.log(`[Updater] ${msg}`);
    setDebugLog((prev) => [...prev.slice(-10), msg]);
  }

  useEffect(() => {
    const timer = setTimeout(async () => {
      try {
        log("Checking for updates...");
        const result = await check();
        log(`Check result: available=${result?.available}, version=${result?.version}`);
        if (result?.available) {
          setUpdate(result);
          log(`Current version: ${result.currentVersion}, new: ${result.version}`);
          log(`Update body: ${result.body || "none"}`);
        }
      } catch (err) {
        log(`Check failed: ${err}`);
        console.warn("Update check failed:", err);
      }
    }, 5000);
    return () => clearTimeout(timer);
  }, []);

  if (!update || dismissed) return null;

  async function handleInstall() {
    setDownloading(true);
    setError(null);
    try {
      let totalSize = 0;
      let downloaded = 0;
      log("Starting downloadAndInstall...");
      await update.downloadAndInstall((event: any) => {
        log(`Event: ${event.event} ${JSON.stringify(event.data || {})}`);
        if (event.event === "Started" && event.data?.contentLength) {
          totalSize = event.data.contentLength;
          log(`Download started: ${(totalSize / 1024 / 1024).toFixed(1)} MB`);
        } else if (event.event === "Progress" && event.data?.chunkLength) {
          downloaded += event.data.chunkLength;
          if (totalSize > 0) {
            setProgress(Math.round((downloaded / totalSize) * 100));
          }
        } else if (event.event === "Finished") {
          log("Download finished, installing...");
          setReady(true);
        }
      });
      log("downloadAndInstall() completed successfully");
      setReady(true);
    } catch (err: any) {
      const errMsg = err?.message || String(err);
      log(`Install error: ${errMsg}`);
      console.error("Update failed:", err);
      setError(errMsg);
      setDownloading(false);
    }
  }

  async function handleRelaunch() {
    log("Relaunching...");
    try {
      await relaunch();
    } catch (err: any) {
      log(`Relaunch error: ${err?.message || err}`);
      setError(`Relaunch failed: ${err?.message || err}`);
    }
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-sm">
      <div className="bg-card border border-border rounded-xl shadow-lg p-4">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-primary/10 shrink-0">
            <Download className="w-4 h-4 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold">
              {ready ? t("update.ready") : t("update.available")}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {ready
                ? t("update.restartDesc")
                : `${t("update.version")} ${update.version}`
              }
            </p>
            {downloading && !ready && (
              <div className="mt-2">
                <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <p className="text-[10px] text-muted-foreground mt-1 tabular-nums">{progress}%</p>
              </div>
            )}
            {error && (
              <p className="text-[10px] text-red-400 mt-1 break-all">{error}</p>
            )}
            {debugLog.length > 0 && (
              <details className="mt-1">
                <summary className="text-[10px] text-muted-foreground cursor-pointer">Debug log</summary>
                <div className="text-[9px] text-muted-foreground mt-1 max-h-24 overflow-y-auto font-mono">
                  {debugLog.map((l, i) => <div key={i}>{l}</div>)}
                </div>
              </details>
            )}
            <div className="flex gap-2 mt-3">
              {ready ? (
                <button
                  onClick={handleRelaunch}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:opacity-90 transition-opacity"
                >
                  <RefreshCw className="w-3 h-3" />
                  {t("update.restart")}
                </button>
              ) : (
                <button
                  onClick={handleInstall}
                  disabled={downloading}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
                >
                  {downloading ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <Download className="w-3 h-3" />
                  )}
                  {downloading ? t("update.downloading") : t("update.install")}
                </button>
              )}
            </div>
          </div>
          {!downloading && (
            <button
              onClick={() => setDismissed(true)}
              className="p-1 rounded hover:bg-muted transition-colors shrink-0"
            >
              <X className="w-3.5 h-3.5 text-muted-foreground" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
