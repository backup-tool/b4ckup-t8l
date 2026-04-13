import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import en from "@/locales/en.json";
import de from "@/locales/de.json";
import fr from "@/locales/fr.json";
import it from "@/locales/it.json";
import es from "@/locales/es.json";
import pt from "@/locales/pt.json";
import nl from "@/locales/nl.json";
import sv from "@/locales/sv.json";
import da from "@/locales/da.json";
import no from "@/locales/no.json";
import fi from "@/locales/fi.json";
import ro from "@/locales/ro.json";
import pl from "@/locales/pl.json";
import cs from "@/locales/cs.json";
import hu from "@/locales/hu.json";
import bg from "@/locales/bg.json";

const resources: Record<string, { translation: any }> = {
  en: { translation: en },
  de: { translation: de },
  fr: { translation: fr },
  it: { translation: it },
  es: { translation: es },
  pt: { translation: pt },
  nl: { translation: nl },
  sv: { translation: sv },
  da: { translation: da },
  no: { translation: no },
  fi: { translation: fi },
  ro: { translation: ro },
  pl: { translation: pl },
  cs: { translation: cs },
  hu: { translation: hu },
  bg: { translation: bg },
};

const savedLang = localStorage.getItem("language");
const browserCode = navigator.language.split("-")[0];
const browserLang = resources[browserCode] ? browserCode : "en";

i18n.use(initReactI18next).init({
  resources,
  lng: savedLang || browserLang,
  fallbackLng: "en",
  interpolation: {
    escapeValue: true,
  },
});

export default i18n;
