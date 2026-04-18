import { useEffect, useState, useMemo, useRef } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { Check, X, Grid3X3, Pencil, ChevronLeft, ChevronRight, RotateCcw } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { getMatrixData } from "@/lib/db";
import { formatBytes, formatDate } from "@/lib/format";
import { useAppStore } from "@/lib/store";

const COLUMN_ORDER_KEY = "matrix-column-order";

function loadColumnOrder(): number[] {
  try {
    return JSON.parse(localStorage.getItem(COLUMN_ORDER_KEY) || "[]");
  } catch {
    return [];
  }
}

function saveColumnOrder(order: number[]) {
  localStorage.setItem(COLUMN_ORDER_KEY, JSON.stringify(order));
}

export function Matrix() {
  const { t } = useTranslation();
  const refreshKey = useAppStore((s) => s.refreshKey);
  const [backups, setBackups] = useState<Array<Record<string, any>>>([]);
  const [media, setMedia] = useState<Array<Record<string, any>>>([]);
  const [locations, setLocations] = useState<Array<Record<string, any>>>([]);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [columnOrder, setColumnOrder] = useState<number[]>(() => loadColumnOrder());
  const tableContainerRef = useRef<HTMLDivElement>(null);
  const [theadOffset, setTheadOffset] = useState(0);

  // Manual sticky header: track scroll position of the nearest scroll ancestor (main)
  useEffect(() => {
    const container = tableContainerRef.current;
    if (!container) return;
    // Find scrollable ancestor
    let scroller: HTMLElement | Window = window;
    let el: HTMLElement | null = container.parentElement;
    while (el) {
      const style = window.getComputedStyle(el);
      if (/(auto|scroll)/.test(style.overflowY)) { scroller = el; break; }
      el = el.parentElement;
    }
    const update = () => {
      const rect = container.getBoundingClientRect();
      const scrollerTop = scroller === window ? 0 : (scroller as HTMLElement).getBoundingClientRect().top;
      const offset = scrollerTop - rect.top;
      // Max offset so header doesn't leave the table
      const maxOffset = Math.max(0, container.clientHeight - 60);
      setTheadOffset(Math.max(0, Math.min(offset, maxOffset)));
    };
    update();
    scroller.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      scroller.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, []);

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

  // Sort media according to saved order; new media get appended at the end
  const sortedMedia = useMemo(() => {
    if (columnOrder.length === 0) return media;
    const byId = new Map(media.map((m) => [m.id as number, m]));
    const ordered: Array<Record<string, any>> = [];
    // Add media in saved order first
    for (const id of columnOrder) {
      const m = byId.get(id);
      if (m) {
        ordered.push(m);
        byId.delete(id);
      }
    }
    // Append any new media not yet in the order
    for (const m of byId.values()) ordered.push(m);
    return ordered;
  }, [media, columnOrder]);

  function moveColumn(index: number, direction: -1 | 1) {
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= sortedMedia.length) return;
    const newOrder = sortedMedia.map((m) => m.id as number);
    [newOrder[index], newOrder[newIndex]] = [newOrder[newIndex], newOrder[index]];
    setColumnOrder(newOrder);
    saveColumnOrder(newOrder);
  }

  function resetColumnOrder() {
    setColumnOrder([]);
    saveColumnOrder([]);
  }

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
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">{t("matrix.title")}</h1>
        {!isEmpty && (
          <div className="flex items-center gap-2">
            {editMode && columnOrder.length > 0 && (
              <Button variant="secondary" size="sm" onClick={resetColumnOrder}>
                <RotateCcw className="w-3.5 h-3.5" />
                {t("common.reset", { defaultValue: "Reset" })}
              </Button>
            )}
            <Button
              variant={editMode ? "primary" : "secondary"}
              size="sm"
              onClick={() => setEditMode(!editMode)}
            >
              <Pencil className="w-3.5 h-3.5" />
              {editMode ? t("common.done") : t("common.edit")}
            </Button>
          </div>
        )}
      </div>

      {isEmpty ? (
        <Card className="text-center py-12">
          <Grid3X3 className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
          <p className="text-muted-foreground">{t("matrix.noData")}</p>
        </Card>
      ) : (
        <div ref={tableContainerRef} className="overflow-x-auto border border-border rounded-xl relative">
          <table className="w-full text-sm">
            <thead
              style={{
                transform: theadOffset ? `translateY(${theadOffset}px)` : undefined,
                willChange: theadOffset ? "transform" : undefined,
                position: "relative",
                zIndex: 20,
              }}
            >
              <tr className="border-b border-border bg-muted/50">
                <th className="text-left px-4 py-3 font-semibold sticky left-0 bg-muted/50 z-30 min-w-[200px]">
                  {t("backups.name")}
                </th>
                {sortedMedia.map((m, idx) => (
                  <th
                    key={m.id as number}
                    className={`px-3 py-3 font-semibold text-center min-w-[100px] ${editMode ? "bg-primary/5" : "bg-muted/50"}`}
                  >
                    <div className="flex flex-col items-center gap-1">
                      <div className="text-xs">{m.name as string}</div>
                      {editMode && (
                        <div className="flex items-center gap-0.5">
                          <button
                            onClick={() => moveColumn(idx, -1)}
                            disabled={idx === 0}
                            className="p-0.5 rounded hover:bg-muted disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
                            title={t("matrix.moveLeft", { defaultValue: "Move left" })}
                          >
                            <ChevronLeft className="w-3.5 h-3.5 text-muted-foreground" />
                          </button>
                          <button
                            onClick={() => moveColumn(idx, 1)}
                            disabled={idx === sortedMedia.length - 1}
                            className="p-0.5 rounded hover:bg-muted disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
                            title={t("matrix.moveRight", { defaultValue: "Move right" })}
                          >
                            <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
                          </button>
                        </div>
                      )}
                    </div>
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
                      colSpan={sortedMedia.length + 1}
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
                      {sortedMedia.map((m) => {
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
