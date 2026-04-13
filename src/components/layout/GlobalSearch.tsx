import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Search, Database, HardDrive, Monitor, Clock } from "lucide-react";
import { getAllBackups, getAllMedia, getAllDevices, getAllEntries } from "@/lib/db";
import { formatBytes, formatDate } from "@/lib/format";
import { useAppStore } from "@/lib/store";

interface SearchResult {
  type: "backup" | "media" | "device" | "entry";
  id: number;
  title: string;
  subtitle: string;
  link: string;
}

export function GlobalSearch({ collapsed }: { collapsed: boolean }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [results, setResults] = useState<SearchResult[]>([]);
  const ref = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  // Keyboard shortcut: Cmd/Ctrl+K
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        inputRef.current?.focus();
        setOpen(true);
      }
      if (e.key === "Escape") {
        setOpen(false);
        inputRef.current?.blur();
      }
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, []);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }

    const q = query.toLowerCase();
    let cancelled = false;

    async function search() {
      const [backups, media, devices, entries] = await Promise.all([
        getAllBackups(),
        getAllMedia(),
        getAllDevices(),
        getAllEntries(100),
      ]);

      if (cancelled) return;

      const r: SearchResult[] = [];

      for (const b of backups) {
        const name = (b.name as string) || "";
        const device = (b.device_name as string) || "";
        const tags = (b.tags as string) || "";
        if (name.toLowerCase().includes(q) || device.toLowerCase().includes(q) || tags.toLowerCase().includes(q)) {
          r.push({
            type: "backup",
            id: b.id as number,
            title: name,
            subtitle: device,
            link: `/backups/${b.id}`,
          });
        }
      }

      for (const m of media) {
        const name = (m.name as string) || "";
        if (name.toLowerCase().includes(q)) {
          r.push({
            type: "media",
            id: m.id as number,
            title: name,
            subtitle: (m.type as string) || "",
            link: "/media",
          });
        }
      }

      for (const d of devices) {
        const name = (d.name as string) || "";
        const model = (d.model as string) || "";
        if (name.toLowerCase().includes(q) || model.toLowerCase().includes(q)) {
          r.push({
            type: "device",
            id: d.id as number,
            title: name,
            subtitle: model,
            link: "/devices",
          });
        }
      }

      for (const e of entries) {
        const name = (e.backup_name as string) || "";
        const notes = (e.notes as string) || "";
        if (notes.toLowerCase().includes(q) || name.toLowerCase().includes(q)) {
          r.push({
            type: "entry",
            id: e.id as number,
            title: name,
            subtitle: `${formatDate(e.backup_date as string)} · ${formatBytes(e.size_bytes as number)}`,
            link: `/backups/${e.backup_id}`,
          });
        }
      }

      setResults(r.slice(0, 10));
    }

    const timer = setTimeout(search, 150);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [query]);

  function handleSelect(result: SearchResult) {
    navigate(result.link);
    setOpen(false);
    setQuery("");
  }

  const icons = {
    backup: Database,
    media: HardDrive,
    device: Monitor,
    entry: Clock,
  };

  const toggleSidebar = useAppStore((s) => s.toggleSidebar);

  if (collapsed) {
    return (
      <button
        onClick={() => {
          toggleSidebar();
          setTimeout(() => inputRef.current?.focus(), 200);
        }}
        className="flex justify-center w-full py-2"
        title={`${t("backups.search")} (⌘K)`}
      >
        <Search className="w-4 h-4 text-muted-foreground" />
      </button>
    );
  }

  return (
    <div ref={ref} className="relative mx-2 mb-2">
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => query && setOpen(true)}
          placeholder={`${t("backups.search").replace("...", "")} (⌘K)`}
          className="w-full bg-muted/50 border-none rounded-lg pl-8 pr-3 py-1.5 text-xs placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring/30"
        />
      </div>

      {open && results.length > 0 && (
        <div className="absolute left-0 right-0 mt-1 bg-card border border-border rounded-lg shadow-lg z-50 py-1 max-h-72 overflow-y-auto">
          {results.map((r, i) => {
            const Icon = icons[r.type];
            return (
              <button
                key={`${r.type}-${r.id}-${i}`}
                onClick={() => handleSelect(r)}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-left hover:bg-muted transition-colors"
              >
                <Icon className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium truncate">{r.title}</p>
                  <p className="text-[10px] text-muted-foreground truncate">{r.subtitle}</p>
                </div>
                <span className="text-[9px] text-muted-foreground uppercase shrink-0">
                  {r.type}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
