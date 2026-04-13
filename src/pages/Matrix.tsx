import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { Check, X, Grid3X3 } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { getMatrixData } from "@/lib/db";
import { formatBytes, formatDate } from "@/lib/format";
import { useAppStore } from "@/lib/store";

export function Matrix() {
  const { t } = useTranslation();
  const refreshKey = useAppStore((s) => s.refreshKey);
  const [backups, setBackups] = useState<Array<Record<string, any>>>([]);
  const [media, setMedia] = useState<Array<Record<string, any>>>([]);
  const [locations, setLocations] = useState<Array<Record<string, any>>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const data = await getMatrixData();
      setBackups(data.backups);
      setMedia(data.media);
      setLocations(data.locations);
      setLoading(false);
    }
    load();
  }, [refreshKey]);

  if (loading) return null;

  const isEmpty = backups.length === 0 || media.length === 0;

  // Group backups by device
  const groups = new Map<string, typeof backups>();
  for (const b of backups) {
    const device = (b.device_name as string) || "—";
    if (!groups.has(device)) groups.set(device, []);
    groups.get(device)!.push(b);
  }

  function getLocation(backupId: number, mediaId: number) {
    return locations.find(
      (l) => l.backup_id === backupId && l.storage_media_id === mediaId
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold">{t("matrix.title")}</h1>

      {isEmpty ? (
        <Card className="text-center py-12">
          <Grid3X3 className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
          <p className="text-muted-foreground">{t("matrix.noData")}</p>
        </Card>
      ) : (
        <div className="overflow-x-auto border border-border rounded-xl">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="text-left px-4 py-3 font-semibold sticky left-0 bg-muted/50 z-10 min-w-[200px]">
                  {t("backups.name")}
                </th>
                {media.map((m) => (
                  <th
                    key={m.id as number}
                    className="px-3 py-3 font-semibold text-center min-w-[100px]"
                  >
                    <div className="text-xs">{m.name as string}</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Array.from(groups.entries()).map(([device, items]) => (
                <>
                  {/* Device group header */}
                  <tr key={`group-${device}`} className="bg-muted/30">
                    <td
                      colSpan={media.length + 1}
                      className="px-4 py-2 text-xs font-bold text-muted-foreground uppercase tracking-wide sticky left-0 bg-muted/30"
                    >
                      {device}
                    </td>
                  </tr>
                  {/* Backups in group */}
                  {items.map((b) => (
                    <tr
                      key={b.id as number}
                      className="border-b border-border hover:bg-muted/20 transition-colors"
                    >
                      <td className="px-4 py-2.5 sticky left-0 bg-card z-10">
                        <Link
                          to={`/backups/${b.id}`}
                          className="text-sm font-medium hover:underline"
                        >
                          {b.name as string}
                        </Link>
                      </td>
                      {media.map((m) => {
                        const loc = getLocation(b.id as number, m.id as number);
                        return (
                          <td key={m.id as number} className="px-3 py-2.5 text-center">
                            {loc ? (
                              <div className="flex flex-col items-center gap-0.5">
                                <Check className="w-4 h-4 text-emerald-500" />
                                {loc.last_date && (
                                  <span className="text-[10px] text-muted-foreground">
                                    {formatDate(loc.last_date as string)}
                                  </span>
                                )}
                                {loc.last_size && (loc.last_size as number) > 0 && (
                                  <span className="text-[10px] text-muted-foreground">
                                    {formatBytes(loc.last_size as number)}
                                  </span>
                                )}
                              </div>
                            ) : (
                              <X className="w-4 h-4 text-muted-foreground/30 mx-auto" />
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
