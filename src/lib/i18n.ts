import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import en from "@/locales/en.json";
import de from "@/locales/de.json";
import fr from "@/locales/fr.json";
import it from "@/locales/it.json";
import es from "@/locales/es.json";
import pt from "@/locales/pt.json";
import nl from "@/locales/nl.json";

const LANGS: Record<string, string> = {
  en: "en", de: "de", fr: "fr", it: "it", es: "es", pt: "pt", nl: "nl",
};

const savedLang = localStorage.getItem("language");
const browserCode = navigator.language.split("-")[0];
const browserLang = LANGS[browserCode] || "en";

i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    de: { translation: de },
    fr: { translation: fr },
    it: { translation: it },
    es: { translation: es },
    pt: { translation: pt },
    nl: { translation: nl },
  },
  lng: savedLang || browserLang,
  fallbackLng: "en",
  interpolation: {
    escapeValue: true,
  },
});

export default i18n;
