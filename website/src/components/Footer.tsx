import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Heart } from "lucide-react";

export function Footer() {
  const { t } = useTranslation();

  return (
    <footer className="border-t border-border mt-20">
      <div className="max-w-6xl mx-auto px-6 py-12">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <div className="flex items-center gap-2 mb-3">
              <img src="/icon.svg" alt="Logo" className="w-6 h-6 rounded" />
              <span className="font-bold">B4cKuP T8L</span>
            </div>
            <p className="text-xs text-fg-muted leading-relaxed">
              {t("hero.tagline")}
            </p>
          </div>

          {/* Product */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-fg-muted mb-3">
              {t("footer.product")}
            </h4>
            <div className="space-y-2">
              <Link to="/features" className="block text-sm text-fg-muted hover:text-fg transition-colors">{t("nav.features")}</Link>
              <Link to="/download" className="block text-sm text-fg-muted hover:text-fg transition-colors">{t("nav.download")}</Link>
              <a href="https://github.com" target="_blank" rel="noopener" className="block text-sm text-fg-muted hover:text-fg transition-colors">GitHub</a>
            </div>
          </div>

          {/* Legal */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-fg-muted mb-3">
              {t("footer.legal")}
            </h4>
            <div className="space-y-2">
              <Link to="/imprint" className="block text-sm text-fg-muted hover:text-fg transition-colors">{t("footer.imprint")}</Link>
              <Link to="/privacy" className="block text-sm text-fg-muted hover:text-fg transition-colors">{t("footer.privacy")}</Link>
            </div>
          </div>

          {/* Contact */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-fg-muted mb-3">
              {t("nav.contact")}
            </h4>
            <div className="space-y-2">
              <Link to="/contact" className="block text-sm text-fg-muted hover:text-fg transition-colors">{t("nav.contact")}</Link>
            </div>
          </div>
        </div>

        <div className="mt-10 pt-6 border-t border-border flex items-center justify-between text-xs text-fg-muted">
          <span>&copy; {new Date().getFullYear()} B4cKuP T8L</span>
          <span className="flex items-center gap-1">
            {t("footer.madeWith")} <Heart className="w-3 h-3 text-accent fill-accent" />
          </span>
        </div>
      </div>
    </footer>
  );
}
