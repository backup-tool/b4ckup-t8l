import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  BarChart, Bar, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer,
} from "recharts";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { getAllEntries, getBackupsWithStatus, getMediaWithUsage } from "@/lib/db";
import { formatBytes } from "@/lib/format";
import { useAppStore } from "@/lib/store";

export function Statistics() {
  const { t } = useTranslation();
  const refreshKey = useAppStore((s) => s.refreshKey);
  const [entries, setEntries] = useState<Array<Record<string, any>>>([]);
  const [backups, setBackups] = useState<Array<Record<string, any>>>([]);
  const [media, setMedia] = useState<Array<Record<string, any>>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const [e, b, m] = await Promise.all([
        getAllEntries(),
        getBackupsWithStatus(),
        getMediaWithUsage(),
      ]);
      setEntries(e);
      setBackups(b);
      setMedia(m);
      setLoading(false);
    }
    load();
  }, [refreshKey]);

  if (loading) return null;

  // GB per month
  const monthlySize = new Map<string, number>();
  const monthlyCount = new Map<string, number>();
  for (const e of entries) {
    const date = new Date(e.backup_date as string);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    monthlySize.set(key, (monthlySize.get(key) || 0) + ((e.size_bytes as number) || 0));
    monthlyCount.set(key, (monthlyCount.get(key) || 0) + 1);
  }

  const sizePerMonth = Array.from(monthlySize.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, bytes]) => ({
      month,
      gb: Number((bytes / (1024 ** 3)).toFixed(2)),
    }));

  const countPerMonth = Array.from(monthlyCount.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, count]) => ({ month, count }));

  // Cumulative
  let cumulative = 0;
  const cumulativeData = sizePerMonth.map((d) => {
    cumulative += d.gb;
    return { month: d.month, gb: Number(cumulative.toFixed(2)) };
  });

  // Top 5 largest backups
  const backupSizes = backups.map((b) => {
    const latest = b.latest_entry as Record<string, any> | null;
    return {
      id: b.id as number,
      name: b.name as string,
      device: b.device_name as string,
      size: latest ? (latest.size_bytes as number) : 0,
    };
  }).sort((a, b) => b.size - a.size).slice(0, 5);

  // Average size per source
  const deviceSizes = new Map<string, { total: number; count: number }>();
  for (const b of backups) {
    const device = (b.device_name as string) || "—";
    const latest = b.latest_entry as Record<string, any> | null;
    const size = latest ? (latest.size_bytes as number) : 0;
    const existing = deviceSizes.get(device) || { total: 0, count: 0 };
    existing.total += size;
    existing.count += 1;
    deviceSizes.set(device, existing);
  }
  const avgPerDevice = Array.from(deviceSizes.entries())
    .map(([device, { total, count }]) => ({
      device,
      avg: total / count,
      total,
      count,
    }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 8);

  // Total stats
  const totalSize = entries.reduce((s, e) => s + ((e.size_bytes as number) || 0), 0);
  const totalEntries = entries.length;
  const totalBackups = backups.length;
  const totalMedia = media.length;

  const tooltipStyle = {
    borderRadius: "12px",
    border: "1px solid var(--border)",
    backgroundColor: "var(--card)",
    color: "var(--fg)",
    boxShadow: "0 4px 20px rgba(0,0,0,0.2)",
    fontSize: "12px",
    padding: "8px 12px",
  };

  const GradientDefs = () => (
    <defs>
      <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#4ade80" stopOpacity={0.9} />
        <stop offset="100%" stopColor="#22c55e" stopOpacity={0.6} />
      </linearGradient>
      <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#4ade80" stopOpacity={0.3} />
        <stop offset="100%" stopColor="#4ade80" stopOpacity={0.02} />
      </linearGradient>
      <linearGradient id="barGradient2" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#60a5fa" stopOpacity={0.9} />
        <stop offset="100%" stopColor="#3b82f6" stopOpacity={0.6} />
      </linearGradient>
    </defs>
  );

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold">{t("statistics.title")}</h1>

      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <p className="text-2xl font-bold">{totalBackups}</p>
          <p className="text-xs text-muted-foreground">{t("statistics.totalBackups")}</p>
        </Card>
        <Card>
          <p className="text-2xl font-bold">{totalEntries}</p>
          <p className="text-xs text-muted-foreground">{t("statistics.totalEntries")}</p>
        </Card>
        <Card>
          <p className="text-2xl font-bold">{totalMedia}</p>
          <p className="text-xs text-muted-foreground">{t("statistics.totalMedia")}</p>
        </Card>
        <Card>
          <p className="text-2xl font-bold">{formatBytes(totalSize)}</p>
          <p className="text-xs text-muted-foreground">{t("statistics.totalSize")}</p>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* GB per month */}
        <Card>
          <CardHeader>
            <CardTitle>{t("statistics.sizePerMonth")}</CardTitle>
          </CardHeader>
          {sizePerMonth.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={sizePerMonth} barCategoryGap="20%">
                <GradientDefs />
                <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" vertical={false} opacity={0.5} />
                <XAxis dataKey="month" tick={{ fontSize: 10, fill: "var(--muted-fg)" }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 10, fill: "var(--muted-fg)" }} tickLine={false} axisLine={false} unit=" GB" width={55} />
                <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "var(--muted)", opacity: 0.3 }} formatter={(v: any) => [`${v} GB`, ""]} />
                <Bar dataKey="gb" fill="url(#barGradient)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-muted-foreground py-8 text-center">{t("statistics.noData")}</p>
          )}
        </Card>

        {/* Cumulative */}
        <Card>
          <CardHeader>
            <CardTitle>{t("statistics.cumulative")}</CardTitle>
          </CardHeader>
          {cumulativeData.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <AreaChart data={cumulativeData}>
                <GradientDefs />
                <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" vertical={false} opacity={0.5} />
                <XAxis dataKey="month" tick={{ fontSize: 10, fill: "var(--muted-fg)" }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 10, fill: "var(--muted-fg)" }} tickLine={false} axisLine={false} unit=" GB" width={55} />
                <Tooltip contentStyle={tooltipStyle} formatter={(v: any) => [`${v} GB`, ""]} />
                <Area type="monotone" dataKey="gb" stroke="#4ade80" fill="url(#areaGradient)" strokeWidth={2.5} dot={{ r: 3, fill: "#4ade80", stroke: "#4ade80", strokeWidth: 0 }} activeDot={{ r: 5, fill: "#4ade80", stroke: "var(--card)", strokeWidth: 2 }} />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-muted-foreground py-8 text-center">{t("statistics.noData")}</p>
          )}
        </Card>

        {/* Backups per month */}
        <Card>
          <CardHeader>
            <CardTitle>{t("statistics.backupsPerMonth")}</CardTitle>
          </CardHeader>
          {countPerMonth.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={countPerMonth} barCategoryGap="20%">
                <GradientDefs />
                <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" vertical={false} opacity={0.5} />
                <XAxis dataKey="month" tick={{ fontSize: 10, fill: "var(--muted-fg)" }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 10, fill: "var(--muted-fg)" }} tickLine={false} axisLine={false} width={35} />
                <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "var(--muted)", opacity: 0.3 }} />
                <Bar dataKey="count" fill="url(#barGradient2)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-muted-foreground py-8 text-center">{t("statistics.noData")}</p>
          )}
        </Card>

        {/* Top 5 largest */}
        <Card>
          <CardHeader>
            <CardTitle>{t("statistics.topBackups")}</CardTitle>
          </CardHeader>
          {backupSizes.length > 0 ? (
            <div className="space-y-2">
              {backupSizes.map((b) => (
                <Link key={b.id} to={`/backups/${b.id}`} className="flex items-center justify-between py-2 px-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors cursor-pointer">
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{b.name}</p>
                    <p className="text-[10px] text-muted-foreground">{b.device}</p>
                  </div>
                  <span className="text-sm font-medium tabular-nums shrink-0 ml-4">{formatBytes(b.size)}</span>
                </Link>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground py-8 text-center">{t("statistics.noData")}</p>
          )}
        </Card>
      </div>

      {/* Average per source */}
      {avgPerDevice.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>{t("statistics.avgPerSource")}</CardTitle>
          </CardHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            {avgPerDevice.map((d) => (
              <Link key={d.device} to={`/backups?source=${encodeURIComponent(d.device)}`} className="py-3 px-4 rounded-lg bg-muted/50 hover:bg-muted transition-colors cursor-pointer block">
                <p className="text-sm font-medium truncate">{d.device}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {d.count} {t("nav.backups")} · {formatBytes(d.total)} {t("statistics.total")}
                </p>
                <p className="text-xs font-medium mt-0.5">
                  {t("statistics.avg")}: {formatBytes(d.avg)}
                </p>
              </Link>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
