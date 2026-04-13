import { useTranslation } from "react-i18next";
import { useState } from "react";
import { GitBranch, Mail, Copy, Check } from "lucide-react";

export function Contact() {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);

  function copyEmail() {
    navigator.clipboard.writeText("contact@backup-tool.app");
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="max-w-2xl mx-auto px-6 py-16">
      <div className="text-center mb-10">
        <h1 className="text-4xl font-bold mb-3">{t("contact.title")}</h1>
        <p className="text-fg-muted">{t("contact.subtitle")}</p>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between p-5 rounded-2xl bg-bg-card border border-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center">
              <Mail className="w-5 h-5 text-accent" />
            </div>
            <div>
              <p className="text-sm font-medium">Email</p>
              <a href="mailto:contact@backup-tool.app" className="text-sm text-accent hover:text-accent-hover transition-colors">
                contact@backup-tool.app
              </a>
            </div>
          </div>
          <button
            onClick={copyEmail}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-border text-fg-muted hover:text-fg hover:border-accent transition-colors"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-accent" /> : <Copy className="w-3.5 h-3.5" />}
            {copied ? "Copied!" : "Copy"}
          </button>
        </div>

        <a
          href="https://github.com/backup-tool/b4ckup-t8l/issues"
          target="_blank"
          rel="noopener"
          className="flex items-center gap-3 p-5 rounded-2xl bg-bg-card border border-border hover:border-accent/30 transition-colors"
        >
          <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center">
            <GitBranch className="w-5 h-5 text-accent" />
          </div>
          <div>
            <p className="text-sm font-medium">GitHub Issues</p>
            <p className="text-sm text-fg-muted">{t("contact.github")}</p>
          </div>
        </a>
      </div>
    </div>
  );
}
