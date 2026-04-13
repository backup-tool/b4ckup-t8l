import { useTranslation } from "react-i18next";
import { Monitor, Apple, Terminal, Download as DownloadIcon, GitBranch, History, FileDown } from "lucide-react";

const GITHUB_REPO = "backup-tool/b4ckup-t8l";
const R = `https://github.com/${GITHUB_REPO}/releases/latest/download`;

const PLATFORMS = [
  {
    key: "windows",
    icon: Monitor,
    reqKey: "windowsReq",
    formats: [
      { label: "Installer (.exe)", file: "Backup.Tool_0.1.0_x64-setup.exe", url: `${R}/Backup.Tool_0.1.0_x64-setup.exe`, primary: true },
      { label: "MSI Installer", file: "Backup.Tool_0.1.0_x64_en-US.msi", url: `${R}/Backup.Tool_0.1.0_x64_en-US.msi`, primary: false },
    ],
  },
  {
    key: "macos",
    icon: Apple,
    reqKey: "macosReq",
    formats: [
      { label: "Apple Silicon (.dmg)", file: "Backup.Tool_0.1.0_aarch64.dmg", url: `${R}/Backup.Tool_0.1.0_aarch64.dmg`, primary: true },
      { label: "Apple Silicon (.tar.gz)", file: "Backup.Tool_aarch64.app.tar.gz", url: `${R}/Backup.Tool_aarch64.app.tar.gz`, primary: false },
    ],
  },
  {
    key: "linux",
    icon: Terminal,
    reqKey: "linuxReq",
    formats: [
      { label: "AppImage", file: "Backup.Tool_0.1.0_amd64.AppImage", url: `${R}/Backup.Tool_0.1.0_amd64.AppImage`, primary: true },
      { label: "Debian / Ubuntu (.deb)", file: "Backup.Tool_0.1.0_amd64.deb", url: `${R}/Backup.Tool_0.1.0_amd64.deb`, primary: false },
      { label: "Fedora / RHEL (.rpm)", file: "Backup.Tool-0.1.0-1.x86_64.rpm", url: `${R}/Backup.Tool-0.1.0-1.x86_64.rpm`, primary: false },
    ],
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

      {/* Main downloads */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto mb-16">
        {PLATFORMS.map((p) => (
          <div
            key={p.key}
            className="p-6 rounded-2xl bg-bg-card border border-border hover:border-accent/30 transition-colors"
          >
            <div className="text-center mb-5">
              <div className="w-14 h-14 rounded-2xl bg-accent/10 flex items-center justify-center mx-auto mb-4">
                <p.icon className="w-7 h-7 text-accent" />
              </div>
              <h3 className="font-bold text-lg mb-1">{t(`download.${p.key}`)}</h3>
              <p className="text-xs text-fg-muted">{t(`download.${p.reqKey}`)}</p>
            </div>

            <div className="space-y-2">
              {p.formats.map((f) => (
                <a
                  key={f.file}
                  href={f.url}
                  className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-sm transition-colors ${
                    f.primary
                      ? "bg-accent text-bg font-semibold hover:bg-accent-hover"
                      : "border border-border text-fg-muted hover:text-fg hover:border-accent/30"
                  }`}
                >
                  {f.primary ? <DownloadIcon className="w-4 h-4 shrink-0" /> : <FileDown className="w-4 h-4 shrink-0" />}
                  <span className="truncate">{f.label}</span>
                </a>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Additional links */}
      <div className="max-w-2xl mx-auto space-y-3">
        <a
          href={`https://github.com/${GITHUB_REPO}/releases`}
          target="_blank"
          rel="noopener"
          className="flex items-center gap-3 p-4 rounded-xl bg-bg-card border border-border hover:border-accent/30 transition-colors"
        >
          <History className="w-5 h-5 text-fg-muted shrink-0" />
          <div>
            <p className="text-sm font-medium">{t("download.allReleases")}</p>
            <p className="text-xs text-fg-muted">{t("download.allReleasesDesc")}</p>
          </div>
        </a>

        <a
          href={`https://github.com/${GITHUB_REPO}`}
          target="_blank"
          rel="noopener"
          className="flex items-center gap-3 p-4 rounded-xl bg-bg-card border border-border hover:border-accent/30 transition-colors"
        >
          <GitBranch className="w-5 h-5 text-fg-muted shrink-0" />
          <div>
            <p className="text-sm font-medium">{t("download.sourceCode")}</p>
            <p className="text-xs text-fg-muted">{t("download.sourceCodeDesc")}</p>
          </div>
        </a>
      </div>
    </div>
  );
}
