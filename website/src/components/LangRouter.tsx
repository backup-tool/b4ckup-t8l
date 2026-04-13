import { useEffect, type ReactNode } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";

const SUPPORTED_LANGS = ["en", "de", "ru"];

export function LangRouter({ lang, children }: { lang: string; children: ReactNode }) {
  const { i18n } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (lang && SUPPORTED_LANGS.includes(lang)) {
      if (i18n.language !== lang) {
        i18n.changeLanguage(lang);
        localStorage.setItem("lang", lang);
      }
    } else {
      // No lang prefix - redirect to saved or browser lang
      const saved = localStorage.getItem("lang");
      const browser = navigator.language.startsWith("de") ? "de" : navigator.language.startsWith("ru") ? "ru" : "en";
      const target = saved && SUPPORTED_LANGS.includes(saved) ? saved : browser;
      navigate(`/${target}${location.pathname}`, { replace: true });
    }
  }, [lang, i18n, navigate, location.pathname]);

  if (!lang || !SUPPORTED_LANGS.includes(lang)) return null;

  return <>{children}</>;
}
