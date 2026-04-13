import { useState, useRef, useEffect } from "react";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/cn";

interface DatePickerProps {
  value: string; // YYYY-MM-DD
  onChange: (value: string) => void;
  className?: string;
}

const WEEKDAYS_EN = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];
const WEEKDAYS_DE = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];
const MONTHS_EN = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const MONTHS_DE = [
  "Januar", "Februar", "M\u00e4rz", "April", "Mai", "Juni",
  "Juli", "August", "September", "Oktober", "November", "Dezember",
];

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfWeek(year: number, month: number) {
  const day = new Date(year, month, 1).getDay();
  return day === 0 ? 6 : day - 1; // Monday = 0
}

function pad(n: number) {
  return n < 10 ? `0${n}` : `${n}`;
}

function formatDisplayDate(dateStr: string, lang: string) {
  if (!dateStr) return "";
  const [y, m, d] = dateStr.split("-").map(Number);
  const months = lang.startsWith("de") ? MONTHS_DE : MONTHS_EN;
  return `${d}. ${months[m - 1]} ${y}`;
}

export function DatePicker({ value, onChange, className }: DatePickerProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const lang = typeof navigator !== "undefined" ? navigator.language : "en";
  const weekdays = lang.startsWith("de") ? WEEKDAYS_DE : WEEKDAYS_EN;
  const months = lang.startsWith("de") ? MONTHS_DE : MONTHS_EN;

  const today = new Date();
  const parsed = value ? new Date(value + "T00:00:00") : today;
  const [viewYear, setViewYear] = useState(parsed.getFullYear());
  const [viewMonth, setViewMonth] = useState(parsed.getMonth());

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  useEffect(() => {
    if (!open) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [open]);

  function prevMonth() {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear(viewYear - 1);
    } else {
      setViewMonth(viewMonth - 1);
    }
  }

  function nextMonth() {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear(viewYear + 1);
    } else {
      setViewMonth(viewMonth + 1);
    }
  }

  function selectDay(day: number) {
    const dateStr = `${viewYear}-${pad(viewMonth + 1)}-${pad(day)}`;
    onChange(dateStr);
    setOpen(false);
  }

  function goToToday() {
    const t = new Date();
    const dateStr = `${t.getFullYear()}-${pad(t.getMonth() + 1)}-${pad(t.getDate())}`;
    onChange(dateStr);
    setViewYear(t.getFullYear());
    setViewMonth(t.getMonth());
    setOpen(false);
  }

  const daysInMonth = getDaysInMonth(viewYear, viewMonth);
  const firstDay = getFirstDayOfWeek(viewYear, viewMonth);

  const selectedDay =
    value && parsed.getFullYear() === viewYear && parsed.getMonth() === viewMonth
      ? parsed.getDate()
      : -1;

  const todayDay =
    today.getFullYear() === viewYear && today.getMonth() === viewMonth
      ? today.getDate()
      : -1;

  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  return (
    <div ref={ref} className={cn("relative", className)}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={cn(
          "w-full flex items-center gap-2 rounded-lg border border-input bg-background px-3 py-2 text-sm transition-colors",
          "hover:border-ring/40 focus:outline-none focus:ring-2 focus:ring-ring/20 focus:border-ring",
          !value && "text-muted-foreground"
        )}
      >
        <CalendarDays className="w-4 h-4 text-muted-foreground shrink-0" />
        <span className="truncate">
          {value ? formatDisplayDate(value, lang) : "Select date..."}
        </span>
      </button>

      {open && (
        <div className="absolute z-50 mt-1 w-72 rounded-lg border border-border bg-card shadow-lg p-3 animate-in fade-in-0 zoom-in-95 duration-100">
          {/* Month/Year header */}
          <div className="flex items-center justify-between mb-3">
            <button
              type="button"
              onClick={prevMonth}
              className="p-1 rounded-md hover:bg-muted transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-sm font-semibold">
              {months[viewMonth]} {viewYear}
            </span>
            <button
              type="button"
              onClick={nextMonth}
              className="p-1 rounded-md hover:bg-muted transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Weekday headers */}
          <div className="grid grid-cols-7 mb-1">
            {weekdays.map((wd) => (
              <div
                key={wd}
                className="text-center text-[10px] font-medium text-muted-foreground py-1"
              >
                {wd}
              </div>
            ))}
          </div>

          {/* Days grid */}
          <div className="grid grid-cols-7">
            {cells.map((day, i) => (
              <div key={i} className="aspect-square flex items-center justify-center">
                {day !== null ? (
                  <button
                    type="button"
                    onClick={() => selectDay(day)}
                    className={cn(
                      "w-8 h-8 rounded-lg text-sm transition-colors",
                      "hover:bg-muted",
                      day === selectedDay &&
                        "bg-primary text-primary-foreground hover:bg-primary/90",
                      day === todayDay &&
                        day !== selectedDay &&
                        "border border-primary/30 font-semibold"
                    )}
                  >
                    {day}
                  </button>
                ) : null}
              </div>
            ))}
          </div>

          {/* Today button */}
          <div className="mt-2 pt-2 border-t border-border">
            <button
              type="button"
              onClick={goToToday}
              className="w-full text-center text-xs text-muted-foreground hover:text-foreground transition-colors py-1"
            >
              {lang.startsWith("de") ? "Heute" : "Today"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
