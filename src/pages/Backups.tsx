import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { Plus, Search, Database, Trash2, Monitor, Pause, Play } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Input, Textarea, Label } from "@/components/ui/Input";
import { CustomSelect } from "@/components/ui/CustomSelect";
import { ComboSelect } from "@/components/ui/ComboSelect";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { TrashSection } from "@/components/ui/TrashSection";
import {
  getBackupsWithStatus,
  getDeletedBackups,
  createBackup,
  softDeleteBackup,
  restoreBackup,
  permanentDeleteBackup,
  toggleBackupPaused,
  getAllDevices,
  createDevice,
} from "@/lib/db";
import { BACKUP_CATEGORIES, CATEGORY_LABELS } from "@/lib/types";
import type { BackupStatus } from "@/lib/types";
import { formatBytes, formatDate, daysAgo } from "@/lib/format";
import { useAppStore } from "@/lib/store";

export function Backups() {
  const { t, i18n } = useTranslation();
  const refreshKey = useAppStore((s) => s.refreshKey);
  const triggerRefresh = useAppStore((s) => s.triggerRefresh);
  const [backups, setBackups] = useState<Array<Record<string, any>>>([]);
  const [loading, setLoading] = useState(true);
  const [deleted, setDeleted] = useState<Array<Record<string, any>>>([]);
  const [devices, setDevices] = useState<Array<Record<string, any>>>([]);
  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [modalOpen, setModalOpen] = useState(false);
  const [sortField, setSortField] = useState("name");
  const [sortDir, setSortDir] = useState("asc");
  const [softDeleteId, setSoftDeleteId] = useState<number | null>(null);

  const [form, setForm] = useState({
    name: "",
    device_name: "",
    category: "other" as string,
    tags: "",
    notes: "",
    encryption_info: "",
    reminder_interval_days: "30",
  });

  useEffect(() => {
    loadAll();
  }, [refreshKey]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "n") {
        e.preventDefault();
        setModalOpen(true);
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  async function loadAll() {
    try {
      const [b, d, del] = await Promise.all([getBackupsWithStatus(), getAllDevices(), getDeletedBackups()]);
      setBackups(b);
      setDevices(d);
      setDeleted(del);
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  }

  async function handleCreate() {
    // Auto-create device if it doesn't exist
    if (form.device_name.trim()) {
      await createDevice(form.device_name.trim());
    }
    await createBackup({
      name: form.name,
      device_name: form.device_name,
      category: form.category,
      tags: form.tags || null,
      notes: form.notes || null,
      encryption_info: form.encryption_info || null,
      reminder_interval_days: form.reminder_interval_days
        ? parseInt(form.reminder_interval_days)
        : 30,
    });
    setModalOpen(false);
    setForm({
      name: "",
      device_name: "",
      category: "other",
      tags: "",
      notes: "",
      encryption_info: "",
      reminder_interval_days: "30",
    });
    triggerRefresh();
    await loadAll();
  }

  async function handleSoftDelete(id: number) {
    await softDeleteBackup(id);
    triggerRefresh();
    await loadAll();
  }

  const lang = i18n.language as "en" | "de" | "ru";

  const filtered = backups.filter((b) => {
    const matchesSearch =
      !search ||
      (b.name as string).toLowerCase().includes(search.toLowerCase()) ||
      (b.device_name as string).toLowerCase().includes(search.toLowerCase());
    const matchesCategory =
      filterCategory === "all" || b.category === filterCategory;
    const matchesStatus = filterStatus === "all" || b.status === filterStatus;
    return matchesSearch && matchesCategory && matchesStatus;
  });

  // Sort
  const sorted = [...filtered].sort((a, b) => {
    const key = sortField;
    const mult = sortDir === "desc" ? -1 : 1;
    if (key === "name") return mult * (a.name as string).localeCompare(b.name as string);
    if (key === "device") return mult * ((a.device_name as string) || "").localeCompare((b.device_name as string) || "");
    if (key === "date") {
      const aDate = a.latest_entry ? (a.latest_entry as any).backup_date : "";
      const bDate = b.latest_entry ? (b.latest_entry as any).backup_date : "";
      return mult * aDate.localeCompare(bDate);
    }
    if (key === "size") {
      const aSize = a.latest_entry ? ((a.latest_entry as any).size_bytes || 0) : 0;
      const bSize = b.latest_entry ? ((b.latest_entry as any).size_bytes || 0) : 0;
      return mult * (aSize - bSize);
    }
    if (key === "status") {
      const order = { ok: 0, warning: 1, critical: 2 };
      return mult * ((order[a.status as keyof typeof order] || 0) - (order[b.status as keyof typeof order] || 0));
    }
    return 0;
  });

  if (loading) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">{t("backups.title")}</h1>
        <div className="flex items-center gap-2">
          <TrashSection
            items={deleted.map((b) => ({
              id: b.id as number,
              title: b.name as string,
              subtitle: b.device_name as string,
              deleted_at: b.deleted_at as string,
            }))}
            onRestore={async (id) => { await restoreBackup(id); triggerRefresh(); await loadAll(); }}
            onPermanentDelete={async (id) => { await permanentDeleteBackup(id); triggerRefresh(); await loadAll(); }}
            onRestoreAll={async () => { for (const b of deleted) await restoreBackup(b.id as number); triggerRefresh(); await loadAll(); }}
            onDeleteAll={async () => { for (const b of deleted) await permanentDeleteBackup(b.id as number); triggerRefresh(); await loadAll(); }}
            permanentDeleteMessage={t("trash.confirmPermanentBackup")}
          />
          <Button onClick={() => setModalOpen(true)}>
            <Plus className="w-4 h-4" />
            {t("backups.create")}
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder={t("backups.search")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <CustomSelect
          className="w-40"
          value={filterCategory}
          onChange={setFilterCategory}
          options={[
            { value: "all", label: t("backups.filterAll") },
            ...BACKUP_CATEGORIES.map((cat) => ({
              value: cat,
              label: CATEGORY_LABELS[cat]?.[lang] || cat,
            })),
          ]}
        />
        <CustomSelect
          className="w-36"
          value={filterStatus}
          onChange={setFilterStatus}
          options={[
            { value: "all", label: t("backups.filterAll") },
            { value: "ok", label: t("status.ok") },
            { value: "warning", label: t("status.warning") },
            { value: "critical", label: t("status.critical") },
            { value: "paused", label: t("status.paused") },
          ]}
        />
        <CustomSelect
          className="w-40"
          value={sortField}
          onChange={setSortField}
          options={[
            { value: "name", label: t("backups.name") },
            { value: "device", label: t("backups.device") },
            { value: "date", label: t("backups.lastBackup") },
            { value: "size", label: t("backups.size") },
            { value: "status", label: t("backups.status") },
          ]}
        />
        <CustomSelect
          className="w-28"
          value={sortDir}
          onChange={setSortDir}
          options={[
            { value: "asc", label: "↑" },
            { value: "desc", label: "↓" },
          ]}
        />
      </div>

      {sorted.length === 0 ? (
        <Card className="text-center py-12">
          <Database className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
          <p className="text-muted-foreground">{t("dashboard.noBackups")}</p>
        </Card>
      ) : (
        <div className="space-y-6">
          {(() => {
            // Group by device
            const groups = new Map<string, typeof filtered>();
            for (const b of sorted) {
              const device = (b.device_name as string) || t("backups.filterAll");
              if (!groups.has(device)) groups.set(device, []);
              groups.get(device)!.push(b);
            }
            return Array.from(groups.entries()).map(([device, items]) => (
              <div key={device}>
                <div className="flex items-center gap-2 mb-2">
                  <Monitor className="w-4 h-4 text-muted-foreground" />
                  <h2 className="text-sm font-semibold text-muted-foreground">{device}</h2>
                  <span className="text-xs text-muted-foreground">({items.length})</span>
                </div>
                <div className="space-y-1.5 ml-6">
                  {items.map((b) => {
                    const latest = b.latest_entry as Record<string, any> | null;
                    return (
                      <div key={b.id as number} className="flex items-center gap-2">
                        <Link to={`/backups/${b.id}`} className="block flex-1">
                          <Card className="hover:border-primary/30 transition-colors cursor-pointer py-3">
                            <div className="flex items-center justify-between">
                              <div>
                                <h3 className="font-semibold text-sm">
                                  {b.name as string}
                                </h3>
                                <p className="text-xs text-muted-foreground">
                                  {CATEGORY_LABELS[b.category as string]?.[lang] || (b.category as string)}
                                  {b.tags ? ` · ${b.tags}` : ""}
                                </p>
                              </div>
                              <div className="flex items-center gap-6">
                                <div className="text-right">
                                  <p className="text-sm">
                                    {latest
                                      ? formatBytes(latest.size_bytes as number)
                                      : "—"}
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    {latest
                                      ? `${formatDate(latest.backup_date as string)} (${daysAgo(latest.backup_date as string)} ${t("common.days")})`
                                      : t("backups.never")}
                                  </p>
                                </div>
                                <StatusBadge status={b.status as BackupStatus} />
                              </div>
                            </div>
                          </Card>
                        </Link>
                        <button
                          onClick={async () => {
                            await toggleBackupPaused(b.id as number, !b.is_paused);
                            triggerRefresh();
                            await loadAll();
                          }}
                          className="p-2 rounded-lg hover:bg-muted transition-colors shrink-0"
                          title={b.is_paused ? t("backups.resume") : t("backups.pause")}
                        >
                          {b.is_paused ? (
                            <Play className="w-4 h-4 text-muted-foreground" />
                          ) : (
                            <Pause className="w-4 h-4 text-muted-foreground" />
                          )}
                        </button>
                        <button
                          onClick={() => setSoftDeleteId(b.id as number)}
                          className="p-2 rounded-lg hover:bg-muted transition-colors shrink-0"
                        >
                          <Trash2 className="w-4 h-4 text-muted-foreground" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            ));
          })()}
        </div>
      )}

      {/* Create Modal */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSave={handleCreate}
        title={t("backups.create")}
      >
        <div className="space-y-4">
          <div>
            <Label>{t("backups.name")}</Label>
            <Input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="MacBook Photos Backup"
            />
          </div>
          <div>
            <Label>{t("backups.device")}</Label>
            <ComboSelect
              value={form.device_name}
              onChange={(val) => setForm({ ...form, device_name: val })}
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
              value={form.category}
              onChange={(val) => setForm({ ...form, category: val })}
              options={BACKUP_CATEGORIES.map((cat) => ({
                value: cat,
                label: CATEGORY_LABELS[cat]?.[lang] || cat,
              }))}
            />
          </div>
          <div>
            <Label>{t("backups.tags")}</Label>
            <Input
              value={form.tags}
              onChange={(e) => setForm({ ...form, tags: e.target.value })}
              placeholder="important, monthly"
            />
          </div>
          <div>
            <Label>{t("backups.encryption")}</Label>
            <Input
              value={form.encryption_info}
              onChange={(e) =>
                setForm({ ...form, encryption_info: e.target.value })
              }
              placeholder="VeraCrypt, Password in KeePass"
            />
          </div>
          <div>
            <Label>{t("backups.reminderDays")}</Label>
            <Input
              type="number"
              value={form.reminder_interval_days}
              onChange={(e) =>
                setForm({ ...form, reminder_interval_days: e.target.value })
              }
            />
          </div>
          <div>
            <Label>{t("backups.notes")}</Label>
            <Textarea
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setModalOpen(false)}>
              {t("backups.cancel")}
            </Button>
            <Button onClick={handleCreate} disabled={!form.name}>
              {t("backups.save")}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Soft delete confirm */}
      <ConfirmDialog
        open={softDeleteId !== null}
        onClose={() => setSoftDeleteId(null)}
        onConfirm={() => softDeleteId && handleSoftDelete(softDeleteId)}
        title={t("trash.moveToTrash")}
        message={t("trash.confirmSoftDeleteBackup")}
        confirmLabel={t("trash.moveToTrash")}
        cancelLabel={t("common.cancel")}
      />

    </div>
  );
}
