import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Menu, X, Globe, ChevronDown } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { langPrefix } from "./LangRouter";

const LANGS = [
  { code: "en", label: "English" },
  { code: "de", label: "Deutsch" },
  { code: "ru", label: "Русский" },
  { code: "fr", label: "Français" },
  { code: "it", label: "Italiano" },
  { code: "es", label: "Español" },
  { code: "pt", label: "Português" },
  { code: "nl", label: "Nederlands" },
  { code: "sv", label: "Svenska" },
  { code: "da", label: "Dansk" },
  { code: "no", label: "Norsk" },
  { code: "fi", label: "Suomi" },
  { code: "ro", label: "Română" },
  { code: "pl", label: "Polski" },
  { code: "cs", label: "Čeština" },
  { code: "hu", label: "Magyar" },
  { code: "bg", label: "Български" },
  { code: "sr", label: "Српски" },
  { code: "hr", label: "Hrvatski" },
  { code: "uk", label: "Українська" },
  { code: "el", label: "Ελληνικά" },
  { code: "tr", label: "Türkçe" },
  { code: "ar", label: "العربية" },
  { code: "he", label: "עברית" },
  { code: "fa", label: "فارسی" },
  { code: "ku", label: "Kurdî" },
  { code: "hy", label: "Հայերեն" },
  { code: "ps", label: "پښتو" },
  { code: "hi", label: "हिन्दी" },
  { code: "ur", label: "اردو" },
  { code: "bn", label: "বাংলা" },
  { code: "zh", label: "中文" },
  { code: "ja", label: "日本語" },
  { code: "ko", label: "한국어" },
  { code: "vi", label: "Tiếng Việt" },
  { code: "th", label: "ไทย" },
  { code: "id", label: "Bahasa Indonesia" },
  { code: "tl", label: "Filipino" },
  { code: "sw", label: "Kiswahili" },
  { code: "am", label: "አማርኛ" },
];

export function Header() {
  const { t, i18n } = useTranslation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [langOpen, setLangOpen] = useState(false);
  const langRef = useRef<HTMLDivElement>(null);
  const location = useLocation();
  const navigate = useNavigate();
  const lang = i18n.language;
  const prefix = langPrefix(lang);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (langRef.current && !langRef.current.contains(e.target as Node)) {
        setLangOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const links = [
    { to: `${prefix}/`, label: t("nav.home"), end: true },
    { to: `${prefix}/features`, label: t("nav.features") },
    { to: `${prefix}/download`, label: t("nav.download") },
    { to: `${prefix}/contact`, label: t("nav.contact") },
  ];

  // Fix: for English "/" should be end-matched, for others "/de" etc.
  const homeLink = prefix ? `${prefix}` : "/";

  function switchLang(newLang: string) {
    // Remove current lang prefix from path
    const pathWithoutLang = location.pathname.replace(/^\/(de|ru|fr|it|es|pt|nl|sv|da|no|fi|ro|pl|cs|hu|bg|sr|hr|uk|el|tr|ar|he|fa|ku|hy|ps|hi|ur|bn|zh|ja|ko|vi|th|id|tl|sw|am)/, "");
    const newPrefix = newLang === "en" ? "" : `/${newLang}`;
    i18n.changeLanguage(newLang);
    localStorage.setItem("lang", newLang);
    navigate(`${newPrefix}${pathWithoutLang || "/"}`);
    setLangOpen(false);
  }

  const currentLang = LANGS.find((l) => l.code === lang) || LANGS[0];

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-bg/80 backdrop-blur-md">
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        <Link to={homeLink} className="flex items-center gap-2.5">
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

          {/* Language dropdown */}
          <div ref={langRef} className="relative">
            <button
              onClick={() => setLangOpen(!langOpen)}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border border-border text-fg-muted hover:text-fg hover:border-accent transition-colors"
            >
              <Globe className="w-3.5 h-3.5" />
              {currentLang.label}
              <ChevronDown className={`w-3 h-3 transition-transform ${langOpen ? "rotate-180" : ""}`} />
            </button>
            {langOpen && (
              <div className="absolute right-0 mt-2 w-36 rounded-xl border border-border bg-bg-card shadow-lg py-1 z-50">
                {LANGS.map((l) => (
                  <button
                    key={l.code}
                    onClick={() => switchLang(l.code)}
                    className={`w-full text-left px-4 py-2 text-sm transition-colors hover:bg-accent/10 ${
                      lang === l.code ? "text-accent font-medium" : "text-fg-muted"
                    }`}
                  >
                    {l.label}
                  </button>
                ))}
              </div>
            )}
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
          <div className="flex gap-2 pt-2 border-t border-border">
            {LANGS.map((l) => (
              <button
                key={l.code}
                onClick={() => { switchLang(l.code); setMenuOpen(false); }}
                className={`text-xs px-3 py-1.5 rounded-full ${
                  lang === l.code
                    ? "bg-accent text-bg font-medium"
                    : "border border-border text-fg-muted"
                }`}
              >
                {l.label}
              </button>
            ))}
          </div>
        </nav>
      )}
    </header>
  );
}
