import { useTranslation } from "react-i18next";
import { cn } from "@/lib/cn";
import type { BackupStatus } from "@/lib/types";

export function StatusBadge({ status }: { status: BackupStatus }) {
  const { t } = useTranslation();

  return (
    <span
      role="status"
      aria-label={t(`status.${status}`)}
      className={cn(
        "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium",
        status === "ok" && "bg-emerald-50 text-emerald-700",
        status === "warning" && "bg-amber-50 text-amber-700",
        status === "critical" && "bg-red-50 text-red-700",
        status === "paused" && "bg-zinc-100 text-zinc-500"
      )}
    >
      <span
        className={cn(
          "w-1.5 h-1.5 rounded-full",
          status === "ok" && "bg-emerald-500",
          status === "warning" && "bg-amber-500",
          status === "critical" && "bg-red-500",
          status === "paused" && "bg-zinc-400"
        )}
      />
      {t(`status.${status}`)}
    </span>
  );
}
