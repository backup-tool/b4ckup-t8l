import { useTranslation } from "react-i18next";
import { useState } from "react";
import { Send, GitBranch, Mail, Copy, Check } from "lucide-react";

export function Contact() {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", message: "" });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const subject = encodeURIComponent(`B4cKuP T8L - Message from ${form.name}`);
    const body = encodeURIComponent(`Name: ${form.name}\nEmail: ${form.email}\n\n${form.message}`);
    window.location.href = `mailto:contact@backup-tool.app?subject=${subject}&body=${body}`;
  }

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

      <form
        onSubmit={handleSubmit}
        className="space-y-5 p-8 rounded-2xl bg-bg-card border border-border"
      >
        <div>
          <label className="block text-sm font-medium mb-1.5">{t("contact.name")}</label>
          <input
            type="text"
            required
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="w-full rounded-xl border border-border bg-bg px-4 py-2.5 text-sm focus:outline-none focus:border-accent transition-colors"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1.5">{t("contact.email")}</label>
          <input
            type="email"
            required
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            className="w-full rounded-xl border border-border bg-bg px-4 py-2.5 text-sm focus:outline-none focus:border-accent transition-colors"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1.5">{t("contact.message")}</label>
          <textarea
            rows={5}
            required
            value={form.message}
            onChange={(e) => setForm({ ...form, message: e.target.value })}
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

      <div className="mt-8 space-y-4">
        <div className="flex items-center justify-between p-4 rounded-xl bg-bg-card border border-border">
          <div className="flex items-center gap-3">
            <Mail className="w-5 h-5 text-accent" />
            <span className="text-sm">contact@backup-tool.app</span>
          </div>
          <button
            onClick={copyEmail}
            className="flex items-center gap-1.5 text-xs text-fg-muted hover:text-fg transition-colors"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-accent" /> : <Copy className="w-3.5 h-3.5" />}
            {copied ? "Copied!" : "Copy"}
          </button>
        </div>

        <a
          href="https://github.com/backup-tool/b4ckup-t8l"
          target="_blank"
          rel="noopener"
          className="flex items-center gap-3 p-4 rounded-xl bg-bg-card border border-border hover:border-accent/30 transition-colors"
        >
          <GitBranch className="w-5 h-5 text-fg-muted" />
          <span className="text-sm">{t("contact.github")}</span>
        </a>
      </div>
    </div>
  );
}
