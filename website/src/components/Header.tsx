import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Menu, X } from "lucide-react";
import { useState } from "react";

export function Header() {
  const { t, i18n } = useTranslation();
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const lang = i18n.language;

  const links = [
    { to: `/${lang}`, label: t("nav.home"), end: true },
    { to: `/${lang}/features`, label: t("nav.features") },
    { to: `/${lang}/download`, label: t("nav.download") },
    { to: `/${lang}/contact`, label: t("nav.contact") },
  ];

  function switchLang(newLang: string) {
    // Replace current lang prefix with new one
    const pathWithoutLang = location.pathname.replace(/^\/(en|de|ru)/, "");
    i18n.changeLanguage(newLang);
    localStorage.setItem("lang", newLang);
    navigate(`/${newLang}${pathWithoutLang || ""}`);
  }

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-bg/80 backdrop-blur-md">
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        <Link to={`/${lang}`} className="flex items-center gap-2.5">
          <img src="/icon.svg" alt="Logo" className="w-8 h-8 rounded-lg" />
          <span className="font-bold text-lg">B4cKuP T8L</span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-6">
          {links.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              end={l.end}
              className={({ isActive }) =>
                `text-sm transition-colors ${isActive ? "text-accent font-medium" : "text-fg-muted hover:text-fg"}`
              }
            >
              {l.label}
            </NavLink>
          ))}
          <div className="flex gap-1">
            {["EN", "DE", "RU"].map((l) => (
              <button
                key={l}
                onClick={() => switchLang(l.toLowerCase())}
                className={`text-xs px-2 py-1 rounded-full transition-colors ${
                  lang === l.toLowerCase()
                    ? "bg-accent text-bg font-medium"
                    : "border border-border text-fg-muted hover:text-fg hover:border-accent"
                }`}
              >
                {l}
              </button>
            ))}
          </div>
        </nav>

        {/* Mobile toggle */}
        <button className="md:hidden p-2" onClick={() => setMenuOpen(!menuOpen)}>
          {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <nav className="md:hidden border-t border-border bg-bg px-6 py-4 space-y-3">
          {links.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              end={l.end}
              onClick={() => setMenuOpen(false)}
              className="block text-sm text-fg-muted hover:text-fg"
            >
              {l.label}
            </NavLink>
          ))}
          <div className="flex gap-2 pt-2">
            {["EN", "DE", "RU"].map((l) => (
              <button
                key={l}
                onClick={() => { switchLang(l.toLowerCase()); setMenuOpen(false); }}
                className={`text-xs px-2.5 py-1 rounded-full ${
                  lang === l.toLowerCase()
                    ? "bg-accent text-bg"
                    : "border border-border text-fg-muted"
                }`}
              >
                {l}
              </button>
            ))}
          </div>
        </nav>
      )}
    </header>
  );
}
