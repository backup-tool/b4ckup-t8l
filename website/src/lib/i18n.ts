import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import en from "@/locales/en.json";
import de from "@/locales/de.json";
import ru from "@/locales/ru.json";
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

const saved = localStorage.getItem("lang");
const browserLang = navigator.language.split("-")[0];
const supported = ["en", "de", "ru", "fr", "it", "es", "pt", "nl", "sv", "da", "no", "fi", "ro", "pl", "cs", "hu", "bg"];
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
  },
  lng: saved || browser,
  fallbackLng: "en",
  interpolation: { escapeValue: false },
});

export default i18n;
