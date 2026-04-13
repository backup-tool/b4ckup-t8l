import { useTranslation } from "react-i18next";
import { useState, useEffect } from "react";
import { Tag, Loader2 } from "lucide-react";

const GITHUB_REPO = "backup-tool/b4ckup-t8l";
const API_URL = `https://api.github.com/repos/${GITHUB_REPO}/releases`;

interface Release {
  tag_name: string;
  name: string;
  body: string;
  published_at: string;
  html_url: string;
}

export function Changelog() {
  const { t } = useTranslation();
  const [releases, setReleases] = useState<Release[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    fetch(API_URL)
      .then((r) => {
        if (!r.ok) throw new Error("Failed");
        return r.json();
      })
      .then((data: Release[]) => {
        setReleases(data);
        setLoading(false);
      })
      .catch(() => {
        setError(true);
        setLoading(false);
      });
  }, []);

  return (
    <div className="max-w-4xl mx-auto px-6 py-16">
      <div className="text-center mb-14">
        <h1 className="text-4xl font-bold mb-3">{t("changelog.title")}</h1>
        <p className="text-fg-muted">{t("changelog.subtitle")}</p>
      </div>

      {loading && (
        <div className="flex justify-center py-16">
          <Loader2 className="w-6 h-6 text-fg-muted animate-spin" />
        </div>
      )}

      {error && (
        <p className="text-center text-fg-muted">{t("changelog.error")}</p>
      )}

      <div className="space-y-8">
        {releases.map((release) => {
          const date = new Date(release.published_at).toLocaleDateString(undefined, {
            year: "numeric",
            month: "long",
            day: "numeric",
          });

          // Simple markdown-like rendering for the body
          const lines = (release.body || "").split("\n").filter((l) => l.trim());

          return (
            <div
              key={release.tag_name}
              className="rounded-2xl bg-bg-card border border-border p-6"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 rounded-lg bg-accent/10">
                  <Tag className="w-4 h-4 text-accent" />
                </div>
                <div>
                  <h2 className="font-bold text-lg">{release.name || release.tag_name}</h2>
                  <p className="text-xs text-fg-muted">{date}</p>
                </div>
                <a
                  href={release.html_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ml-auto text-xs text-accent hover:text-accent-hover transition-colors"
                >
                  {release.tag_name}
                </a>
              </div>
              <div className="space-y-1 text-sm text-fg-muted">
                {lines.map((line, i) => {
                  if (line.startsWith("## ")) {
                    return <h3 key={i} className="font-semibold text-fg mt-3 mb-1">{line.replace("## ", "")}</h3>;
                  }
                  if (line.startsWith("- ") || line.startsWith("* ")) {
                    return (
                      <p key={i} className="flex gap-2">
                        <span className="text-accent shrink-0">-</span>
                        <span>{line.replace(/^[-*]\s*/, "")}</span>
                      </p>
                    );
                  }
                  return <p key={i}>{line}</p>;
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
