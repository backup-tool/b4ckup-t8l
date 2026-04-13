import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { Clock } from "lucide-react";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { CustomSelect } from "@/components/ui/CustomSelect";
import { getAllEntries, getEntriesInRange } from "@/lib/db";
import { formatBytes, formatDate, formatDateTime } from "@/lib/format";
import { useAppStore } from "@/lib/store";

type Period = "30" | "90" | "365" | "all";

export function History() {
  const { t } = useTranslation();
  const refreshKey = useAppStore((s) => s.refreshKey);
  const [entries, setEntries] = useState<Array<Record<string, any>>>([]);
  const [period, setPeriod] = useState<Period>("90");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        if (period === "all") {
          setEntries(await getAllEntries());
        } else {
          const now = new Date();
          const start = new Date(now);
          start.setDate(start.getDate() - parseInt(period));
          setEntries(
            await getEntriesInRange(
              start.toISOString().split("T")[0],
              now.toISOString().split("T")[0] + "T23:59:59"
            )
          );
        }
      } catch (err) {
        console.error(err);
      }
      setLoading(false);
    }
    load();
  }, [period, refreshKey]);

  // Build chart data: aggregate size per day
  const chartMap = new Map<string, number>();
  for (const entry of [...entries].reverse()) {
    const date = formatDate(entry.backup_date as string);
    chartMap.set(
      date,
      (chartMap.get(date) || 0) + (entry.size_bytes as number)
    );
  }
  const chartData = Array.from(chartMap.entries()).map(([date, bytes]) => ({
    date,
    size: Number((bytes / (1024 * 1024 * 1024)).toFixed(2)),
  }));

  if (loading) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">{t("history.title")}</h1>
        <CustomSelect
          className="w-48"
          value={period}
          onChange={(val) => setPeriod(val as Period)}
          options={[
            { value: "30", label: t("history.last30") },
            { value: "90", label: t("history.last90") },
            { value: "365", label: t("history.lastYear") },
            { value: "all", label: t("history.allTime") },
          ]}
        />
      </div>

      {/* Size chart */}
      <Card>
        <CardHeader>
          <CardTitle>{t("history.sizeOverTime")}</CardTitle>
        </CardHeader>
        {chartData.length < 2 ? (
          <p className="text-sm text-muted-foreground">{t("history.noHistory")}</p>
        ) : (
          <div className="h-64">
            <ResponsiveContainer>
              <AreaChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: "var(--muted-fg)" }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 10, fill: "var(--muted-fg)" }} tickLine={false} axisLine={false} unit=" GB" />
                <Tooltip
                  contentStyle={{
                    borderRadius: "8px",
                    border: "1px solid var(--border)",
                    backgroundColor: "var(--card)",
                    color: "var(--fg)",
                    fontSize: "12px",
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="size"
                  stroke="var(--chart-line)"
                  fill="var(--chart-line)"
                  fillOpacity={0.1}
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </Card>

      {/* Timeline */}
      <Card>
        <CardHeader>
          <CardTitle>{t("history.timeline")}</CardTitle>
        </CardHeader>
        {entries.length === 0 ? (
          <div className="text-center py-8">
            <Clock className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground">{t("history.noHistory")}</p>
          </div>
        ) : (
          <div className="space-y-1 max-h-96 overflow-y-auto">
            {entries.map((entry) => (
              <Link
                key={entry.id as number}
                to={`/backups/${entry.backup_id}`}
                className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-muted transition-colors"
              >
                <div>
                  <p className="text-sm font-medium">
                    {entry.backup_name as string}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {entry.media_name as string} &middot;{" "}
                    {formatDateTime(entry.backup_date as string)}
                  </p>
                </div>
                <p className="text-sm text-muted-foreground">
                  {formatBytes(entry.size_bytes as number)}
                </p>
              </Link>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
