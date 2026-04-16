import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { Database, Shield, AlertTriangle, AlertCircle, PauseCircle, HardDrive, TrendingUp } from "lucide-react";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { getBackupsWithStatus, getMediaWithUsage, getAllEntries } from "@/lib/db";
import { formatBytes, formatDate, daysAgo } from "@/lib/format";
import { useAppStore } from "@/lib/store";

function getPieColors() {
  const style = getComputedStyle(document.documentElement);
  return [style.getPropertyValue("--accent").trim() || "#171717", style.getPropertyValue("--border").trim() || "#e5e5e5"];
}

export function Dashboard() {
  const { t } = useTranslation();
  const refreshKey = useAppStore((s) => s.refreshKey);
  const [backups, setBackups] = useState<Array<Record<string, any>>>([]);
  const [media, setMedia] = useState<Array<Record<string, any>>>([]);
  const [recentEntries, setRecentEntries] = useState<Array<Record<string, any>>>([]);
  const [allEntries, setAllEntries] = useState<Array<Record<string, any>>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [b, m, e, all] = await Promise.all([
          getBackupsWithStatus(),
          getMediaWithUsage(),
          getAllEntries(10),
          getAllEntries(),
        ]);
        setBackups(b);
        setMedia(m);
        setRecentEntries(e);
        setAllEntries(all);
      } catch (err) {
        console.error("Failed to load dashboard:", err);
      }
      setLoading(false);
    }
    load();
  }, [refreshKey]);

  if (loading) {
    return <div className="text-muted-foreground text-sm">{t("app.title")}...</div>;
  }

  const okCount = backups.filter((b) => b.status === "ok").length;
  const warnCount = backups.filter((b) => b.status === "warning").length;
  const critCount = backups.filter((b) => b.status === "critical").length;
  const pausedCount = backups.filter((b) => b.status === "paused").length;

  // Total storage stats
  const totalCapacity = media.reduce((sum, m) => sum + ((m.total_capacity_gb as number) || 0), 0);
  const totalUsed = media.reduce((sum, m) => sum + (m.used_gb as number), 0);
  const totalEntries = allEntries.length;
  const totalSize = allEntries.reduce((sum, e) => sum + ((e.size_bytes as number) || 0), 0);

  // 3-2-1 rule check
  const rule321Results = backups.map((b) => {
    const locs = b.storage_locations as Array<Record<string, any>>;
    const copies = locs.length;
    const mediaTypes = new Set(locs.map((l) => l.media_type)).size;
    const hasOffsite = locs.some((l) => l.media_type === "cloud" || l.media_type === "nas");
    const passes = copies >= 3 && mediaTypes >= 2 && hasOffsite;
    return { name: b.name as string, copies, mediaTypes, hasOffsite, passes };
  });
  const rulePassCount = rule321Results.filter((r) => r.passes).length;

  // Storage forecast: aggregate total size per month
  const monthlyData = new Map<string, number>();
  for (const e of [...allEntries].reverse()) {
    const date = new Date(e.backup_date as string);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    monthlyData.set(key, (monthlyData.get(key) || 0) + ((e.size_bytes as number) || 0));
  }
  // Cumulative
  let cumulative = 0;
  const forecastData: Array<{ month: string; size: number }> = [];
  for (const [month, bytes] of monthlyData) {
    cumulative += bytes;
    forecastData.push({ month, size: +(cumulative / (1024 ** 3)).toFixed(1) });
  }

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold">{t("dashboard.title")}</h1>

      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-muted">
              <Database className="w-4 h-4" />
            </div>
            <div>
              <p className="text-2xl font-bold">{backups.length}</p>
              <p className="text-xs text-muted-foreground">{t("dashboard.totalBackups")}</p>
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-emerald-50">
              <Shield className="w-4 h-4 text-emerald-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-emerald-600">{okCount}</p>
              <p className="text-xs text-muted-foreground">{t("dashboard.upToDate")}</p>
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-50">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-amber-600">{warnCount}</p>
              <p className="text-xs text-muted-foreground">{t("dashboard.warnings")}</p>
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-red-50">
              <AlertCircle className="w-4 h-4 text-red-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-red-600">{critCount}</p>
              <p className="text-xs text-muted-foreground">{t("dashboard.critical")}</p>
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-zinc-100">
              <PauseCircle className="w-4 h-4 text-zinc-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-zinc-500">{pausedCount}</p>
              <p className="text-xs text-muted-foreground">{t("dashboard.paused")}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Second stats row */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-muted">
              <HardDrive className="w-4 h-4" />
            </div>
            <div>
              <p className="text-lg font-bold">{media.length}</p>
              <p className="text-xs text-muted-foreground">{t("media.title")}</p>
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-muted">
              <TrendingUp className="w-4 h-4" />
            </div>
            <div>
              <p className="text-lg font-bold">{totalEntries}</p>
              <p className="text-xs text-muted-foreground">{t("backups.entries")}</p>
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-muted">
              <Database className="w-4 h-4" />
            </div>
            <div>
              <p className="text-lg font-bold">{formatBytes(totalSize)}</p>
              <p className="text-xs text-muted-foreground">{t("dashboard.totalSize")}</p>
            </div>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* Storage overview */}
        <Card>
          <CardHeader>
            <CardTitle>{t("dashboard.storageOverview")}</CardTitle>
          </CardHeader>
          {media.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("media.noMedia")}</p>
          ) : (
            <div className="space-y-4">
              {media.map((m) => {
                const used = m.used_gb as number;
                const total = m.total_capacity_gb as number | null;
                const pct = total ? Math.min((used / total) * 100, 100) : 0;
                const pieData = total
                  ? [
                      { name: "Used", value: used },
                      { name: "Free", value: Math.max(total - used, 0) },
                    ]
                  : [];

                return (
                  <div key={m.id as number} className="flex items-center gap-4">
                    {total ? (
                      <div className="w-12 h-12 shrink-0">
                        <ResponsiveContainer>
                          <PieChart>
                            <Pie
                              data={pieData}
                              dataKey="value"
                              innerRadius={14}
                              outerRadius={22}
                              startAngle={90}
                              endAngle={-270}
                              stroke="none"
                            >
                              {pieData.map((_, i) => (
                                <Cell key={i} fill={getPieColors()[i]} />
                              ))}
                            </Pie>
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                    ) : (
                      <div className="w-12 h-12 shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {m.name as string}
                      </p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>{formatBytes(used * 1024 * 1024 * 1024)} {t("dashboard.usedOf")} {total ? formatBytes(total * 1024 * 1024 * 1024) : "?"}</span>
                        {total && (
                          <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                            <div
                              className="h-full bg-primary rounded-full transition-all"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
              {totalCapacity > 0 && (
                <div className="pt-2 border-t border-border text-xs text-muted-foreground">
                  {t("dashboard.totalCapacity")}: {formatBytes(totalCapacity * 1024 * 1024 * 1024)} &middot; {formatBytes(totalUsed * 1024 * 1024 * 1024)} {t("media.used")} ({totalCapacity > 0 ? Math.round((totalUsed / totalCapacity) * 100) : 0}%)
                </div>
              )}
            </div>
          )}
        </Card>

        {/* 3-2-1 Rule */}
        <Card>
          <CardHeader>
            <CardTitle>{t("dashboard.backupRule")}</CardTitle>
          </CardHeader>
          {backups.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("dashboard.noBackups")}</p>
          ) : (
            <div className="space-y-2">
              <div className="flex gap-4 mb-3">
                <div className="text-center">
                  <p className="text-xl font-bold text-emerald-600">{rulePassCount}</p>
                  <p className="text-xs text-muted-foreground">{t("dashboard.rulePass")}</p>
                </div>
                <div className="text-center">
                  <p className="text-xl font-bold text-red-600">
                    {backups.length - rulePassCount}
                  </p>
                  <p className="text-xs text-muted-foreground">{t("dashboard.ruleFail")}</p>
                </div>
              </div>
              <div className="space-y-1">
                {rule321Results.map((r) => (
                  <div
                    key={r.name}
                    className="flex items-center justify-between text-xs py-1"
                  >
                    <span className="truncate">{r.name}</span>
                    <span className={r.passes ? "text-emerald-600" : "text-red-500"}>
                      {r.copies}/{r.mediaTypes}/{r.hasOffsite ? "1" : "0"}
                    </span>
                  </div>
                ))}
              </div>
              <p className="text-[10px] text-muted-foreground mt-2">
                {t("rule321.desc")}
              </p>
            </div>
          )}
        </Card>
      </div>

      {/* Storage Forecast */}
      {forecastData.length >= 2 && (
        <Card>
          <CardHeader>
            <CardTitle>{t("dashboard.storageForecast")}</CardTitle>
          </CardHeader>
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={forecastData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 10, fill: "var(--muted-fg)" }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 10, fill: "var(--muted-fg)" }} tickLine={false} axisLine={false} unit=" GB" width={55} />
                <Tooltip
                  contentStyle={{
                    borderRadius: "12px",
                    border: "1px solid var(--border)",
                    backgroundColor: "var(--card)",
                    color: "var(--fg)",
                    boxShadow: "0 4px 20px rgba(0,0,0,0.2)",
                    fontSize: "12px",
                    padding: "8px 12px",
                  }}
                  formatter={(value: any) => [`${value} GB`]}
                  separator=""
                />
                <Line
                  type="monotone"
                  dataKey="size"
                  stroke="var(--chart-line)"
                  strokeWidth={2}
                  dot={{ r: 3, fill: "var(--chart-dot)", stroke: "var(--chart-line)", strokeWidth: 2 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>
      )}

      {/* Recent activity */}
      <Card>
        <CardHeader>
          <CardTitle>{t("dashboard.recentActivity")}</CardTitle>
        </CardHeader>
        {recentEntries.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("dashboard.noBackups")}</p>
        ) : (
          <div className="space-y-2">
            {recentEntries.map((entry) => (
              <Link
                key={entry.id as number}
                to={`/backups/${entry.backup_id}`}
                className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-muted transition-colors"
              >
                <div>
                  <p className="text-sm font-medium">{entry.backup_name as string}</p>
                  <p className="text-xs text-muted-foreground">
                    {entry.media_name as string} &middot;{" "}
                    {formatDate(entry.backup_date as string)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm">{formatBytes(entry.size_bytes as number)}</p>
                  <p className="text-xs text-muted-foreground">
                    {daysAgo(entry.backup_date as string)} {t("common.days")} {t("common.ago")}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
