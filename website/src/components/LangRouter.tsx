import { useEffect, type ReactNode } from "react";
import { useTranslation } from "react-i18next";

export function LangRouter({ lang, children }: { lang: string; children: ReactNode }) {
  const { i18n } = useTranslation();

  useEffect(() => {
    if (i18n.language !== lang) {
      i18n.changeLanguage(lang);
      localStorage.setItem("lang", lang);
    }
  }, [lang, i18n]);

  return <>{children}</>;
}

// Helper: get URL prefix for current language (empty for English)
export function langPrefix(lang: string): string {
  return lang === "en" ? "" : `/${lang}`;
}
