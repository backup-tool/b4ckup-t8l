import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import en from "@/locales/en.json";
import de from "@/locales/de.json";
import ru from "@/locales/ru.json";

const saved = localStorage.getItem("lang");
const browser = navigator.language.startsWith("de") ? "de" : navigator.language.startsWith("ru") ? "ru" : "en";

i18n.use(initReactI18next).init({
  resources: { en: { translation: en }, de: { translation: de }, ru: { translation: ru } },
  lng: saved || browser,
  fallbackLng: "en",
  interpolation: { escapeValue: false },
});

export default i18n;
