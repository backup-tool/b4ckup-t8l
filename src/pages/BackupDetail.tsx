import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import {
  ArrowLeft,
  Plus,
  Trash2,
  Pencil,
  CheckCircle,
  HardDrive,
  Search,
  Loader2,
  Pause,
  Play,
} from "lucide-react";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Input, Textarea, Label } from "@/components/ui/Input";
import { CustomSelect } from "@/components/ui/CustomSelect";
import { ComboSelect } from "@/components/ui/ComboSelect";
import { DatePicker } from "@/components/ui/DatePicker";
import { ProgressRing } from "@/components/ui/ProgressRing";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import {
  getBackupById,
  getEntriesForBackup,
  getLocationsForBackup,
  createEntry,
  softDeleteEntry,
  markEntryVerified,
  updateEntry,
  updateEntrySize,
  updateBackup,
  softDeleteBackup,
  getAllMedia,
  getAllDevices,
  createDevice,
  addStorageLocation,
  updateStorageLocation,
  removeStorageLocation,
  getBackupsWithStatus,
  toggleBackupPaused,
} from "@/lib/db";
import { BACKUP_CATEGORIES, SIZE_UNITS, SIZE_MULTIPLIERS } from "@/lib/types";
import type { BackupStatus } from "@/lib/types";
import { formatBytes, formatDate, todayISO } from "@/lib/format";
import { useAppStore } from "@/lib/store";
import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";

interface ScanResult {
  name: string;
  size_bytes: number;
  modified_date: string;
}

