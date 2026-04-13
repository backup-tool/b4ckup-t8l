import { useTranslation } from "react-i18next";

export function Imprint() {
  const { t } = useTranslation();

  return (
    <div className="max-w-2xl mx-auto px-6 py-16">
      <h1 className="text-4xl font-bold mb-8">{t("imprint.title")}</h1>

      <div className="prose prose-invert space-y-6 text-sm text-fg-muted leading-relaxed">
        <section>
          <h2 className="text-lg font-semibold text-fg mb-3">{t("imprint.according")}</h2>
          <p>{t("imprint.name")}</p>
          <p>{t("imprint.address")}</p>
          <p>{t("imprint.city")}</p>
          <p>{t("imprint.country")}</p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-fg mb-3">{t("nav.contact")}</h2>
          <p>{t("imprint.email")}</p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-fg mb-3">{t("imprint.responsible")}</h2>
          <p>{t("imprint.name")}</p>
          <p>{t("imprint.address")}</p>
          <p>{t("imprint.city")}</p>
          <p>{t("imprint.country")}</p>
        </section>

      </div>
    </div>
  );
}
