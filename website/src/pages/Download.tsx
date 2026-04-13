import { useTranslation } from "react-i18next";
import { useState, useEffect } from "react";
import { Monitor, Apple, Terminal, Download as DownloadIcon, GitBranch, History, FileDown, Loader2 } from "lucide-react";

const GITHUB_REPO = "backup-tool/b4ckup-t8l";
const API_URL = `https://api.github.com/repos/${GITHUB_REPO}/releases/latest`;

interface ReleaseAsset {
  name: string;
  browser_download_url: string;
}

interface ReleaseInfo {
  tag_name: string;
  assets: ReleaseAsset[];
}

function findAsset(assets: ReleaseAsset[], pattern: string): ReleaseAsset | undefined {
  return assets.find((a) => a.name.includes(pattern));
}

function buildPlatforms(assets: ReleaseAsset[]) {
  return [
    {
      key: "windows",
      icon: Monitor,
      reqKey: "windowsReq",
      formats: [
        { label: "Installer (.exe)", asset: findAsset(assets, "x64-setup.exe"), primary: true },
        { label: "MSI Installer", asset: findAsset(assets, "x64_en-US.msi"), primary: false },
      ],
    },
    {
      key: "macos",
      icon: Apple,
      reqKey: "macosReq",
      formats: [
        { label: "Apple Silicon (.dmg)", asset: findAsset(assets, "aarch64.dmg"), primary: true },
        { label: "Intel (.dmg)", asset: findAsset(assets, "x64.dmg"), primary: false },
      ],
    },
    {
      key: "linux",
      icon: Terminal,
      reqKey: "linuxReq",
      formats: [
        { label: "AppImage", asset: findAsset(assets, "amd64.AppImage"), primary: true },
        { label: "Debian / Ubuntu (.deb)", asset: findAsset(assets, "amd64.deb"), primary: false },
        { label: "Fedora / RHEL (.rpm)", asset: findAsset(assets, ".rpm"), primary: false },
      ],
    },
  ];
}

export function Download() {
  const { t } = useTranslation();
  const [release, setRelease] = useState<ReleaseInfo | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    fetch(API_URL)
      .then((r) => {
        if (!r.ok) throw new Error("Failed to fetch");
        return r.json();
      })
      .then((data: ReleaseInfo) => setRelease(data))
      .catch(() => setError(true));
  }, []);

  const version = release?.tag_name?.replace(/^v/, "") ?? "…";
  const platforms = release ? buildPlatforms(release.assets) : [];

  return (
    <div className="max-w-6xl mx-auto px-6 py-16">
      <div className="text-center mb-14">
        <h1 className="text-4xl font-bold mb-3">{t("download.title")}</h1>
        <p className="text-fg-muted">{t("download.subtitle")}</p>
        <p className="text-xs text-fg-muted mt-2">{t("download.version")} {version}</p>
      </div>

      {!release && !error && (
        <div className="flex justify-center py-16">
          <Loader2 className="w-6 h-6 text-fg-muted animate-spin" />
        </div>
      )}

      {error && (
        <div className="text-center py-8 mb-8">
          <p className="text-fg-muted mb-3">{t("download.fetchError", "Could not load release info.")}</p>
          <a
            href={`https://github.com/${GITHUB_REPO}/releases/latest`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-accent text-bg font-semibold hover:bg-accent-hover transition-colors"
          >
            <DownloadIcon className="w-4 h-4" />
            {t("download.goToReleases", "Go to GitHub Releases")}
          </a>
        </div>
      )}

      {/* Main downloads */}
      {release && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto mb-16">
          {platforms.map((p) => (
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
                {p.formats.map((f, i) =>
                  f.asset ? (
                    <a
                      key={f.asset.name}
                      href={f.asset.browser_download_url}
                      className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-sm transition-colors ${
                        f.primary
                          ? "bg-accent text-bg font-semibold hover:bg-accent-hover"
                          : "border border-border text-fg-muted hover:text-fg hover:border-accent/30"
                      }`}
                    >
                      {f.primary ? <DownloadIcon className="w-4 h-4 shrink-0" /> : <FileDown className="w-4 h-4 shrink-0" />}
                      <span className="truncate">{f.label}</span>
                    </a>
                  ) : null
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Additional links */}
      <div className="max-w-2xl mx-auto space-y-3">
        <a
          href={`https://github.com/${GITHUB_REPO}/releases`}
          target="_blank"
          rel="noopener noreferrer"
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
          rel="noopener noreferrer"
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
