import { useTranslation } from "react-i18next";
import { Monitor, Apple, Terminal, Download as DownloadIcon } from "lucide-react";

const GITHUB_REPO = "backup-tool/b4ckup-t8l";
const PLATFORMS = [
  {
    key: "windows",
    icon: Monitor,
    file: "Backup.Tool_0.1.0_x64-setup.exe",
    url: `https://github.com/${GITHUB_REPO}/releases/latest/download/Backup.Tool_0.1.0_x64-setup.exe`,
    reqKey: "windowsReq",
  },
  {
    key: "macos",
    icon: Apple,
    file: "Backup.Tool_0.1.0_aarch64.dmg",
    url: `https://github.com/${GITHUB_REPO}/releases/latest/download/Backup.Tool_0.1.0_aarch64.dmg`,
    reqKey: "macosReq",
  },
  {
    key: "linux",
    icon: Terminal,
    file: "Backup.Tool_0.1.0_amd64.AppImage",
    url: `https://github.com/${GITHUB_REPO}/releases/latest/download/Backup.Tool_0.1.0_amd64.AppImage`,
    reqKey: "linuxReq",
  },
];

export function Download() {
  const { t } = useTranslation();

  return (
    <div className="max-w-6xl mx-auto px-6 py-16">
      <div className="text-center mb-14">
        <h1 className="text-4xl font-bold mb-3">{t("download.title")}</h1>
        <p className="text-fg-muted">{t("download.subtitle")}</p>
        <p className="text-xs text-fg-muted mt-2">{t("download.version")} 0.1.0</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-3xl mx-auto">
        {PLATFORMS.map((p) => (
          <div
            key={p.key}
            className="p-8 rounded-2xl bg-bg-card border border-border text-center hover:border-accent/30 transition-colors"
          >
            <div className="w-14 h-14 rounded-2xl bg-accent/10 flex items-center justify-center mx-auto mb-5">
              <p.icon className="w-7 h-7 text-accent" />
            </div>
            <h3 className="font-bold text-lg mb-1">{t(`download.${p.key}`)}</h3>
            <p className="text-xs text-fg-muted mb-5">{t(`download.${p.reqKey}`)}</p>
            <a
              href={p.url}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-accent text-bg font-semibold text-sm hover:bg-accent-hover transition-colors"
            >
              <DownloadIcon className="w-4 h-4" />
              {t("download.downloadBtn")}
            </a>
            <p className="text-[10px] text-fg-muted mt-3 font-mono">{p.file}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
