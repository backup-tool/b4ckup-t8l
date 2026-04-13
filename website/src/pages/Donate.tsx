import { useTranslation } from "react-i18next";
import { Heart, Coffee, CreditCard, Users } from "lucide-react";

const DONATE_OPTIONS = [
  {
    id: "kofi",
    icon: Coffee,
    name: "Ko-fi",
    desc: "donateKofiDesc",
    url: "https://ko-fi.com/YOUR_KOFI",
    color: "bg-[#FF5E5B]/10 text-[#FF5E5B]",
    btnColor: "bg-[#FF5E5B] hover:bg-[#e54e4b]",
  },
  {
    id: "paypal",
    icon: CreditCard,
    name: "PayPal",
    desc: "donatePaypalDesc",
    url: "https://paypal.me/YOUR_PAYPAL",
    color: "bg-[#0070BA]/10 text-[#0070BA]",
    btnColor: "bg-[#0070BA] hover:bg-[#005ea6]",
  },
  {
    id: "patreon",
    icon: Users,
    name: "Patreon",
    desc: "donatePatreonDesc",
    url: "https://patreon.com/YOUR_PATREON",
    color: "bg-[#FF424D]/10 text-[#FF424D]",
    btnColor: "bg-[#FF424D] hover:bg-[#e63940]",
  },
];

export function Donate() {
  const { t } = useTranslation();

  return (
    <div className="max-w-3xl mx-auto px-6 py-16">
      <div className="text-center mb-12">
        <div className="w-16 h-16 rounded-2xl bg-accent/10 flex items-center justify-center mx-auto mb-5">
          <Heart className="w-8 h-8 text-accent" />
        </div>
        <h1 className="text-4xl font-bold mb-3">{t("donate.title")}</h1>
        <p className="text-fg-muted max-w-lg mx-auto">{t("donate.subtitle")}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-12">
        {DONATE_OPTIONS.map((opt) => (
          <div
            key={opt.id}
            className="p-6 rounded-2xl bg-bg-card border border-border hover:border-accent/30 transition-colors text-center"
          >
            <div className={`w-12 h-12 rounded-xl ${opt.color} flex items-center justify-center mx-auto mb-4`}>
              <opt.icon className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-lg mb-2">{opt.name}</h3>
            <p className="text-xs text-fg-muted mb-5 leading-relaxed">{t(`donate.${opt.desc}`)}</p>
            <a
              href={opt.url}
              target="_blank"
              rel="noopener"
              className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-white font-semibold text-sm transition-colors ${opt.btnColor}`}
            >
              {t("donate.donateBtn")}
            </a>
          </div>
        ))}
      </div>

      <div className="text-center p-8 rounded-2xl bg-bg-card border border-border">
        <p className="text-sm text-fg-muted leading-relaxed">{t("donate.thanks")}</p>
      </div>
    </div>
  );
}
