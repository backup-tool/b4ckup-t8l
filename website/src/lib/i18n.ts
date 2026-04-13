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
import sr from "@/locales/sr.json";
import hr from "@/locales/hr.json";
import uk from "@/locales/uk.json";
import el from "@/locales/el.json";

const saved = localStorage.getItem("lang");
const browserLang = navigator.language.split("-")[0];
const supported = ["en", "de", "ru", "fr", "it", "es", "pt", "nl", "sv", "da", "no", "fi", "ro", "pl", "cs", "hu", "bg", "sr", "hr", "uk", "el"];
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
    sr: { translation: sr },
    hr: { translation: hr },
    uk: { translation: uk },
    el: { translation: el },
  },
  lng: saved || browser,
  fallbackLng: "en",
  interpolation: { escapeValue: false },
});

export default i18n;
