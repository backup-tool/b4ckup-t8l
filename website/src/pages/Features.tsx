import { useTranslation } from "react-i18next";
import {
  LayoutDashboard, FolderSearch, HardDrive, Bell, Moon, Globe,
  Grid3X3, MonitorDown, Download, Lock, Monitor, FileOutput,
} from "lucide-react";

const ALL_FEATURES = [
  { icon: LayoutDashboard, key: "dashboard" },
  { icon: Database, key: "tracking" },
  { icon: FolderSearch, key: "scan" },
  { icon: HardDrive, key: "media" },
  { icon: Grid3X3, key: "matrix" },
  { icon: Bell, key: "notifications" },
  { icon: Moon, key: "darkmode" },
  { icon: Globe, key: "i18n" },
  { icon: MonitorDown, key: "tray" },
  { icon: FileOutput, key: "export" },
  { icon: Monitor, key: "sources" },
  { icon: Lock, key: "encryption" },
];

import { Database } from "lucide-react";

export function Features() {
  const { t } = useTranslation();

  return (
    <div className="max-w-6xl mx-auto px-6 py-16">
      <div className="text-center mb-14">
        <h1 className="text-4xl font-bold mb-3">{t("features.title")}</h1>
        <p className="text-fg-muted max-w-xl mx-auto">{t("features.subtitle")}</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {ALL_FEATURES.map((f) => (
          <div
            key={f.key}
            className="p-6 rounded-2xl bg-bg-card border border-border hover:border-accent/30 transition-all hover:-translate-y-0.5"
          >
            <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center mb-4">
              <f.icon className="w-5 h-5 text-accent" />
            </div>
            <h3 className="font-semibold mb-2">{t(`features.${f.key}`)}</h3>
            <p className="text-sm text-fg-muted leading-relaxed">
              {t(`features.${f.key}Desc`)}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
