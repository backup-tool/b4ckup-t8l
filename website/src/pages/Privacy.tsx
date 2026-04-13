import { useTranslation } from "react-i18next";

export function Privacy() {
  const { t } = useTranslation();

  const sections = [
    { title: t("privacy.responsible"), text: t("privacy.responsibleText") },
    { title: t("privacy.hosting"), text: t("privacy.hostingText") },
    { title: t("privacy.cookies"), text: t("privacy.cookiesText") },
    { title: t("privacy.contact"), text: t("privacy.contactText") },
    { title: t("privacy.downloads"), text: t("privacy.downloadsText") },
    { title: t("privacy.rights"), text: t("privacy.rightsText") },
    { title: t("privacy.changes"), text: t("privacy.changesText") },
  ];

  return (
    <div className="max-w-2xl mx-auto px-6 py-16">
      <h1 className="text-4xl font-bold mb-4">{t("privacy.title")}</h1>
      <p className="text-fg-muted text-sm mb-10 leading-relaxed">{t("privacy.intro")}</p>

      <div className="space-y-8">
        {sections.map((s, i) => (
          <section key={i}>
            <h2 className="text-lg font-semibold mb-2">{s.title}</h2>
            <p className="text-sm text-fg-muted leading-relaxed">{s.text}</p>
          </section>
        ))}
      </div>
    </div>
  );
}