export function BackupDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const triggerRefresh = useAppStore((s) => s.triggerRefresh);
  const [backup, setBackup] = useState<Record<string, any> | null>(null);
  const [status, setStatus] = useState<BackupStatus>("critical");
  const [entries, setEntries] = useState<Array<Record<string, any>>>([]);
  const [locations, setLocations] = useState<Array<Record<string, any>>>([]);
  const [media, setMedia] = useState<Array<Record<string, any>>>([]);
  const [devices, setDevices] = useState<Array<Record<string, any>>>([]);
  const [entryModalOpen, setEntryModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [locationModalOpen, setLocationModalOpen] = useState(false);
  const [editLocationId, setEditLocationId] = useState<number | null>(null);
  const [deleteLocationId, setDeleteLocationId] = useState<number | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleteEntryId, setDeleteEntryId] = useState<number | null>(null);
  const [scanModalOpen, setScanModalOpen] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [scanResults, setScanResults] = useState<ScanResult[]>([]);
  const [scanSelected, setScanSelected] = useState<Set<number>>(new Set());
  const [scanMediaId, setScanMediaId] = useState<number | null>(null);
  const [scanImporting, setScanImporting] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const [scanSizesLoading, setScanSizesLoading] = useState<Set<number>>(new Set());
  const [editEntryModalOpen, setEditEntryModalOpen] = useState(false);
  const [editEntryForm, setEditEntryForm] = useState({
    id: 0,
    size_bytes: "",
    size_unit: "GB",
    backup_date: "",
    notes: "",
    entry_number: "",
  });
  const [entryForm, setEntryForm] = useState({
    storage_media_id: "",
    size_bytes: "",
    size_unit: "GB",
    backup_date: todayISO(),
    notes: "",
  });
  const [editForm, setEditForm] = useState({
    name: "",
    device_name: "",
    category: "other",
    tags: "",
    notes: "",
    encryption_info: "",
    reminder_interval_days: "30",
  });
  const [locationForm, setLocationForm] = useState({
    storage_media_id: "",
    path_on_media: "",
    auto_detect: false,
    scan_mode: "subdirectories",
  });

  const load = useCallback(async () => {
    if (!id) return;
    const numId = parseInt(id);
    const [b, e, l, m, d] = await Promise.all([
      getBackupById(numId),
      getEntriesForBackup(numId),
      getLocationsForBackup(numId),
      getAllMedia(),
      getAllDevices(),
    ]);
    setBackup(b);
    setEntries(e);
    setLocations(l);
    setMedia(m);
    setDevices(d);

    // Compute status
    const allWithStatus = await getBackupsWithStatus();
    const found = allWithStatus.find((x) => (x as Record<string, any>).id === numId);
    if (found) setStatus(found.status as BackupStatus);
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  // Auto-calculate sizes for 0-byte entries (in background, with live progress)
  const sizeCalcRunning = useRef(false);
  const [sizeCalcProgress, setSizeCalcProgress] = useState<Record<string, {
    bytes: number; elapsed: number; phase: string;
  }>>({});

  useEffect(() => {
    if (entries.length === 0 || locations.length === 0 || !id) return;
    if (sizeCalcRunning.current) return;

    const zeroEntries = entries
      .filter((e) => (e.size_bytes as number) === 0 && (e.notes as string))
      .sort((a, b) => (a.backup_date as string).localeCompare(b.backup_date as string)); // Älteste zuerst
    if (zeroEntries.length === 0) return;

    sizeCalcRunning.current = true;

    // Mark all zero entries as "waiting" in progress
    const initialProgress: Record<string, any> = {};
    for (const e of zeroEntries) {
      initialProgress[`entry-${e.id}`] = { bytes: 0, elapsed: 0, phase: "waiting" };
    }
    setSizeCalcProgress(initialProgress);

    async function processEntry(entry: Record<string, any>) {
      const loc = locations.find(
        (l) => (l.storage_media_id as number) === (entry.storage_media_id as number)
      );
      const taskId = `entry-${entry.id}`;

      if (!loc?.path_on_media) {
        setSizeCalcProgress((prev) => ({ ...prev, [taskId]: { ...prev[taskId], phase: "done" } }));
        return;
      }

      const basePath = loc.path_on_media as string;
      const name = entry.notes as string;
      const fullPath = basePath.endsWith("/") ? basePath + name : basePath + "/" + name;

      setSizeCalcProgress((prev) => ({
        ...prev,
        [taskId]: { bytes: 0, elapsed: 0, phase: "calculating" },
      }));

      try {
        const size = await invoke<number>("get_dir_size_with_progress", {
          path: fullPath,
          taskId,
        });
        if (size > 0) {
          await updateEntrySize(entry.id as number, size);
        }
      } catch (err) {
        console.warn(`Size calc failed for ${name}:`, err);
      }
      setSizeCalcProgress((prev) => ({ ...prev, [taskId]: { ...prev[taskId], phase: "done" } }));
    }

    async function calcSizes() {
      // Set up event listener FIRST, then start processing
      let unlisten: (() => void) | null = null;
      try {
        const { listen } = await import("@tauri-apps/api/event");
        unlisten = await listen<any>("size-progress", (event) => {
          const d = event.payload;
          setSizeCalcProgress((prev) => ({
            ...prev,
            [d.taskId]: {
              bytes: d.bytes || 0,
              elapsed: d.elapsed || 0,
              phase: d.phase,
            },
          }));
        });
      } catch (err) {
        console.warn("Failed to set up progress listener:", err);
      }

      // Process 2 at a time (parallel but NAS-friendly), oldest first
      const CONCURRENCY = 2;
      const queue = [...zeroEntries];
      const running: Promise<void>[] = [];

      while (queue.length > 0 || running.length > 0) {
        while (running.length < CONCURRENCY && queue.length > 0) {
          const entry = queue.shift()!;
          const promise = processEntry(entry).then(() => {
            running.splice(running.indexOf(promise), 1);
          });
          running.push(promise);
        }
        if (running.length > 0) {
          await Promise.race(running);
        }
      }

      // Refresh all entries once at the end
      const freshEntries = await getEntriesForBackup(parseInt(id!));
      setEntries(freshEntries);
      setSizeCalcProgress({});
      if (unlisten) unlisten();
      sizeCalcRunning.current = false;
    }

    calcSizes();
  }, [id, entries.length, locations.length]);

  if (!backup) return null;


  function openEdit() {
    if (!backup) return;
    setEditForm({
      name: backup.name as string,
      device_name: backup.device_name as string,
      category: backup.category as string,
      tags: (backup.tags as string) || "",
      notes: (backup.notes as string) || "",
      encryption_info: (backup.encryption_info as string) || "",
      reminder_interval_days: String(backup.reminder_interval_days || 30),
    });
    setEditModalOpen(true);
  }

  async function handleEdit() {
    if (editForm.device_name.trim()) {
      await createDevice(editForm.device_name.trim());
    }
    await updateBackup(backup!.id as number, {
      name: editForm.name,
      device_name: editForm.device_name,
      category: editForm.category,
      tags: editForm.tags || null,
      notes: editForm.notes || null,
      encryption_info: editForm.encryption_info || null,
      reminder_interval_days: editForm.reminder_interval_days
        ? parseInt(editForm.reminder_interval_days)
        : 30,
    });
    setEditModalOpen(false);
    triggerRefresh();
    await load();
  }

  async function handleDelete() {
    await softDeleteBackup(backup!.id as number);
    triggerRefresh();
    navigate("/backups");
  }

  async function handleAddEntry() {
    const sizeBytes = Math.round(
      parseFloat(entryForm.size_bytes || "0") *
        (SIZE_MULTIPLIERS[entryForm.size_unit] || 1)
    );
    await createEntry({
      backup_id: backup!.id as number,
      storage_media_id: parseInt(entryForm.storage_media_id),
      size_bytes: sizeBytes,
      backup_date: entryForm.backup_date,
      notes: entryForm.notes || null,
    });
    setEntryModalOpen(false);
    setEntryForm({
      storage_media_id: "",
      size_bytes: "",
      size_unit: "GB",
      backup_date: todayISO(),
      notes: "",
    });
    triggerRefresh();
    await load();
  }

  async function handleDeleteEntry(entryId: number) {
    await softDeleteEntry(entryId);
    triggerRefresh();
    await load();
  }

  function openEditEntry(entry: Record<string, any>) {
    const bytes = entry.size_bytes as number;
    let displayVal: string;
    let displayUnit: string;
    if (bytes >= 1024 * 1024 * 1024) {
      displayVal = (bytes / (1024 * 1024 * 1024)).toFixed(2);
      displayUnit = "GB";
    } else if (bytes >= 1024 * 1024) {
      displayVal = (bytes / (1024 * 1024)).toFixed(1);
      displayUnit = "MB";
    } else if (bytes >= 1024) {
      displayVal = (bytes / 1024).toFixed(0);
      displayUnit = "KB";
    } else {
      displayVal = String(bytes);
      displayUnit = "Bytes";
    }
    setEditEntryForm({
      id: entry.id as number,
      size_bytes: displayVal,
      size_unit: displayUnit,
      backup_date: (entry.backup_date as string).split("T")[0],
      notes: (entry.notes as string) || "",
      entry_number: entry.entry_number ? String(entry.entry_number) : "",
    });
    setEditEntryModalOpen(true);
  }

  async function handleEditEntry() {
    const mult: Record<string, number> = {
      Bytes: 1, KB: 1024, MB: 1024**2, GB: 1024**3, TB: 1024**4, PB: 1024**5,
    };
    const sizeBytes = Math.round(
      parseFloat(editEntryForm.size_bytes || "0") * (mult[editEntryForm.size_unit] || 1)
    );
    await updateEntry(editEntryForm.id, {
      size_bytes: sizeBytes,
      backup_date: editEntryForm.backup_date,
      notes: editEntryForm.notes || null,
      entry_number: editEntryForm.entry_number ? parseInt(editEntryForm.entry_number) : null,
    });
    setEditEntryModalOpen(false);
    triggerRefresh();
    await load();
  }

  async function handleVerify(entryId: number) {
    await markEntryVerified(entryId);
    // Update entries directly to avoid race with size calc
    const numId = parseInt(id!);
    setEntries(await getEntriesForBackup(numId));
  }

  async function browseFolder(): Promise<string | null> {
    const selected = await open({ directory: true, multiple: false });
    if (typeof selected === "string") return selected;
    return null;
  }

  async function handleBrowseForLocation() {
    const path = await browseFolder();
    if (path) setLocationForm({ ...locationForm, path_on_media: path });
  }

  async function handleAddLocation() {
    await addStorageLocation({
      backup_id: backup!.id as number,
      storage_media_id: parseInt(locationForm.storage_media_id),
      path_on_media: locationForm.path_on_media || null,
      auto_detect: locationForm.auto_detect,
      scan_mode: locationForm.scan_mode,
    });
    setLocationModalOpen(false);
    setLocationForm({ storage_media_id: "", path_on_media: "", auto_detect: false, scan_mode: "subdirectories" });
    triggerRefresh();
    await load();
  }

  async function handleRemoveLocation(locId: number) {
    await removeStorageLocation(locId);
    triggerRefresh();
    await load();
  }

  function openEditLocation(loc: Record<string, any>) {
    setEditLocationId(loc.id as number);
    setLocationForm({
      storage_media_id: String(loc.storage_media_id),
      path_on_media: (loc.path_on_media as string) || "",
      auto_detect: Boolean(loc.auto_detect),
      scan_mode: (loc.scan_mode as string) || "subdirectories",
    });
  }

  async function handleEditLocation() {
    if (editLocationId == null) return;
    await updateStorageLocation(editLocationId, {
      path_on_media: locationForm.path_on_media || null,
      auto_detect: locationForm.auto_detect,
      scan_mode: locationForm.scan_mode,
    });
    setEditLocationId(null);
    setLocationForm({ storage_media_id: "", path_on_media: "", auto_detect: false, scan_mode: "subdirectories" });
    triggerRefresh();
    await load();
  }

  async function handleScan(loc: Record<string, any>) {
    let path = loc.path_on_media as string;
    const mode = (loc.scan_mode as string) || "subdirectories";
    if (!path) return;

    // If path looks like a network path, ask user to browse to grant permission
    const isNetworkPath = path.startsWith("smb://") || path.startsWith("SMB://") || path.startsWith("\\\\");
    if (isNetworkPath) {
      const selected = await browseFolder();
      if (!selected) return;
      path = selected;
    }

    setScanMediaId(loc.storage_media_id as number);
    setScanModalOpen(true);
    setScanning(true);
    setScanResults([]);
    setScanSelected(new Set());
    setScanError(null);
    setScanSizesLoading(new Set());
    try {
      const results = await invoke<ScanResult[]>("scan_directory", { path, mode });

      // Mark already existing entries by name + date match
      const existingEntries = entries.map((e) => ({
        name: (e.notes as string) || "",
        date: (e.backup_date as string).split("T")[0],
      }));

      const filtered = results.map((r, i) => {
        const exists = existingEntries.some(
          (e) => (e.name === r.name && e.date === r.modified_date) || (e.name === r.name)
        );
        return { ...r, _exists: exists, _index: i };
      });

      setScanResults(filtered as any);
      // Pre-select non-existing entries
      const sel = new Set<number>();
      filtered.forEach((r: any) => {
        if (!r._exists) sel.add(r._index);
      });
      setScanSelected(sel);
      setScanning(false);

      // Calculate all sizes in parallel (much faster)
      const scanPath = path;
      const allIndices = filtered.map((_: any, i: number) => i);
      setScanSizesLoading(new Set(allIndices));

      await Promise.all(
        filtered.map(async (r: any, i: number) => {
          const fullPath = scanPath.endsWith("/") ? scanPath + r.name : scanPath + "/" + r.name;
          try {
            const size = await invoke<number>("get_dir_size", { path: fullPath });
            setScanResults((prev) => {
              const next = [...prev];
              (next[i] as any).size_bytes = size;
              return next;
            });
          } catch { /* ignore individual failures */ }
          setScanSizesLoading((prev) => {
            const next = new Set(prev);
            next.delete(i);
            return next;
          });
        })
      );
    } catch (err: any) {
      setScanError(typeof err === "string" ? err : err?.message || String(err));
      setScanning(false);
    }
  }

  async function handleImportScan() {
    if (!backup || scanMediaId === null) return;
    setScanImporting(true);

    // Get fresh entries to check for duplicates
    const currentEntries = await getEntriesForBackup(backup.id as number);
    const existingNames = new Set(currentEntries.map((e) => e.notes as string).filter(Boolean));

    let imported = 0;
    for (const idx of scanSelected) {
      const r = scanResults[idx] as any;
      if (r._exists) continue;
      // Skip if an entry with this folder name already exists (prevent duplicates)
      if (existingNames.has(r.name)) continue;

      await createEntry({
        backup_id: backup.id as number,
        storage_media_id: scanMediaId,
        size_bytes: r.size_bytes,
        backup_date: r.modified_date,
        notes: r.name,
      });
      existingNames.add(r.name);
      imported++;
    }

    setScanImporting(false);
    setScanModalOpen(false);
    sizeCalcRunning.current = false;
    triggerRefresh();
    await load();
  }




  // Chart data
  // Chart data — only show entries with final sizes (no live progress)
  const chartData = [...entries]
    .reverse()
    .map((e) => ({
      date: formatDate(e.backup_date as string),
      size: Number(((e.size_bytes as number) / (1024 * 1024 * 1024)).toFixed(2)),
    }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate("/backups")}
          className="p-1 rounded hover:bg-muted transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold">{backup.name as string}</h1>
            <StatusBadge status={status} />
          </div>
          <p className="text-sm text-muted-foreground">
            {backup.device_name as string}
            {backup.category
              ? ` · ${t(`categories.${backup.category}`, { defaultValue: backup.category as string })}`
              : ""}
            {backup.tags ? ` · ${backup.tags}` : ""}
          </p>
        </div>
        <Button
          variant="secondary"
          size="sm"
          onClick={async () => {
            await toggleBackupPaused(backup.id as number, !backup.is_paused);
            triggerRefresh();
            load();
          }}
        >
          {backup.is_paused ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
          {backup.is_paused ? t("backups.resume") : t("backups.pause")}
        </Button>
        <Button variant="secondary" size="sm" onClick={openEdit}>
          <Pencil className="w-3.5 h-3.5" />
          {t("common.edit")}
        </Button>
        <Button variant="destructive" size="sm" onClick={() => setDeleteConfirmOpen(true)}>
          <Trash2 className="w-3.5 h-3.5" />
          {t("common.delete")}
        </Button>
      </div>

      {/* Info cards */}
      {(backup.notes || backup.encryption_info) && (
        <Card>
          <div className="grid grid-cols-2 gap-4 text-sm">
            {backup.notes && (
              <div>
                <p className="text-xs text-muted-foreground mb-1">{t("backups.notes")}</p>
                <p>{String(backup.notes)}</p>
              </div>
            )}
            {backup.encryption_info && (
              <div>
                <p className="text-xs text-muted-foreground mb-1">{t("backups.encryption")}</p>
                <p>{String(backup.encryption_info)}</p>
              </div>
            )}
          </div>
        </Card>
      )}

      <div className="grid grid-cols-2 gap-4">
        {/* Size history chart */}
        <Card>
          <CardHeader>
            <CardTitle>{t("backups.sizeHistory")}</CardTitle>
          </CardHeader>
          {chartData.length < 2 ? (
            <p className="text-sm text-muted-foreground">{t("backups.noEntries")}</p>
          ) : (
            <div className="h-52">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                  <defs>
                    <linearGradient id="detailGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#4ade80" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="#4ade80" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" vertical={false} opacity={0.5} />
                  <XAxis dataKey="date" tick={{ fontSize: 10, fill: "var(--muted-fg)" }} tickLine={false} axisLine={false} />
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
                    formatter={(value: any) => [`${value} GB`, ""]}
                  />
                  <Area
                    type="monotone"
                    dataKey="size"
                    stroke="#4ade80"
                    fill="url(#detailGradient)"
                    strokeWidth={2.5}
                    dot={{ r: 3, fill: "#4ade80", stroke: "#4ade80", strokeWidth: 0 }}
                    activeDot={{ r: 5, fill: "#4ade80", stroke: "var(--card)", strokeWidth: 2 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>

        {/* Size Comparison */}
        {entries.length >= 2 && (() => {
          const sorted = [...entries]
            .filter((e) => (e.size_bytes as number) > 0)
            .sort((a, b) => (a.backup_date as string).localeCompare(b.backup_date as string));
          if (sorted.length < 2) return null;
          return (
            <Card>
              <CardHeader>
                <CardTitle>{t("comparison.title")}</CardTitle>
              </CardHeader>
              <div className="space-y-1">
                {sorted.map((entry, i) => {
                  if (i === 0) return null;
                  const prev = sorted[i - 1];
                  const curSize = entry.size_bytes as number;
                  const prevSize = prev.size_bytes as number;
                  const delta = curSize - prevSize;
                  const pct = prevSize > 0 ? ((delta / prevSize) * 100).toFixed(1) : "—";
                  const isGrowth = delta > 0;
                  return (
                    <div key={entry.id as number} className="flex items-center justify-between py-2 px-3 rounded-lg bg-muted/50 text-xs">
                      <span className="text-muted-foreground">
                        {formatDate((prev.backup_date as string))} → {formatDate((entry.backup_date as string))}
                      </span>
                      <div className="flex items-center gap-3">
                        <span className="tabular-nums">{formatBytes(curSize)}</span>
                        <span className={`tabular-nums font-medium ${isGrowth ? "text-red-500" : "text-emerald-500"}`}>
                          {isGrowth ? "+" : ""}{formatBytes(Math.abs(delta))} ({isGrowth ? "+" : ""}{pct}%)
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          );
        })()}

        {/* Storage locations */}
        <Card>
          <CardHeader>
            <CardTitle>{t("backups.storageLocations")}</CardTitle>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => setLocationModalOpen(true)}
            >
              <Plus className="w-3.5 h-3.5" />
              {t("backups.addLocation")}
            </Button>
          </CardHeader>
          {locations.length === 0 ? (
            <p className="text-sm text-muted-foreground">—</p>
          ) : (
            <div className="space-y-2">
              {locations.map((loc) => (
                <div
                  key={loc.id as number}
                  className="py-2 px-3 rounded-lg bg-muted/50"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <HardDrive className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                      <p className="text-sm font-medium truncate">
                        {String(loc.media_name)}
                        {loc.auto_detect ? (
                          <span className="ml-2 text-[10px] text-emerald-600 font-normal">
                            {t("backups.autoDetect")}
                          </span>
                        ) : null}
                      </p>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      {loc.path_on_media && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleScan(loc)}
                          disabled={scanning}
                        >
                          {scanning ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Search className="w-3.5 h-3.5" />
                          )}
                          {t("scan.button")}
                        </Button>
                      )}
                      <button
                        onClick={() => openEditLocation(loc)}
                        className="p-1.5 rounded hover:bg-muted transition-colors"
                      >
                        <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
                      </button>
                      <button
                        onClick={() => setDeleteLocationId(loc.id as number)}
                        className="p-1.5 rounded hover:bg-muted transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5 text-muted-foreground" />
                      </button>
                    </div>
                  </div>
                  {loc.path_on_media && (
                    <p className="text-xs text-muted-foreground font-mono mt-1 ml-5.5 truncate">
                      {String(loc.path_on_media)}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Entries */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <CardTitle>{t("backups.entries")} ({entries.length})</CardTitle>
            {Object.keys(sizeCalcProgress).length > 0 && (() => {
              // Only count entries that belong to this backup
              const entryIds = new Set(entries.map((e) => `entry-${e.id}`));
              const relevant = Object.entries(sizeCalcProgress).filter(([k]) => entryIds.has(k));
              const activeCount = relevant.filter(([, p]) => p.phase === "calculating").length;
              const waitingCount = relevant.filter(([, p]) => p.phase === "waiting").length;
              const remaining = activeCount + waitingCount;
              if (remaining === 0) return null;
              return (
                <div className="flex items-center gap-1.5" title="Speicherplatz wird berechnet. App nicht schließen.">
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />
                  <span className="text-[10px] text-muted-foreground">{remaining} von {entries.filter((e) => (e.size_bytes as number) === 0).length}</span>
                </div>
              );
            })()}
          </div>
          <Button size="sm" onClick={() => setEntryModalOpen(true)}>
            <Plus className="w-3.5 h-3.5" />
            {t("backups.addEntry")}
          </Button>
        </CardHeader>
        {entries.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("backups.noEntries")}</p>
        ) : (
          <div className="space-y-1">
            {entries.map((entry, idx) => {
              const num = entry.entry_number || entries.length - idx;
              return (
              <div
                key={entry.id as number}
                className="flex items-center gap-3 py-3 px-4 rounded-lg border border-border hover:border-primary/20 transition-colors"
              >
                {/* Number badge */}
                <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center shrink-0">
                  <span className="text-xs font-bold text-muted-foreground">#{num}</span>
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold">
                      {formatDate(entry.backup_date as string)}
                    </p>
                    <span className="text-xs text-muted-foreground px-1.5 py-0.5 bg-muted rounded">
                      {entry.media_name as string}
                    </span>
                    {entry.verified_at && (
                      <span className="text-xs text-emerald-600 flex items-center gap-0.5">
                        <CheckCircle className="w-3 h-3" />
                      </span>
                    )}
                    {/* Size inline */}
                    {(() => {
                      const size = entry.size_bytes as number;
                      const prog = sizeCalcProgress[`entry-${entry.id}`];
                      const liveBytes = prog?.phase === "calculating" ? prog.bytes : 0;
                      const displayBytes = size > 0 ? size : liveBytes;
                      if (displayBytes > 0) {
                        return (
                          <span className={`text-xs tabular-nums ml-1 ${size > 0 ? "font-medium" : "text-muted-foreground"}`}>
                            {formatBytes(displayBytes)}
                          </span>
                        );
                      }
                      return null;
                    })()}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    {entry.notes && (
                      <span className="text-xs text-muted-foreground truncate">{entry.notes as string}</span>
                    )}
                    {(entry.size_bytes as number) === 0 && (() => {
                      const prog = sizeCalcProgress[`entry-${entry.id}`];
                      const tooltip = "Speicherplatz wird im Hintergrund berechnet.\nBitte die App nicht schließen.";
                      if (prog && prog.phase === "calculating") {
                        const elapsed = prog.elapsed;
                        const timeStr = elapsed < 60 ? `${elapsed}s` : `${Math.floor(elapsed / 60)}m ${elapsed % 60}s`;
                        return (
                          <span className="text-[10px] text-muted-foreground inline-flex items-center gap-1.5 cursor-default" title={tooltip}>
                            <Loader2 className="w-3 h-3 animate-spin text-primary shrink-0" />
                            <span className="tabular-nums">{timeStr}</span>
                          </span>
                        );
                      } else if (prog && prog.phase === "waiting") {
                        return (
                          <span className="text-[10px] text-muted-foreground flex items-center gap-1.5 cursor-default" title={tooltip}>
                            <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/30 animate-pulse" />
                            Warten...
                          </span>
                        );
                      }
                      return null;
                    })()}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 shrink-0">
                  {!entry.verified_at && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleVerify(entry.id as number)}
                    >
                      <CheckCircle className="w-3.5 h-3.5" />
                    </Button>
                  )}
                  <button
                    onClick={() => openEditEntry(entry)}
                    className="p-1.5 rounded hover:bg-muted transition-colors"
                  >
                    <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
                  </button>
                  <button
                    onClick={() => setDeleteEntryId(entry.id as number)}
                    className="p-1.5 rounded hover:bg-muted transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-muted-foreground" />
                  </button>
                </div>
              </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* Add Entry Modal */}
      <Modal
        open={entryModalOpen}
        onClose={() => setEntryModalOpen(false)}
        onSave={handleAddEntry}
        title={t("backups.addEntry")}
      >
        <div className="space-y-4">
          <div>
            <Label>{t("backups.selectMedia")}</Label>
            <CustomSelect
              value={entryForm.storage_media_id}
              onChange={(val) =>
                setEntryForm({ ...entryForm, storage_media_id: val })
              }
              placeholder="—"
              options={media.map((m) => ({
                value: String(m.id),
                label: m.name as string,
              }))}
            />
          </div>
          <div>
            <Label>{t("backups.size")}</Label>
            <div className="flex gap-2">
              <Input
                type="number"
                value={entryForm.size_bytes}
                onChange={(e) =>
                  setEntryForm({ ...entryForm, size_bytes: e.target.value })
                }
                placeholder="10.5"
                className="flex-1"
              />
              <CustomSelect
                className="w-24"
                value={entryForm.size_unit}
                onChange={(val) =>
                  setEntryForm({ ...entryForm, size_unit: val })
                }
                options={SIZE_UNITS.map((u) => ({ value: u.value, label: u.label }))}
              />
            </div>
          </div>
          <div>
            <Label>{t("backups.backupDate")}</Label>
            <DatePicker
              value={entryForm.backup_date}
              onChange={(val) =>
                setEntryForm({ ...entryForm, backup_date: val })
              }
            />
          </div>
          <div>
            <Label>{t("backups.notes")}</Label>
            <Textarea
              value={entryForm.notes}
              onChange={(e) =>
                setEntryForm({ ...entryForm, notes: e.target.value })
              }
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="secondary"
              onClick={() => setEntryModalOpen(false)}
            >
              {t("common.cancel")}
            </Button>
            <Button
              onClick={handleAddEntry}
              disabled={!entryForm.storage_media_id || !entryForm.size_bytes}
            >
              {t("common.save")}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Add Location Modal */}
      <Modal
        open={locationModalOpen}
        onClose={() => setLocationModalOpen(false)}
        onSave={handleAddLocation}
        title={t("backups.addLocation")}
      >
        <div className="space-y-4">
          <div>
            <Label>{t("backups.selectMedia")}</Label>
            <CustomSelect
              value={locationForm.storage_media_id}
              onChange={(val) =>
                setLocationForm({
                  ...locationForm,
                  storage_media_id: val,
                })
              }
              placeholder="—"
              options={media.map((m) => ({
                value: String(m.id),
                label: m.name as string,
              }))}
            />
          </div>
          <div>
            <Label>{t("backups.pathOnMedia")}</Label>
            <div className="flex gap-2">
              <Input
                value={locationForm.path_on_media}
                onChange={(e) =>
                  setLocationForm({
                    ...locationForm,
                    path_on_media: e.target.value,
                  })
                }
                placeholder="/Volumes/NAS/Backups/MacBook"
                className="flex-1"
              />
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={handleBrowseForLocation}
              >
                ...
              </Button>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="loc_auto_detect"
              checked={locationForm.auto_detect}
              onChange={(e) =>
                setLocationForm({ ...locationForm, auto_detect: e.target.checked })
              }
              className="rounded"
            />
            <label htmlFor="loc_auto_detect" className="text-sm">
              {t("backups.autoDetect")}
            </label>
          </div>
          <div>
            <Label>{t("scan.mode")}</Label>
            <CustomSelect
              value={locationForm.scan_mode}
              onChange={(val) => setLocationForm({ ...locationForm, scan_mode: val })}
              options={[
                { value: "subdirectories", label: t("scan.modeSubdirs") },
                { value: "flat", label: t("scan.modeFlat") },
              ]}
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="secondary"
              onClick={() => setLocationModalOpen(false)}
            >
              {t("common.cancel")}
            </Button>
            <Button
              onClick={handleAddLocation}
              disabled={!locationForm.storage_media_id}
            >
              {t("common.save")}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Edit Location Modal */}
      <Modal
        open={editLocationId !== null}
        onClose={() => { setEditLocationId(null); setLocationForm({ storage_media_id: "", path_on_media: "", auto_detect: false, scan_mode: "subdirectories" }); }}
        onSave={handleEditLocation}
        title={t("backups.editLocation")}
      >
        <div className="space-y-4">
          <div>
            <Label>{t("backups.pathOnMedia")}</Label>
            <div className="flex gap-2">
              <Input
                value={locationForm.path_on_media}
                onChange={(e) =>
                  setLocationForm({
                    ...locationForm,
                    path_on_media: e.target.value,
                  })
                }
                placeholder="/Volumes/NAS/Backups/MacBook"
                className="flex-1"
              />
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={handleBrowseForLocation}
              >
                ...
              </Button>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="edit_loc_auto_detect"
              checked={locationForm.auto_detect}
              onChange={(e) =>
                setLocationForm({ ...locationForm, auto_detect: e.target.checked })
              }
              className="rounded"
            />
            <label htmlFor="edit_loc_auto_detect" className="text-sm">
              {t("backups.autoDetect")}
            </label>
          </div>
          <div>
            <Label>{t("scan.mode")}</Label>
            <CustomSelect
              value={locationForm.scan_mode}
              onChange={(val) => setLocationForm({ ...locationForm, scan_mode: val })}
              options={[
                { value: "subdirectories", label: t("scan.modeSubdirs") },
                { value: "flat", label: t("scan.modeFlat") },
              ]}
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="secondary"
              onClick={() => { setEditLocationId(null); setLocationForm({ storage_media_id: "", path_on_media: "", auto_detect: false, scan_mode: "subdirectories" }); }}
            >
              {t("common.cancel")}
            </Button>
            <Button onClick={handleEditLocation}>
              {t("common.save")}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Edit Backup Modal */}
      <Modal
        open={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        onSave={handleEdit}
        title={t("backups.edit")}
      >
        <div className="space-y-4">
          <div>
            <Label>{t("backups.name")}</Label>
            <Input
              value={editForm.name}
              onChange={(e) =>
                setEditForm({ ...editForm, name: e.target.value })
              }
            />
          </div>
          <div>
            <Label>{t("backups.device")}</Label>
            <ComboSelect
              value={editForm.device_name}
              onChange={(val) => setEditForm({ ...editForm, device_name: val })}
              options={devices.map((d) => ({
                value: d.name as string,
                label: d.name as string,
              }))}
              placeholder="MacBook Pro, OneDrive..."
              createLabel={t("devices.create")}
            />
          </div>
          <div>
            <Label>{t("backups.category")}</Label>
            <CustomSelect
              value={editForm.category}
              onChange={(val) =>
                setEditForm({ ...editForm, category: val })
              }
              options={BACKUP_CATEGORIES.map((cat) => ({
                value: cat,
                label: t(`categories.${cat}`, { defaultValue: cat }),
              }))}
            />
          </div>
          <div>
            <Label>{t("backups.tags")}</Label>
            <Input
              value={editForm.tags}
              onChange={(e) =>
                setEditForm({ ...editForm, tags: e.target.value })
              }
            />
          </div>
          <div>
            <Label>{t("backups.encryption")}</Label>
            <Input
              value={editForm.encryption_info}
              onChange={(e) =>
                setEditForm({ ...editForm, encryption_info: e.target.value })
              }
            />
          </div>
          <div>
            <Label>{t("backups.reminderDays")}</Label>
            <Input
              type="number"
              value={editForm.reminder_interval_days}
              onChange={(e) =>
                setEditForm({
                  ...editForm,
                  reminder_interval_days: e.target.value,
                })
              }
            />
          </div>
          <div>
            <Label>{t("backups.notes")}</Label>
            <Textarea
              value={editForm.notes}
              onChange={(e) =>
                setEditForm({ ...editForm, notes: e.target.value })
              }
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="secondary"
              onClick={() => setEditModalOpen(false)}
            >
              {t("common.cancel")}
            </Button>
            <Button onClick={handleEdit} disabled={!editForm.name}>
              {t("common.save")}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Delete backup confirm */}
      <ConfirmDialog
        open={deleteConfirmOpen}
        onClose={() => setDeleteConfirmOpen(false)}
        onConfirm={handleDelete}
        title={t("trash.moveToTrash")}
        message={t("trash.confirmSoftDeleteBackup")}
        confirmLabel={t("trash.moveToTrash")}
        cancelLabel={t("common.cancel")}
      />

      {/* Delete entry confirm */}
      <ConfirmDialog
        open={deleteEntryId !== null}
        onClose={() => setDeleteEntryId(null)}
        onConfirm={() => {
          if (deleteEntryId) handleDeleteEntry(deleteEntryId);
        }}
        title={t("trash.moveToTrash")}
        message={t("backups.deleteConfirm")}
        confirmLabel={t("trash.moveToTrash")}
        cancelLabel={t("common.cancel")}
      />

      {/* Delete location confirm */}
      <ConfirmDialog
        open={deleteLocationId !== null}
        onClose={() => setDeleteLocationId(null)}
        onConfirm={() => {
          if (deleteLocationId) handleRemoveLocation(deleteLocationId);
          setDeleteLocationId(null);
        }}
        title={t("common.delete")}
        message={t("backups.deleteConfirm")}
        confirmLabel={t("common.delete")}
        cancelLabel={t("common.cancel")}
      />

      {/* Edit Entry Modal */}
      <Modal
        open={editEntryModalOpen}
        onClose={() => setEditEntryModalOpen(false)}
        onSave={handleEditEntry}
        title={t("backups.editEntry")}
      >
        <div className="space-y-4">
          <div>
            <Label>{t("backups.entryNumber")}</Label>
            <Input
              type="number"
              value={editEntryForm.entry_number}
              onChange={(e) =>
                setEditEntryForm({ ...editEntryForm, entry_number: e.target.value })
              }
              placeholder="#"
            />
          </div>
          <div>
            <Label>{t("backups.backupDate")}</Label>
            <DatePicker
              value={editEntryForm.backup_date}
              onChange={(val) =>
                setEditEntryForm({ ...editEntryForm, backup_date: val })
              }
            />
          </div>
          <div>
            <Label>{t("backups.size")}</Label>
            <div className="flex gap-2">
              <Input
                type="number"
                value={editEntryForm.size_bytes}
                onChange={(e) =>
                  setEditEntryForm({ ...editEntryForm, size_bytes: e.target.value })
                }
                className="flex-1"
              />
              <CustomSelect
                className="w-24"
                value={editEntryForm.size_unit}
                onChange={(val) =>
                  setEditEntryForm({ ...editEntryForm, size_unit: val })
                }
                options={SIZE_UNITS.map((u) => ({ value: u.value, label: u.label }))}
              />
            </div>
          </div>
          <div>
            <Label>{t("backups.notes")}</Label>
            <Textarea
              value={editEntryForm.notes}
              onChange={(e) =>
                setEditEntryForm({ ...editEntryForm, notes: e.target.value })
              }
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setEditEntryModalOpen(false)}>
              {t("common.cancel")}
            </Button>
            <Button onClick={handleEditEntry}>
              {t("common.save")}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Scan Results Modal */}
      <Modal
        open={scanModalOpen}
        onClose={() => setScanModalOpen(false)}
        title={t("scan.title")}
        className="max-w-2xl"
      >
        {scanning ? (
          <div className="flex items-center justify-center py-8 gap-2 text-muted-foreground">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span className="text-sm">{t("scan.scanning")}</span>
          </div>
        ) : scanError ? (
          <div className="py-4 space-y-2">
            <p className="text-sm text-red-600 font-medium">{t("scan.failed")}</p>
            <p className="text-xs text-muted-foreground bg-muted rounded-lg p-3 font-mono break-all">
              {scanError}
            </p>
          </div>
        ) : scanResults.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4">{t("scan.noResults")}</p>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <p className="text-xs text-muted-foreground">
                {scanResults.length} {t("scan.found")}
              </p>
              {scanSizesLoading.size > 0 && (() => {
                const total = scanResults.length;
                const done = total - scanSizesLoading.size;
                const pct = Math.round((done / total) * 100);
                return (
                  <div className="flex items-center gap-1.5 ml-auto">
                    <ProgressRing progress={pct} size={18} strokeWidth={2.5} className="text-primary" />
                    <span className="text-xs text-muted-foreground tabular-nums">
                      {pct}%
                    </span>
                  </div>
                );
              })()}
            </div>
            <div className="max-h-80 overflow-y-auto space-y-1">
              {scanResults.map((r: any, i: number) => {
                const exists = r._exists;
                const selected = scanSelected.has(i);
                return (
                  <label
                    key={i}
                    className={`flex items-center gap-3 py-2 px-3 rounded-lg cursor-pointer transition-colors ${
                      exists
                        ? "opacity-50 bg-muted/30"
                        : selected
                        ? "bg-primary/5 border border-primary/20"
                        : "hover:bg-muted"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selected && !exists}
                      disabled={exists}
                      onChange={() => {
                        const next = new Set(scanSelected);
                        if (next.has(i)) next.delete(i);
                        else next.add(i);
                        setScanSelected(next);
                      }}
                      className="rounded"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{r.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(r.modified_date)} &middot;{" "}
                        {r.size_bytes > 0 ? (
                          <span className="font-medium text-foreground">{formatBytes(r.size_bytes)}</span>
                        ) : scanSizesLoading.has(i) ? (
                          <span className="inline-flex items-center gap-1">
                            <Loader2 className="w-3 h-3 animate-spin" />
                          </span>
                        ) : (
                          <span className="italic">NAS...</span>
                        )}
                        {exists && (
                          <span className="ml-2 text-amber-600">
                            ({t("scan.alreadyExists")})
                          </span>
                        )}
                      </p>
                    </div>
                  </label>
                );
              })}
            </div>
            <div className="flex justify-between items-center pt-2 border-t border-border">
              <p className="text-xs text-muted-foreground">
                {scanSelected.size} / {scanResults.filter((r: any) => !r._exists).length}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setScanModalOpen(false)}
                >
                  {t("common.cancel")}
                </Button>
                <Button
                  size="sm"
                  onClick={handleImportScan}
                  disabled={scanSelected.size === 0 || scanImporting}
                >
                  {scanImporting ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Plus className="w-3.5 h-3.5" />
                  )}
                  {t("scan.import")}
                </Button>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
