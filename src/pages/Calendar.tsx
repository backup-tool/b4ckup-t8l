import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { getAllEntries } from "@/lib/db";
import { formatBytes } from "@/lib/format";
import { useAppStore } from "@/lib/store";
import {
  startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  eachDayOfInterval, format, isSameMonth, isSameDay,
  addMonths, subMonths,
} from "date-fns";

export function Calendar() {
  const { t } = useTranslation();
  const refreshKey = useAppStore((s) => s.refreshKey);
  const [entries, setEntries] = useState<Array<Record<string, any>>>([]);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);

  useEffect(() => {
    getAllEntries().then(setEntries);
  }, [refreshKey]);

  // Group entries by date
  const entryMap = new Map<string, Array<Record<string, any>>>();
  for (const e of entries) {
    const dateKey = (e.backup_date as string).split("T")[0];
    if (!entryMap.has(dateKey)) entryMap.set(dateKey, []);
    entryMap.get(dateKey)!.push(e);
  }

  // Calendar grid
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: calStart, end: calEnd });

  const weekDays = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];

  const selectedEntries = selectedDay
    ? entryMap.get(format(selectedDay, "yyyy-MM-dd")) || []
    : [];

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold">{t("calendar.title")}</h1>

      <Card>
        {/* Month navigation */}
        <div className="flex items-center justify-between mb-4">
          <Button variant="ghost" size="sm" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <h2 className="text-sm font-semibold">
            {format(currentMonth, "MMMM yyyy")}
          </h2>
          <Button variant="ghost" size="sm" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>

        {/* Weekday headers */}
        <div className="grid grid-cols-7 gap-1 mb-1">
          {weekDays.map((d) => (
            <div key={d} className="text-center text-[10px] font-medium text-muted-foreground py-1">
              {d}
            </div>
          ))}
        </div>

        {/* Day grid */}
        <div className="grid grid-cols-7 gap-1">
          {days.map((day) => {
            const key = format(day, "yyyy-MM-dd");
            const dayEntries = entryMap.get(key) || [];
            const isCurrentMonth = isSameMonth(day, currentMonth);
            const isSelected = selectedDay && isSameDay(day, selectedDay);
            const isToday = isSameDay(day, new Date());
            const hasEntries = dayEntries.length > 0;
            return (
              <button
                key={key}
                onClick={() => setSelectedDay(hasEntries ? day : null)}
                className={`
                  relative p-1.5 rounded-lg text-center transition-colors min-h-[52px]
                  ${!isCurrentMonth ? "opacity-30" : ""}
                  ${isSelected ? "bg-primary text-primary-foreground" : ""}
                  ${isToday && !isSelected ? "ring-1 ring-primary" : ""}
                  ${hasEntries && !isSelected ? "bg-emerald-50 dark:bg-emerald-500/10" : ""}
                  ${!hasEntries && !isSelected ? "hover:bg-muted" : ""}
                `}
              >
                <span className={`text-xs ${isToday ? "font-bold" : ""}`}>
                  {format(day, "d")}
                </span>
                {hasEntries && (
                  <div className="mt-0.5">
                    <span className={`text-[9px] tabular-nums ${isSelected ? "text-primary-foreground/80" : "text-emerald-600 dark:text-emerald-400"}`}>
                      {dayEntries.length}
                    </span>
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </Card>

      {/* Selected day details */}
      {selectedDay && selectedEntries.length > 0 && (
        <Card>
          <h3 className="text-sm font-semibold mb-3">
            {format(selectedDay, "EEEE, d MMMM yyyy")} — {selectedEntries.length} {t("calendar.entries")}
          </h3>
          <div className="space-y-1.5">
            {selectedEntries.map((e, i) => (
              <div key={i} className="flex items-center justify-between py-2 px-3 rounded-lg bg-muted/50">
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{e.backup_name as string}</p>
                  <p className="text-[10px] text-muted-foreground">{e.media_name as string}</p>
                </div>
                <span className="text-xs font-medium tabular-nums shrink-0 ml-4">
                  {(e.size_bytes as number) > 0 ? formatBytes(e.size_bytes as number) : "—"}
                </span>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
