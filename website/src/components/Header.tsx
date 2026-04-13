import { Link, NavLink } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Menu, X } from "lucide-react";
import { useState } from "react";

export function Header() {
  const { t, i18n } = useTranslation();
  const [menuOpen, setMenuOpen] = useState(false);

  const links = [
    { to: "/", label: t("nav.home") },
    { to: "/features", label: t("nav.features") },
    { to: "/download", label: t("nav.download") },
    { to: "/contact", label: t("nav.contact") },
  ];

  function toggleLang() {
    const next = i18n.language === "de" ? "en" : "de";
    i18n.changeLanguage(next);
    localStorage.setItem("lang", next);
  }

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-bg/80 backdrop-blur-md">
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2.5">
          <img src="/icon.svg" alt="Logo" className="w-8 h-8 rounded-lg" />
          <span className="font-bold text-lg">B4cKuP T8L</span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-6">
          {links.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              className={({ isActive }) =>
                `text-sm transition-colors ${isActive ? "text-accent font-medium" : "text-fg-muted hover:text-fg"}`
              }
            >
              {l.label}
            </NavLink>
          ))}
          <button
            onClick={toggleLang}
            className="text-xs px-2.5 py-1 rounded-full border border-border hover:border-accent text-fg-muted hover:text-fg transition-colors"
          >
            {i18n.language === "de" ? "EN" : "DE"}
          </button>
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
              onClick={() => setMenuOpen(false)}
              className="block text-sm text-fg-muted hover:text-fg"
            >
              {l.label}
            </NavLink>
          ))}
          <button onClick={toggleLang} className="text-xs text-fg-muted">
            {i18n.language === "de" ? "Switch to English" : "Auf Deutsch wechseln"}
          </button>
        </nav>
      )}
    </header>
  );
}
