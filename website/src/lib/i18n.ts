import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import en from "@/locales/en.json";
import de from "@/locales/de.json";
import ru from "@/locales/ru.json";
import fr from "@/locales/fr.json";
import it from "@/locales/it.json";
import es from "@/locales/es.json";
import pt from "@/locales/pt.json";

const saved = localStorage.getItem("lang");
const browserLang = navigator.language.split("-")[0];
const supported = ["en", "de", "ru", "fr", "it", "es", "pt"];
const browser = supported.includes(browserLang) ? browserLang : "en";

i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    de: { translation: de },
    ru: { translation: ru },
    fr: { translation: fr },
    it: { translation: it },
    es: { translation: es },
    pt: { translation: pt },
  },
  lng: saved || browser,
  fallbackLng: "en",
  interpolation: { escapeValue: false },
});

export default i18n;
