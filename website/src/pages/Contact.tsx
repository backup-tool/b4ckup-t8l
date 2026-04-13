import { useTranslation } from "react-i18next";
import { Send, GitBranch, Mail } from "lucide-react";

export function Contact() {
  const { t } = useTranslation();

  return (
    <div className="max-w-2xl mx-auto px-6 py-16">
      <div className="text-center mb-10">
        <h1 className="text-4xl font-bold mb-3">{t("contact.title")}</h1>
        <p className="text-fg-muted">{t("contact.subtitle")}</p>
      </div>

      <form
        onSubmit={(e) => e.preventDefault()}
        className="space-y-5 p-8 rounded-2xl bg-bg-card border border-border"
      >
        <div>
          <label className="block text-sm font-medium mb-1.5">{t("contact.name")}</label>
          <input
            type="text"
            className="w-full rounded-xl border border-border bg-bg px-4 py-2.5 text-sm focus:outline-none focus:border-accent transition-colors"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1.5">{t("contact.email")}</label>
          <input
            type="email"
            className="w-full rounded-xl border border-border bg-bg px-4 py-2.5 text-sm focus:outline-none focus:border-accent transition-colors"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1.5">{t("contact.message")}</label>
          <textarea
            rows={5}
            className="w-full rounded-xl border border-border bg-bg px-4 py-2.5 text-sm focus:outline-none focus:border-accent transition-colors resize-none"
          />
        </div>
        <button
          type="submit"
          className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-accent text-bg font-semibold text-sm hover:bg-accent-hover transition-colors"
        >
          <Send className="w-4 h-4" />
          {t("contact.send")}
        </button>
      </form>

      <div className="mt-8 space-y-3 text-sm text-fg-muted">
        <a href="https://github.com/backup-tool/b4ckup-t8l" target="_blank" rel="noopener" className="flex items-center gap-2 hover:text-fg transition-colors">
          <GitBranch className="w-4 h-4" />
          {t("contact.github")}
        </a>
        <div className="flex items-center gap-2">
          <Mail className="w-4 h-4" />
          {t("contact.emailDirect")}: <a href="mailto:contact@backup-tool.app" className="text-accent">contact@backup-tool.app</a>
        </div>
      </div>
    </div>
  );
}
