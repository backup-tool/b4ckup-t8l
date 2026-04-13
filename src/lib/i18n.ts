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
import sr from "@/locales/sr.json";
import hr from "@/locales/hr.json";
import uk from "@/locales/uk.json";
import ru from "@/locales/ru.json";
import el from "@/locales/el.json";
import tr from "@/locales/tr.json";
import ar from "@/locales/ar.json";
import he from "@/locales/he.json";
import fa from "@/locales/fa.json";
import ku from "@/locales/ku.json";
import hy from "@/locales/hy.json";
import ps from "@/locales/ps.json";
import hi from "@/locales/hi.json";
import ur from "@/locales/ur.json";
import bn from "@/locales/bn.json";

const resources: Record<string, { translation: any }> = {
  en: { translation: en }, de: { translation: de }, fr: { translation: fr },
  it: { translation: it }, es: { translation: es }, pt: { translation: pt },
  nl: { translation: nl }, sv: { translation: sv }, da: { translation: da },
  no: { translation: no }, fi: { translation: fi }, ro: { translation: ro },
  pl: { translation: pl }, cs: { translation: cs }, hu: { translation: hu },
  bg: { translation: bg }, sr: { translation: sr }, hr: { translation: hr },
  uk: { translation: uk }, ru: { translation: ru }, el: { translation: el },
  tr: { translation: tr }, ar: { translation: ar }, he: { translation: he },
  fa: { translation: fa }, ku: { translation: ku }, hy: { translation: hy },
  ps: { translation: ps }, hi: { translation: hi }, ur: { translation: ur },
  bn: { translation: bn },
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
