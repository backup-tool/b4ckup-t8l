import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { Plus, Search, Database, Trash2, Monitor, Pause, Play, GripVertical } from "lucide-react";
import { ViewToggle } from "@/components/ui/ViewToggle";
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
  FolderToolbar,
  FolderBreadcrumb,
  FolderGrid,
  FolderSection,
  FolderModal,
  FolderDeleteConfirm,
  MoveToFolderMenu,
  DragGhost,
} from "@/components/ui/FolderView";
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
import { BACKUP_CATEGORIES } from "@/lib/types";
import type { BackupStatus } from "@/lib/types";
import { formatBytes, formatDate, daysAgo } from "@/lib/format";
import { useAppStore } from "@/lib/store";
import { useFolders } from "@/lib/useFolders";
import { useDragDrop } from "@/lib/useDragDrop";
import type { FolderData } from "@/lib/useFolders";

export function Backups() {
  const { t } = useTranslation();
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
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [bulkConfirmOpen, setBulkConfirmOpen] = useState(false);
  const [view, setView] = useState<"grid" | "list">("list");
  const [editMode, setEditMode] = useState(false);

  // Folder support
  const folderHook = useFolders("backup", refreshKey);
  const [folderModalOpen, setFolderModalOpen] = useState(false);
  const [renamingFolder, setRenamingFolder] = useState<FolderData | null>(null);
  const [deletingFolder, setDeletingFolder] = useState<FolderData | null>(null);
  // Track collapsed state locally for unfiled section in expanded mode
  const [unfiledCollapsed, setUnfiledCollapsed] = useState(false);

  // Drag & drop for folder moves
  const { makeDraggable, registerDropTarget, isDragOver, dragging, ghostPos, dragLabel } = useDragDrop(
    async (itemIds, folderId) => {
      await folderHook.moveItems(itemIds, folderId);
      setSelectedIds(new Set());
      triggerRefresh();
      await loadAll();
    }
  );

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
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-bold">{t("backups.title")}</h1>
          <ViewToggle view={view} onViewChange={setView} editMode={editMode} onEditModeChange={(v) => { setEditMode(v); if (!v) setSelectedIds(new Set()); }} />
          <FolderToolbar
            viewMode={folderHook.viewMode}
            onViewModeChange={folderHook.setViewMode}
            onCreateFolder={() => setFolderModalOpen(true)}
          />
        </div>
        <div className="flex items-center gap-2">
          {editMode && <TrashSection
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
          />}
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
              label: t(`categories.${cat}`, { defaultValue: cat }),
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

      {/* Bulk actions toolbar */}
      {editMode && selectedIds.size > 0 && (
        <div className="flex items-center gap-3 px-4 py-2.5 rounded-xl bg-primary/5 border border-primary/20">
          <span className="text-sm font-medium">{selectedIds.size} {t("bulk.selected")}</span>
          <div className="flex gap-2 ml-auto">
            {folderHook.viewMode !== "flat" && (
              <MoveToFolderMenu
                folders={folderHook.folders}
                onMove={async (folderId) => {
                  await folderHook.moveItems(Array.from(selectedIds), folderId);
                  setSelectedIds(new Set());
                  triggerRefresh();
                  await loadAll();
                }}
              />
            )}
            <Button size="sm" variant="secondary" onClick={async () => {
              for (const id of selectedIds) await toggleBackupPaused(id, true);
              setSelectedIds(new Set());
              triggerRefresh(); await loadAll();
            }}>
              {t("backups.pause")}
            </Button>
            <Button size="sm" variant="secondary" onClick={async () => {
              for (const id of selectedIds) await toggleBackupPaused(id, false);
              setSelectedIds(new Set());
              triggerRefresh(); await loadAll();
            }}>
              {t("backups.resume")}
            </Button>
            <Button size="sm" variant="destructive" onClick={() => setBulkConfirmOpen(true)}>
              {t("common.delete")}
            </Button>
          </div>
        </div>
      )}

      {/* Folder breadcrumb for folder mode */}
      {folderHook.viewMode === "folder" && folderHook.currentFolder && (
        <FolderBreadcrumb
          currentFolder={folderHook.currentFolder}
          onNavigateBack={() => folderHook.navigateToFolder(null)}
          dropRef={(el: HTMLElement | null) => registerDropTarget(null, el)}
          isDropOver={isDragOver(null)}
        />
      )}

      {sorted.length === 0 && folderHook.viewMode === "flat" ? (
        <Card className="text-center py-12">
          <Database className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
          <p className="text-muted-foreground">{t("dashboard.noBackups")}</p>
        </Card>
      ) : folderHook.viewMode === "expanded" ? (
        /* Expanded mode: all items grouped by folders */
        <BackupsExpandedView
          sorted={sorted}
          folderHook={folderHook}
          view={view}
          editMode={editMode}
          selectedIds={selectedIds}
          setSelectedIds={setSelectedIds}
          setSoftDeleteId={setSoftDeleteId}
          setRenamingFolder={setRenamingFolder}
          setDeletingFolder={setDeletingFolder}
          unfiledCollapsed={unfiledCollapsed}
          setUnfiledCollapsed={setUnfiledCollapsed}
          t={t}
          triggerRefresh={triggerRefresh}
          loadAll={loadAll}
          makeDraggable={makeDraggable}
          registerDropTarget={registerDropTarget}
          isDragOver={isDragOver}
        />
      ) : folderHook.viewMode === "folder" && folderHook.currentFolderId === null ? (
        /* Folder mode root: show folder cards + unfiled items */
        <div>
          <FolderGrid
            folders={folderHook.folders}
            itemCounts={(() => {
              const counts = new Map<number, number>();
              for (const f of folderHook.folders) {
                counts.set(f.id, sorted.filter((b) => (b.folder_id as number | null) === f.id).length);
              }
              return counts;
            })()}
            onOpen={(folderId) => folderHook.navigateToFolder(folderId)}
            onRename={(folder) => setRenamingFolder(folder)}
            onDelete={(folder) => setDeletingFolder(folder)}
            editMode={editMode}
            registerDropTarget={registerDropTarget}
            isDragOver={isDragOver}
          />
          {/* Show unfiled items below folders */}
          <BackupsItemList
            items={sorted.filter((b) => !(b.folder_id as number | null))}
            view={view}
            editMode={editMode}
            selectedIds={selectedIds}
            setSelectedIds={setSelectedIds}
            setSoftDeleteId={setSoftDeleteId}
            t={t}
            triggerRefresh={triggerRefresh}
            loadAll={loadAll}
            makeDraggable={makeDraggable}
          />
        </div>
      ) : (
        /* Flat mode or inside a folder */
        <BackupsItemList
          items={folderHook.viewMode === "folder"
            ? sorted.filter((b) => (b.folder_id as number | null) === folderHook.currentFolderId)
            : sorted
          }
          view={view}
          editMode={editMode}
          selectedIds={selectedIds}
          setSelectedIds={setSelectedIds}
          setSoftDeleteId={setSoftDeleteId}
          t={t}
          triggerRefresh={triggerRefresh}
          loadAll={loadAll}
          makeDraggable={folderHook.viewMode !== "flat" ? makeDraggable : undefined}
        />
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
                label: t(`categories.${cat}`, { defaultValue: cat }),
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

      <ConfirmDialog
        open={bulkConfirmOpen}
        onClose={() => setBulkConfirmOpen(false)}
        onConfirm={async () => {
          for (const id of selectedIds) await softDeleteBackup(id);
          setSelectedIds(new Set());
          setBulkConfirmOpen(false);
          triggerRefresh(); await loadAll();
        }}
        title={t("trash.moveToTrash")}
        message={`${selectedIds.size} ${t("bulk.deleteConfirm")}`}
        confirmLabel={t("trash.moveToTrash")}
        cancelLabel={t("common.cancel")}
        variant="danger"
      />

      {/* Folder create/rename modal */}
      <FolderModal
        open={folderModalOpen}
        onClose={() => setFolderModalOpen(false)}
        onSave={async (name) => {
          await folderHook.createFolder(name);
          triggerRefresh();
        }}
      />
      <FolderModal
        open={renamingFolder !== null}
        onClose={() => setRenamingFolder(null)}
        onSave={async (name) => {
          if (renamingFolder) {
            await folderHook.renameFolder(renamingFolder.id, name);
            triggerRefresh();
          }
        }}
        initialName={renamingFolder?.name}
        isRename
      />
      <FolderDeleteConfirm
        open={deletingFolder !== null}
        folderName={deletingFolder?.name || ""}
        onClose={() => setDeletingFolder(null)}
        onConfirm={async () => {
          if (deletingFolder) {
            await folderHook.deleteFolder(deletingFolder.id);
            setDeletingFolder(null);
            triggerRefresh();
            await loadAll();
          }
        }}
      />
      <DragGhost visible={dragging} pos={ghostPos} label={dragLabel} />
    </div>
  );
}

// --- Sub-components for backup items ---

function BackupsItemList({
  items,
  view,
  editMode,
  selectedIds,
  setSelectedIds,
  setSoftDeleteId,
  t,
  triggerRefresh,
  loadAll,
  makeDraggable,
}: {
  items: Array<Record<string, any>>;
  view: "grid" | "list";
  editMode: boolean;
  selectedIds: Set<number>;
  setSelectedIds: (s: Set<number>) => void;
  setSoftDeleteId: (id: number | null) => void;
  t: (key: string, opts?: any) => string;
  triggerRefresh: () => void;
  loadAll: () => Promise<void>;
  makeDraggable?: (itemId: number, selectedIds: Set<number>) => Record<string, any>;
}) {
  if (items.length === 0) {
    return (
      <Card className="text-center py-12">
        <Database className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
        <p className="text-muted-foreground">{t("dashboard.noBackups")}</p>
      </Card>
    );
  }

  if (view === "grid") {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {items.map((b) => {
          const latest = b.latest_entry as Record<string, any> | null;
          return (
            <div
              key={b.id as number}
              className="relative"
              {...(makeDraggable ? makeDraggable(b.id as number, selectedIds) : {})}
            >
              {makeDraggable && (
                <GripVertical className="absolute top-3 right-3 w-4 h-4 text-muted-foreground/40 z-10 cursor-grab" />
              )}
              {editMode && (
                <input
                  type="checkbox"
                  checked={selectedIds.has(b.id as number)}
                  onChange={(e) => {
                    const next = new Set(selectedIds);
                    if (e.target.checked) next.add(b.id as number);
                    else next.delete(b.id as number);
                    setSelectedIds(next);
                  }}
                  className="absolute top-3 left-3 rounded z-10"
                />
              )}
              <Link to={`/backups/${b.id}`} draggable={false}>
                <Card className="hover:border-primary/30 transition-colors cursor-pointer h-full">
                  <div className="flex items-start justify-between mb-2">
                    <div className="min-w-0">
                      <h3 className="font-semibold text-sm truncate">{b.name as string}</h3>
                      <p className="text-xs text-muted-foreground truncate">
                        {b.device_name as string} · {t(`categories.${b.category}`, { defaultValue: b.category as string })}
                      </p>
                    </div>
                    <StatusBadge status={b.status as BackupStatus} />
                  </div>
                  <div className="flex items-center justify-between mt-3 pt-3 border-t border-border">
                    <span className="text-xs text-muted-foreground">
                      {latest ? `${formatDate(latest.backup_date as string)}` : t("backups.never")}
                    </span>
                    <span className="text-sm font-medium tabular-nums">
                      {latest ? formatBytes(latest.size_bytes as number) : "\u2014"}
                    </span>
                  </div>
                </Card>
              </Link>
            </div>
          );
        })}
      </div>
    );
  }

  // List view: group by device
  const groups = new Map<string, typeof items>();
  for (const b of items) {
    const device = (b.device_name as string) || t("backups.filterAll");
    if (!groups.has(device)) groups.set(device, []);
    groups.get(device)!.push(b);
  }

  return (
    <div className="space-y-6">
      {Array.from(groups.entries()).map(([device, deviceItems]) => (
        <div key={device}>
          <div className="flex items-center gap-2 mb-2">
            <Monitor className="w-4 h-4 text-muted-foreground" />
            <h2 className="text-sm font-semibold text-muted-foreground">{device}</h2>
            <span className="text-xs text-muted-foreground">({deviceItems.length})</span>
          </div>
          <div className="space-y-1.5 ml-6">
            {deviceItems.map((b) => {
              const latest = b.latest_entry as Record<string, any> | null;
              return (
                <div
                  key={b.id as number}
                  className="flex items-center gap-2"
                  {...(makeDraggable ? makeDraggable(b.id as number, selectedIds) : {})}
                >
                  {makeDraggable && (
                    <GripVertical className="w-4 h-4 text-muted-foreground/40 shrink-0 cursor-grab" />
                  )}
                  {editMode && (
                    <input
                      type="checkbox"
                      checked={selectedIds.has(b.id as number)}
                      onChange={(e) => {
                        const next = new Set(selectedIds);
                        if (e.target.checked) next.add(b.id as number);
                        else next.delete(b.id as number);
                        setSelectedIds(next);
                      }}
                      className="rounded shrink-0"
                      aria-label={`${t("bulk.select")} ${b.name}`}
                    />
                  )}
                  <Link to={`/backups/${b.id}`} className="block flex-1" draggable={false}>
                    <Card className="hover:border-primary/30 transition-colors cursor-pointer py-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-semibold text-sm">{b.name as string}</h3>
                          <p className="text-xs text-muted-foreground">
                            {t(`categories.${b.category}`, { defaultValue: b.category as string })}
                            {b.tags ? ` \u00b7 ${b.tags}` : ""}
                          </p>
                        </div>
                        <div className="flex items-center gap-6">
                          <div className="text-right">
                            <p className="text-sm">
                              {latest ? formatBytes(latest.size_bytes as number) : "\u2014"}
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
                  {editMode && (
                    <>
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
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

function BackupsExpandedView({
  sorted,
  folderHook,
  view,
  editMode,
  selectedIds,
  setSelectedIds,
  setSoftDeleteId,
  setRenamingFolder,
  setDeletingFolder,
  unfiledCollapsed,
  setUnfiledCollapsed,
  t,
  triggerRefresh,
  loadAll,
  makeDraggable,
  registerDropTarget,
  isDragOver,
}: {
  sorted: Array<Record<string, any>>;
  folderHook: ReturnType<typeof useFolders>;
  view: "grid" | "list";
  editMode: boolean;
  selectedIds: Set<number>;
  setSelectedIds: (s: Set<number>) => void;
  setSoftDeleteId: (id: number | null) => void;
  setRenamingFolder: (f: FolderData | null) => void;
  setDeletingFolder: (f: FolderData | null) => void;
  unfiledCollapsed: boolean;
  setUnfiledCollapsed: (v: boolean) => void;
  t: (key: string, opts?: any) => string;
  triggerRefresh: () => void;
  loadAll: () => Promise<void>;
  makeDraggable: (itemId: number, selectedIds: Set<number>) => Record<string, any>;
  registerDropTarget: (folderId: number | null, el: HTMLElement | null) => void;
  isDragOver: (folderId: number | null) => boolean;
}) {
  const groups = folderHook.groupItemsByFolder(sorted);

  return (
    <div className="space-y-6">
      {groups.map((group) => {
        const folder = group.folder;
        const isCollapsed = folder ? folder.collapsed : unfiledCollapsed;

        return (
          <FolderSection
            key={folder ? folder.id : "unfiled"}
            folder={folder}
            collapsed={isCollapsed}
            onToggleCollapsed={() => {
              if (folder) {
                folderHook.toggleCollapsed(folder.id);
              } else {
                setUnfiledCollapsed(!unfiledCollapsed);
              }
            }}
            onRename={folder ? () => setRenamingFolder(folder) : undefined}
            onDelete={folder ? () => setDeletingFolder(folder) : undefined}
            editMode={editMode}
            itemCount={group.items.length}
            dropRef={(el: HTMLElement | null) => registerDropTarget(folder?.id ?? null, el)}
            isDropOver={isDragOver(folder?.id ?? null)}
          >
            <BackupsItemList
              items={group.items}
              view={view}
              editMode={editMode}
              selectedIds={selectedIds}
              setSelectedIds={setSelectedIds}
              setSoftDeleteId={setSoftDeleteId}
              t={t}
              triggerRefresh={triggerRefresh}
              loadAll={loadAll}
              makeDraggable={makeDraggable}
            />
          </FolderSection>
        );
      })}
    </div>
  );
}
