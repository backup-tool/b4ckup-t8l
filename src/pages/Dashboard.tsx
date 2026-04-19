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
import { Database, Shield, AlertTriangle, AlertCircle, PauseCircle, HardDrive, TrendingUp, Info, ChevronDown } from "lucide-react";
import { Popover } from "@/components/ui/Popover";
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
  const [storageExpanded, setStorageExpanded] = useState(false);
  const [ruleExpanded, setRuleExpanded] = useState(false);
  const STORAGE_COLLAPSED_LIMIT = 6;
  const RULE_COLLAPSED_LIMIT = 8;

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
    // Provider-managed locations count as offsite (data lives on vendor servers)
    const hasOffsite = locs.some(
      (l) => l.media_type === "cloud" || l.media_type === "nas" || l.backup_mode === "provider_managed"
    );
    // Flag: all locations are provider-managed → user has no independent copy
    const providerOnly = locs.length > 0 && locs.every((l) => l.backup_mode === "provider_managed");
    // Provider-only backups don't satisfy the 3-2-1 rule: you need at least one copy
    // you actually control, not just the vendor's storage.
    const passes = !providerOnly && copies >= 3 && mediaTypes >= 2 && hasOffsite;
    return { name: b.name as string, copies, mediaTypes, hasOffsite, providerOnly, passes };
  });
  const rulePassCount = rule321Results.filter((r) => r.passes).length;

  // Storage forecast: aggregate total size per month, then project forward with linear regression
  const monthlyData = new Map<string, number>();
  for (const e of [...allEntries].reverse()) {
    const date = new Date(e.backup_date as string);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    monthlyData.set(key, (monthlyData.get(key) || 0) + ((e.size_bytes as number) || 0));
  }
  // Sort chronologically and compute cumulative historical values
  const sortedMonths = Array.from(monthlyData.keys()).sort();
  let cumulative = 0;
  type ForecastPoint = { month: string; historical?: number; forecast?: number };
  const forecastData: ForecastPoint[] = [];
  for (const month of sortedMonths) {
    cumulative += monthlyData.get(month) || 0;
    forecastData.push({ month, historical: +(cumulative / (1024 ** 3)).toFixed(1) });
  }

  // Generate forecast: linear regression on last 12 months (or all if fewer)
  const FORECAST_MONTHS = 12;
  if (forecastData.length >= 2) {
    const recent = forecastData.slice(-12);
    const n = recent.length;
    const xs = recent.map((_, i) => i);
    const ys = recent.map((p) => p.historical!);
    const sumX = xs.reduce((a, b) => a + b, 0);
    const sumY = ys.reduce((a, b) => a + b, 0);
    const sumXY = xs.reduce((a, x, i) => a + x * ys[i], 0);
    const sumXX = xs.reduce((a, x) => a + x * x, 0);
    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;
    const lastValue = ys[n - 1];
    // Make sure forecast connects to last historical point
    forecastData[forecastData.length - 1].forecast = lastValue;
    // Parse last month
    const [lastYear, lastMonth] = sortedMonths[sortedMonths.length - 1].split("-").map(Number);
    for (let i = 1; i <= FORECAST_MONTHS; i++) {
      const date = new Date(lastYear, lastMonth - 1 + i, 1);
      const month = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      // Project: slope-based, but never decrease below last value
      const projected = intercept + slope * (n - 1 + i);
      forecastData.push({ month, forecast: Math.max(lastValue, +projected.toFixed(1)) });
    }
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
              {(storageExpanded ? media : media.slice(0, STORAGE_COLLAPSED_LIMIT)).map((m) => {
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
              {media.length > STORAGE_COLLAPSED_LIMIT && (
                <button
                  onClick={() => setStorageExpanded(!storageExpanded)}
                  className="flex items-center justify-center gap-1 w-full py-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  <ChevronDown className={`w-3.5 h-3.5 transition-transform ${storageExpanded ? "rotate-180" : ""}`} />
                  {storageExpanded
                    ? t("common.showLess")
                    : t("dashboard.showAllMedia", { count: media.length - STORAGE_COLLAPSED_LIMIT, defaultValue: `Show all (${media.length})` })}
                </button>
              )}
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
            <div className="flex items-center gap-2">
              <CardTitle>{t("dashboard.backupRule")}</CardTitle>
              <Popover
                trigger={
                  <button className="p-1 rounded-full hover:bg-muted transition-colors" aria-label="Info">
                    <Info className="w-3.5 h-3.5 text-muted-foreground" />
                  </button>
                }
              >
                <div className="max-w-sm space-y-2 text-sm">
                  <p className="font-semibold">{t("rule321.title")}</p>
                  <p className="text-xs text-muted-foreground">{t("rule321.desc")}</p>
                  <ul className="space-y-2 text-xs">
                    <li className="flex gap-2">
                      <span className="text-accent font-bold shrink-0">3</span>
                      <span>{t("rule321.explainCopies")}</span>
                    </li>
                    <li className="flex gap-2">
                      <span className="text-accent font-bold shrink-0">2</span>
                      <span>{t("rule321.explainMediaTypes")}</span>
                    </li>
                    <li className="flex gap-2">
                      <span className="text-accent font-bold shrink-0">1</span>
                      <span>{t("rule321.explainOffsite")}</span>
                    </li>
                  </ul>
                  <p className="text-[10px] text-muted-foreground pt-2 border-t border-border">
                    {t("rule321.explainDisplay")}
                  </p>
                </div>
              </Popover>
            </div>
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
                {(ruleExpanded ? rule321Results : rule321Results.slice(0, RULE_COLLAPSED_LIMIT)).map((r) => (
                  <div
                    key={r.name}
                    className="flex items-center justify-between text-xs py-1 gap-2"
                  >
                    <span className="truncate flex items-center gap-1.5 min-w-0">
                      <span className="truncate">{r.name}</span>
                      {r.providerOnly && (
                        <span
                          className="text-[9px] text-sky-600 bg-sky-500/10 px-1.5 py-0.5 rounded font-medium shrink-0"
                          title={t("dashboard.providerOnlyHint")}
                        >
                          ☁
                        </span>
                      )}
                    </span>
                    <span className={r.passes ? "text-emerald-600 shrink-0" : "text-red-500 shrink-0"}>
                      {r.copies}/{r.mediaTypes}/{r.hasOffsite ? "1" : "0"}
                    </span>
                  </div>
                ))}
              </div>
              {rule321Results.length > RULE_COLLAPSED_LIMIT && (
                <button
                  onClick={() => setRuleExpanded(!ruleExpanded)}
                  className="flex items-center justify-center gap-1 w-full py-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  <ChevronDown className={`w-3.5 h-3.5 transition-transform ${ruleExpanded ? "rotate-180" : ""}`} />
                  {ruleExpanded
                    ? t("common.showLess")
                    : t("dashboard.showAllBackups", { count: rule321Results.length - RULE_COLLAPSED_LIMIT, defaultValue: `Show all (${rule321Results.length})` })}
                </button>
              )}
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
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center gap-2">
                <CardTitle>{t("dashboard.storageForecast")}</CardTitle>
                <Popover
                  trigger={
                    <button className="p-1 rounded-full hover:bg-muted transition-colors" aria-label="Info">
                      <Info className="w-3.5 h-3.5 text-muted-foreground" />
                    </button>
                  }
                >
                  <div className="max-w-sm space-y-2 text-xs">
                    <p className="font-semibold">{t("dashboard.storageForecast")}</p>
                    <p className="text-muted-foreground">{t("dashboard.forecastExplain")}</p>
                  </div>
                </Popover>
              </div>
              <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-0.5 bg-[var(--chart-line)]" />
                  {t("dashboard.forecastHistorical")}
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-0.5 border-t border-dashed border-[var(--chart-line)]" />
                  {t("dashboard.forecastPredicted")}
                </div>
              </div>
            </div>
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
                  formatter={(value: any, name: any) => {
                    if (value == null) return [null, null];
                    const label = name === "historical" ? t("dashboard.forecastHistorical") : t("dashboard.forecastPredicted");
                    return [`${value} GB`, label];
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="historical"
                  stroke="var(--chart-line)"
                  strokeWidth={2}
                  dot={{ r: 3, fill: "var(--chart-dot)", stroke: "var(--chart-line)", strokeWidth: 2 }}
                  connectNulls={false}
                  name="historical"
                />
                <Line
                  type="monotone"
                  dataKey="forecast"
                  stroke="var(--chart-line)"
                  strokeWidth={2}
                  strokeDasharray="6 4"
                  dot={{ r: 3, fill: "var(--chart-dot)", stroke: "var(--chart-line)", strokeWidth: 2 }}
                  connectNulls={false}
                  name="forecast"
                  opacity={0.7}
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
