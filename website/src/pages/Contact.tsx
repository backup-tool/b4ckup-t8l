import { useTranslation } from "react-i18next";
import { useState, useEffect, useRef } from "react";
import { Send, GitBranch, Mail, CheckCircle, AlertCircle } from "lucide-react";

const TURNSTILE_SITE_KEY = "0x4AAAAAAC8nImSdV0GC2QuS";
const WORKER_URL = "https://contact.backup-tool.app";

export function Contact() {
  const { t } = useTranslation();
  const [form, setForm] = useState({ name: "", email: "", message: "" });
  const [status, setStatus] = useState<"idle" | "sending" | "success" | "error">("idle");
  const [turnstileToken, setTurnstileToken] = useState("");
  const turnstileRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Load Turnstile script
    if (document.getElementById("cf-turnstile-script")) return;
    const script = document.createElement("script");
    script.id = "cf-turnstile-script";
    script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js";
    script.async = true;
    document.head.appendChild(script);

    script.onload = () => {
      if (turnstileRef.current && (window as any).turnstile) {
        (window as any).turnstile.render(turnstileRef.current, {
          sitekey: TURNSTILE_SITE_KEY,
          theme: "dark",
          callback: (token: string) => setTurnstileToken(token),
        });
      }
    };
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!turnstileToken) return;

    setStatus("sending");
    try {
      const res = await fetch(WORKER_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          email: form.email,
          message: form.message,
          token: turnstileToken,
        }),
      });
      if (res.ok) {
        setStatus("success");
        setForm({ name: "", email: "", message: "" });
      } else {
        setStatus("error");
      }
    } catch {
      setStatus("error");
    }
  }

  return (
    <div className="max-w-2xl mx-auto px-6 py-16">
      <div className="text-center mb-10">
        <h1 className="text-4xl font-bold mb-3">{t("contact.title")}</h1>
        <p className="text-fg-muted">{t("contact.subtitle")}</p>
      </div>

      {status === "success" ? (
        <div className="p-8 rounded-2xl bg-bg-card border border-accent/30 text-center">
          <CheckCircle className="w-12 h-12 text-accent mx-auto mb-4" />
          <h2 className="text-lg font-semibold mb-2">Message sent!</h2>
          <p className="text-sm text-fg-muted">We'll get back to you soon.</p>
          <button
            onClick={() => setStatus("idle")}
            className="mt-4 text-sm text-accent hover:text-accent-hover"
          >
            Send another message
          </button>
        </div>
      ) : (
        <form
          onSubmit={handleSubmit}
          className="space-y-5 p-8 rounded-2xl bg-bg-card border border-border"
        >
          {status === "error" && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 text-red-400 text-sm">
              <AlertCircle className="w-4 h-4 shrink-0" />
              Something went wrong. Please try again.
            </div>
          )}
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

          {/* Turnstile Widget */}
          <div ref={turnstileRef} />

          <button
            type="submit"
            disabled={status === "sending" || !turnstileToken}
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-accent text-bg font-semibold text-sm hover:bg-accent-hover transition-colors disabled:opacity-50"
          >
            <Send className="w-4 h-4" />
            {status === "sending" ? "..." : t("contact.send")}
          </button>
        </form>
      )}

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
