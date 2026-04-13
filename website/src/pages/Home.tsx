import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { langPrefix } from "@/components/LangRouter";
import {
  LayoutDashboard, FolderSearch, HardDrive, Bell, Moon, Globe,
  ArrowRight, Shield, Monitor, Database, Download,
} from "lucide-react";

const FEATURES = [
  { icon: LayoutDashboard, key: "dashboard" },
  { icon: FolderSearch, key: "scan" },
  { icon: HardDrive, key: "media" },
  { icon: Bell, key: "notifications" },
  { icon: Moon, key: "darkmode" },
  { icon: Globe, key: "i18n" },
];

export function Home() {
  const { t, i18n } = useTranslation();

  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-accent/5 to-transparent pointer-events-none" />
        <div className="max-w-6xl mx-auto px-6 pt-24 pb-20 text-center relative">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-border text-xs text-fg-muted mb-8">
            <Shield className="w-3.5 h-3.5 text-accent" />
            {t("stats.opensource")}
          </div>
          <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-6">
            B4cKuP T8L
          </h1>
          <p className="text-xl md:text-2xl text-fg-muted max-w-2xl mx-auto mb-4">
            {t("hero.tagline")}
          </p>
          <p className="text-sm text-fg-muted max-w-xl mx-auto mb-10">
            {t("hero.subtitle")}
          </p>
          <div className="flex items-center justify-center gap-4">
            <Link
              to={`${langPrefix(i18n.language)}/download`}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-accent text-bg font-semibold text-sm hover:bg-accent-hover transition-colors"
            >
              <Download className="w-4 h-4" />
              {t("hero.cta")}
            </Link>
            <Link
              to={`${langPrefix(i18n.language)}/features`}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl border border-border text-sm hover:border-accent transition-colors"
            >
              {t("hero.learnMore")}
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="border-y border-border bg-bg-card">
        <div className="max-w-6xl mx-auto px-6 py-8 grid grid-cols-2 md:grid-cols-4 gap-6">
          {[
            { icon: Database, text: t("stats.backups") },
            { icon: Monitor, text: t("stats.platforms") },
            { icon: Globe, text: t("stats.languages") },
            { icon: Shield, text: t("stats.opensource") },
          ].map((s, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-accent/10">
                <s.icon className="w-5 h-5 text-accent" />
              </div>
              <span className="text-sm font-medium">{s.text}</span>
            </div>
          ))}
        </div>
      </section>

      {/* App Preview */}
      <section className="max-w-6xl mx-auto px-6 py-20">
        <div className="text-center mb-10">
          <h2 className="text-3xl font-bold mb-3">{t("preview.title")}</h2>
          <p className="text-fg-muted max-w-xl mx-auto">{t("preview.subtitle")}</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {["dashboard", "backups"].map((key) => (
            <div key={key} className="rounded-2xl border border-border overflow-hidden bg-bg-card shadow-sm">
              <img
                src={`/screenshots/${key}.png`}
                alt={t(`preview.${key}`)}
                className="w-full h-auto"
                loading="lazy"
                onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
              />
              <p className="text-sm font-medium text-center py-3 text-fg-muted">{t(`preview.${key}`)}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Features preview */}
      <section className="max-w-6xl mx-auto px-6 py-20">
        <div className="text-center mb-14">
          <h2 className="text-3xl font-bold mb-3">{t("features.title")}</h2>
          <p className="text-fg-muted max-w-xl mx-auto">{t("features.subtitle")}</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {FEATURES.map((f) => (
            <div
              key={f.key}
              className="p-6 rounded-2xl bg-bg-card border border-border hover:border-accent/30 transition-colors"
            >
              <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center mb-4">
                <f.icon className="w-5 h-5 text-accent" />
              </div>
              <h3 className="font-semibold mb-2">{t(`features.${f.key}`)}</h3>
              <p className="text-sm text-fg-muted leading-relaxed">
                {t(`features.${f.key}Desc`)}
              </p>
            </div>
          ))}
        </div>
        <div className="text-center mt-10">
          <Link
            to={`${langPrefix(i18n.language)}/features`}
            className="inline-flex items-center gap-2 text-sm text-accent hover:text-accent-hover transition-colors"
          >
            {t("hero.learnMore")}
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>

      {/* How it works */}
      <section className="border-t border-border bg-bg-card">
        <div className="max-w-6xl mx-auto px-6 py-20">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-bold mb-3">{t("howItWorks.title")}</h2>
            <p className="text-fg-muted max-w-xl mx-auto">{t("howItWorks.subtitle")}</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[1, 2, 3].map((step) => (
              <div key={step} className="text-center">
                <div className="w-12 h-12 rounded-full bg-accent/10 flex items-center justify-center mx-auto mb-4">
                  <span className="text-lg font-bold text-accent">{step}</span>
                </div>
                <h3 className="font-semibold mb-2">{t(`howItWorks.step${step}`)}</h3>
                <p className="text-sm text-fg-muted leading-relaxed">{t(`howItWorks.step${step}Desc`)}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="max-w-4xl mx-auto px-6 py-20">
        <div className="text-center mb-14">
          <h2 className="text-3xl font-bold mb-3">{t("faq.title")}</h2>
        </div>
        <div className="space-y-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <details key={i} className="group rounded-xl border border-border bg-bg-card">
              <summary className="flex items-center justify-between p-5 cursor-pointer font-medium text-sm">
                {t(`faq.q${i}`)}
                <ArrowRight className="w-4 h-4 text-fg-muted transition-transform group-open:rotate-90" />
              </summary>
              <p className="px-5 pb-5 text-sm text-fg-muted leading-relaxed">{t(`faq.a${i}`)}</p>
            </details>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-6xl mx-auto px-6 pb-20">
        <div className="rounded-2xl bg-gradient-to-r from-accent/10 to-accent/5 border border-accent/20 p-10 text-center">
          <h2 className="text-2xl font-bold mb-3">{t("hero.tagline")}</h2>
          <Link
            to={`${langPrefix(i18n.language)}/download`}
            className="inline-flex items-center gap-2 px-6 py-3 mt-4 rounded-xl bg-accent text-bg font-semibold text-sm hover:bg-accent-hover transition-colors"
          >
            <Download className="w-4 h-4" />
            {t("hero.cta")}
          </Link>
        </div>
      </section>
    </div>
  );
}
