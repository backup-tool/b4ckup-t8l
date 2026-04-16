import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Plus, Pencil, Trash2, HardDrive, GripVertical, Search, Filter, ArrowUpDown } from "lucide-react";
import { cn } from "@/lib/cn";
import { ViewToggle } from "@/components/ui/ViewToggle";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Input, Textarea, Label } from "@/components/ui/Input";
import { CustomSelect } from "@/components/ui/CustomSelect";
import { ComboSelect } from "@/components/ui/ComboSelect";
import { Popover } from "@/components/ui/Popover";
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
  getMediaWithUsage,
  getDeletedMedia,
  createMedia,
  updateMedia,
  softDeleteMedia,
  restoreMedia,
  permanentDeleteMedia,
} from "@/lib/db";
import { STORAGE_TYPES, SIZE_UNITS, SIZE_MULTIPLIERS } from "@/lib/types";
import { formatBytes } from "@/lib/format";
import { useAppStore, useViewPrefs } from "@/lib/store";
import { useFolders } from "@/lib/useFolders";
import { useDragDrop } from "@/lib/useDragDrop";
import type { FolderData } from "@/lib/useFolders";

export function Media() {
  const { t } = useTranslation();
  const refreshKey = useAppStore((s) => s.refreshKey);
  const triggerRefresh = useAppStore((s) => s.triggerRefresh);
  const [media, setMedia] = useState<Array<Record<string, any>>>([]);
  const [loading, setLoading] = useState(true);
  const [deleted, setDeleted] = useState<Array<Record<string, any>>>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Record<string, any> | null>(null);
  const [softDeleteId, setSoftDeleteId] = useState<number | null>(null);
  const prefs = useViewPrefs((s) => s.get("media"));
  const setPrefs = useViewPrefs((s) => s.set);
  const [view, _setView] = useState<"grid" | "list">(prefs.view as "grid" | "list");
  const setView = (v: "grid" | "list") => { _setView(v); setPrefs("media", { view: v }); };
  const [editMode, setEditMode] = useState(false);
  const [search, _setSearch] = useState(prefs.search);
  const setSearch = (v: string) => { _setSearch(v); setPrefs("media", { search: v }); };
  const [filterType, _setFilterType] = useState(prefs.filters.type || "all");
  const setFilterType = (v: string) => { _setFilterType(v); setPrefs("media", { filters: { ...prefs.filters, type: v } }); };
  const [filterEncrypted, _setFilterEncrypted] = useState(prefs.filters.encrypted || "all");
  const setFilterEncrypted = (v: string) => { _setFilterEncrypted(v); setPrefs("media", { filters: { ...prefs.filters, encrypted: v } }); };
  const [sortField, _setSortField] = useState(prefs.sortField);
  const setSortField = (v: string) => { _setSortField(v); setPrefs("media", { sortField: v }); };
  const [sortDir, _setSortDir] = useState(prefs.sortDir);
  const setSortDir = (v: string) => { _setSortDir(v); setPrefs("media", { sortDir: v }); };
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [bulkConfirmOpen, setBulkConfirmOpen] = useState(false);
  const [lastClickedId, setLastClickedId] = useState<number | null>(null);

  // Folder support
  const folderHook = useFolders("media", refreshKey);
  const [folderModalOpen, setFolderModalOpen] = useState(false);
  const [renamingFolder, setRenamingFolder] = useState<FolderData | null>(null);
  const [deletingFolder, setDeletingFolder] = useState<FolderData | null>(null);
  const [unfiledCollapsed, setUnfiledCollapsed] = useState(false);

  // Drag & drop for folder moves
  const { makeDraggable, registerDropTarget, isDragOver, dragging, ghostPos, ghostSize, ghostOffset, dragLabel, dragIds } = useDragDrop(
    async (itemIds, folderId) => {
      await folderHook.moveItems(itemIds, folderId);
      setSelectedIds(new Set());
      triggerRefresh();
      await loadAll();
    }
  );

  const [form, setForm] = useState({
    name: "",
    type: "nas" as string,
    total_capacity: "",
    capacity_unit: "GB",
    path: "",
    notes: "",
    is_encrypted: false,
    encryption_type: "",
    encryption_label: "",
  });

  useEffect(() => {
    loadAll();
  }, [refreshKey]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "n") {
        e.preventDefault();
        openCreate();
      }
      if (editMode && (e.metaKey || e.ctrlKey) && e.key === "a") {
        e.preventDefault();
        setSelectedIds(new Set(media.map((m) => m.id as number)));
      }
      if (editMode && e.key === "Escape") {
        setSelectedIds(new Set());
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [editMode, media]);

  function handleItemClick(id: number, e: React.MouseEvent) {
    if (!editMode) return;
    e.preventDefault();
    e.stopPropagation();
    const next = new Set(selectedIds);
    if (e.shiftKey && lastClickedId != null) {
      const ids = sorted.map((m) => m.id as number);
      const start = ids.indexOf(lastClickedId);
      const end = ids.indexOf(id);
      if (start >= 0 && end >= 0) {
        const [from, to] = [Math.min(start, end), Math.max(start, end)];
        for (let i = from; i <= to; i++) next.add(ids[i]);
      }
    } else {
      if (next.has(id)) next.delete(id); else next.add(id);
    }
    setSelectedIds(next);
    setLastClickedId(id);
  }

  async function loadAll() {
    try {
      const [active, trash] = await Promise.all([getMediaWithUsage(), getDeletedMedia()]);
      setMedia(active);
      setDeleted(trash);
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  }

  function openCreate() {
    setEditing(null);
    setForm({ name: "", type: "nas", total_capacity: "", capacity_unit: "GB", path: "", notes: "", is_encrypted: false, encryption_type: "", encryption_label: "" });
    setModalOpen(true);
  }

  function openEdit(m: Record<string, any>) {
    setEditing(m);
    const storedGb = m.total_capacity_gb as number | null;
    let displayVal = "";
    let displayUnit = "GB";
    if (storedGb != null) {
      if (storedGb >= 1024) {
        displayVal = String(+(storedGb / 1024).toFixed(2));
        displayUnit = "TB";
      } else if (storedGb < 1) {
        displayVal = String(+(storedGb * 1024).toFixed(0));
        displayUnit = "MB";
      } else {
        displayVal = String(storedGb);
        displayUnit = "GB";
      }
    }
    setForm({
      name: m.name as string,
      type: m.type as string,
      total_capacity: displayVal,
      capacity_unit: displayUnit,
      path: (m.path as string) || "",
      notes: (m.notes as string) || "",
      is_encrypted: !!(m.is_encrypted as number),
      encryption_type: (m.encryption_type as string) || "",
      encryption_label: (m.encryption_label as string) || "",
    });
    setModalOpen(true);
  }

  async function handleSave() {
    let capacityGb: number | null = null;
    if (form.total_capacity) {
      const raw = parseFloat(form.total_capacity);
      const bytes = raw * (SIZE_MULTIPLIERS[form.capacity_unit] || 1);
      capacityGb = bytes / SIZE_MULTIPLIERS["GB"];
    }
    const data = {
      name: form.name,
      type: form.type,
      total_capacity_gb: capacityGb,
      path: form.path || null,
      notes: form.notes || null,
      is_encrypted: form.is_encrypted,
      encryption_type: form.encryption_type || null,
      encryption_label: form.encryption_label || null,
    };

    if (editing) {
      await updateMedia(editing.id as number, data);
    } else {
      await createMedia(data);
    }
    setModalOpen(false);
    triggerRefresh();
    await loadAll();
  }

  async function handleSoftDelete(id: number) {
    await softDeleteMedia(id);
    triggerRefresh();
    await loadAll();
  }


  const filtered = media.filter((m) => {
    const matchesSearch = !search ||
      (m.name as string).toLowerCase().includes(search.toLowerCase()) ||
      (m.type as string).toLowerCase().includes(search.toLowerCase()) ||
      ((m.path as string) || "").toLowerCase().includes(search.toLowerCase());
    const matchesType = filterType === "all" || m.type === filterType;
    const matchesEncrypted = filterEncrypted === "all" ||
      (filterEncrypted === "yes" && m.is_encrypted) ||
      (filterEncrypted === "no" && !m.is_encrypted);
    return matchesSearch && matchesType && matchesEncrypted;
  });

  const sorted = [...filtered].sort((a, b) => {
    const key = sortField;
    const mult = sortDir === "desc" ? -1 : 1;
    if (key === "name") return mult * (a.name as string).localeCompare(b.name as string);
    if (key === "type") return mult * ((t(`storageTypes.${a.type}`, { defaultValue: "" })).localeCompare(t(`storageTypes.${b.type}`, { defaultValue: "" })));
    if (key === "capacity") return mult * (((a.total_capacity_gb as number) || 0) - ((b.total_capacity_gb as number) || 0));
    if (key === "used") return mult * ((a.used_gb as number) - (b.used_gb as number));
    if (key === "backups") return mult * ((a.backup_count as number) - (b.backup_count as number));
    return 0;
  });

  if (loading) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-bold">{t("media.title")}</h1>
          <ViewToggle view={view} onViewChange={setView} />
          <FolderToolbar
            viewMode={folderHook.viewMode}
            onViewModeChange={folderHook.setViewMode}
            onCreateFolder={() => setFolderModalOpen(true)}
          />
        </div>
        <div className="flex items-center gap-2">
          <TrashSection
            items={deleted.map((m) => ({
              id: m.id as number,
              title: m.name as string,
              subtitle: t(`storageTypes.${m.type}`, { defaultValue: m.type as string }),
              deleted_at: m.deleted_at as string,
            }))}
            onRestore={async (id) => { await restoreMedia(id); triggerRefresh(); await loadAll(); }}
            onPermanentDelete={async (id) => { await permanentDeleteMedia(id); triggerRefresh(); await loadAll(); }}
            onRestoreAll={async () => { for (const m of deleted) await restoreMedia(m.id as number); triggerRefresh(); await loadAll(); }}
            onDeleteAll={async () => { for (const m of deleted) await permanentDeleteMedia(m.id as number); triggerRefresh(); await loadAll(); }}
            permanentDeleteMessage={t("trash.confirmPermanentMedia")}
          />
          <Button
            variant={editMode ? "primary" : "secondary"}
            onClick={() => { setEditMode(!editMode); if (editMode) setSelectedIds(new Set()); }}
          >
            <Pencil className="w-4 h-4" />
            {editMode ? t("common.done") : t("common.edit")}
          </Button>
          <Button onClick={openCreate}>
            <Plus className="w-4 h-4" />
            {t("media.create")}
          </Button>
        </div>
      </div>

      {/* Search, Filter, Sort */}
      <div className="flex gap-3 items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder={t("media.search")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Popover
          align="right"
          trigger={
            <button className="flex items-center gap-2 rounded-lg border border-input bg-background px-3 py-2 text-sm hover:border-ring/40 transition-colors">
              <Filter className="w-4 h-4 text-muted-foreground" />
              {t("common.filter")}
              {(filterType !== "all" || filterEncrypted !== "all") && (
                <span className="ml-1 px-1.5 py-0.5 text-[10px] font-medium rounded-full bg-primary text-primary-foreground">
                  {(filterType !== "all" ? 1 : 0) + (filterEncrypted !== "all" ? 1 : 0)}
                </span>
              )}
            </button>
          }
        >
          <div className="space-y-3 min-w-[240px]">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">{t("media.type")}</label>
              <CustomSelect
                value={filterType}
                onChange={setFilterType}
                options={[
                  { value: "all", label: t("backups.filterAll") },
                  ...STORAGE_TYPES.map((type) => ({
                    value: type,
                    label: t(`storageTypes.${type}`, { defaultValue: type }),
                  })),
                  ...Array.from(new Set(media.map((m) => m.type as string)))
                    .filter((type) => !(STORAGE_TYPES as readonly string[]).includes(type))
                    .map((type) => ({ value: type, label: type })),
                ]}
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">{t("media.encrypted")}</label>
              <CustomSelect
                value={filterEncrypted}
                onChange={setFilterEncrypted}
                options={[
                  { value: "all", label: t("backups.filterAll") },
                  { value: "yes", label: t("common.yes") },
                  { value: "no", label: t("common.no") },
                ]}
              />
            </div>
            {(filterType !== "all" || filterEncrypted !== "all") && (
              <button
                onClick={() => { setFilterType("all"); setFilterEncrypted("all"); }}
                className="text-xs text-primary hover:underline"
              >
                {t("common.resetFilter")}
              </button>
            )}
          </div>
        </Popover>
        <Popover
          align="right"
          trigger={
            <button className="flex items-center gap-2 rounded-lg border border-input bg-background px-3 py-2 text-sm hover:border-ring/40 transition-colors">
              <ArrowUpDown className="w-4 h-4 text-muted-foreground" />
              {t("common.sort")}
            </button>
          }
        >
          <div className="space-y-3 min-w-[200px]">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">{t("common.sortBy")}</label>
              <CustomSelect
                value={sortField}
                onChange={setSortField}
                options={[
                  { value: "name", label: t("media.name") },
                  { value: "type", label: t("media.type") },
                  { value: "capacity", label: t("media.capacity") },
                  { value: "used", label: t("media.used") },
                  { value: "backups", label: t("media.backupCount") },
                ]}
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">{t("common.direction")}</label>
              <CustomSelect
                value={sortDir}
                onChange={setSortDir}
                options={[
                  { value: "asc", label: t("common.ascending") },
                  { value: "desc", label: t("common.descending") },
                ]}
              />
            </div>
          </div>
        </Popover>
      </div>

      {/* Bulk actions */}
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
            <Button size="sm" variant="destructive" onClick={() => setBulkConfirmOpen(true)}>
              {t("common.delete")}
            </Button>
          </div>
        </div>
      )}

      {/* Folder breadcrumb */}
      {folderHook.viewMode === "folder" && folderHook.currentFolder && (
        <FolderBreadcrumb
          currentFolder={folderHook.currentFolder}
          onNavigateBack={() => folderHook.navigateToFolder(null)}
          dropRef={(el: HTMLElement | null) => registerDropTarget(null, el)}
          isDropOver={isDragOver(null)}
        />
      )}

      {media.length === 0 && folderHook.viewMode === "flat" ? (
        <Card className="text-center py-12">
          <HardDrive className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
          <p className="text-muted-foreground">{t("media.noMedia")}</p>
        </Card>
      ) : folderHook.viewMode === "expanded" ? (
        <MediaExpandedView
          sorted={sorted}
          folderHook={folderHook}
          view={view}
          editMode={editMode}
          selectedIds={selectedIds}
          openEdit={openEdit}
          setSoftDeleteId={setSoftDeleteId}
          setRenamingFolder={setRenamingFolder}
          setDeletingFolder={setDeletingFolder}
          unfiledCollapsed={unfiledCollapsed}
          setUnfiledCollapsed={setUnfiledCollapsed}
          t={t}
          makeDraggable={editMode ? makeDraggable : undefined}
          registerDropTarget={registerDropTarget}
          isDragOver={isDragOver}
          handleItemClick={handleItemClick}
        />
      ) : folderHook.viewMode === "folder" && folderHook.currentFolderId === null ? (
        <div>
          <FolderGrid
            folders={folderHook.folders}
            itemCounts={(() => {
              const counts = new Map<number, number>();
              for (const f of folderHook.folders) {
                counts.set(f.id, sorted.filter((m) => (m.folder_id as number | null) === f.id).length);
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
          <MediaItemList
            items={sorted.filter((m) => !(m.folder_id as number | null))}
            view={view}
            editMode={editMode}
            selectedIds={selectedIds}
            openEdit={openEdit}
            setSoftDeleteId={setSoftDeleteId}
            t={t}
            makeDraggable={editMode ? makeDraggable : undefined}
            handleItemClick={handleItemClick}
          />
        </div>
      ) : (
        <MediaItemList
          items={folderHook.viewMode === "folder"
            ? sorted.filter((m) => (m.folder_id as number | null) === folderHook.currentFolderId)
            : sorted
          }
          view={view}
          editMode={editMode}
          selectedIds={selectedIds}
          openEdit={openEdit}
          setSoftDeleteId={setSoftDeleteId}
          t={t}
          makeDraggable={editMode ? makeDraggable : undefined}
          handleItemClick={handleItemClick}
        />
      )}

      {/* Create/Edit Modal */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSave={handleSave}
        title={editing ? t("media.edit") : t("media.create")}
      >
        <div className="space-y-4">
          <div>
            <Label>{t("media.name")}</Label>
            <Input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="My NAS"
            />
          </div>
          <div>
            <Label>{t("media.type")}</Label>
            <ComboSelect
              value={form.type}
              onChange={(val) => setForm({ ...form, type: val })}
              options={STORAGE_TYPES.map((type) => ({
                value: type,
                label: t(`storageTypes.${type}`, { defaultValue: type }),
              }))}
              createLabel={t("media.customType")}
            />
          </div>
          <div>
            <Label>{t("media.capacity")}</Label>
            <div className="flex gap-2">
              <Input
                type="number"
                value={form.total_capacity}
                onChange={(e) =>
                  setForm({ ...form, total_capacity: e.target.value })
                }
                placeholder="1000"
                className="flex-1"
              />
              <CustomSelect
                className="w-24"
                value={form.capacity_unit}
                onChange={(val) => setForm({ ...form, capacity_unit: val })}
                options={SIZE_UNITS.map((u) => ({ value: u.value, label: u.label }))}
              />
            </div>
          </div>
          <div>
            <Label>{t("media.path")}</Label>
            <Input
              value={form.path}
              onChange={(e) => setForm({ ...form, path: e.target.value })}
              placeholder="/mnt/nas or \\\\server\\share"
            />
          </div>
          <div>
            <Label>{t("media.notes")}</Label>
            <Textarea
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
            />
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="is_encrypted"
              checked={form.is_encrypted}
              onChange={(e) => setForm({ ...form, is_encrypted: e.target.checked })}
              className="rounded"
            />
            <label htmlFor="is_encrypted" className="text-sm">
              {t("media.encrypted")}
            </label>
          </div>
          {form.is_encrypted && (
            <>
              <div>
                <Label>{t("media.encryptionType")}</Label>
                <CustomSelect
                  value={form.encryption_type}
                  onChange={(val) => setForm({ ...form, encryption_type: val })}
                  options={[
                    { value: "veracrypt", label: "VeraCrypt" },
                    { value: "bitlocker", label: "BitLocker" },
                    { value: "filevault", label: "FileVault" },
                    { value: "luks", label: "LUKS" },
                    { value: "hardware", label: "Hardware" },
                    { value: "other", label: t("common.edit") },
                  ]}
                  placeholder="VeraCrypt, BitLocker..."
                />
              </div>
              <div>
                <Label>{t("media.encryptionLabel")}</Label>
                <Input
                  value={form.encryption_label}
                  onChange={(e) => setForm({ ...form, encryption_label: e.target.value })}
                  placeholder="F1.KA, Key-ID..."
                />
              </div>
            </>
          )}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setModalOpen(false)}>
              {t("media.cancel")}
            </Button>
            <Button onClick={handleSave} disabled={!form.name}>
              {t("media.save")}
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
        message={t("trash.confirmSoftDeleteMedia")}
        confirmLabel={t("trash.moveToTrash")}
        cancelLabel={t("common.cancel")}
      />

      <ConfirmDialog
        open={bulkConfirmOpen}
        onClose={() => setBulkConfirmOpen(false)}
        onConfirm={async () => {
          for (const id of selectedIds) await softDeleteMedia(id);
          setSelectedIds(new Set());
          setBulkConfirmOpen(false);
          triggerRefresh(); await loadAll();
        }}
        title={t("trash.moveToTrash")}
        message={`${selectedIds.size} ${t("bulk.deleteConfirmMedia")}`}
        confirmLabel={t("trash.moveToTrash")}
        cancelLabel={t("common.cancel")}
        variant="danger"
      />

      {/* Folder modals */}
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
      <DragGhost visible={dragging} pos={ghostPos} size={ghostSize} offset={ghostOffset} label={dragLabel} count={dragIds.length} />
    </div>
  );
}

// --- Sub-components ---

function MediaItemList({
  items,
  view,
  editMode,
  selectedIds,
  openEdit,
  setSoftDeleteId,
  t,
  makeDraggable,
  handleItemClick,
}: {
  items: Array<Record<string, any>>;
  view: "grid" | "list";
  editMode: boolean;
  selectedIds: Set<number>;
  openEdit: (m: Record<string, any>) => void;
  setSoftDeleteId: (id: number | null) => void;
  t: (key: string, opts?: any) => string;
  makeDraggable?: (itemId: number, selectedIds: Set<number>, label?: string) => Record<string, any>;
  handleItemClick: (id: number, e: React.MouseEvent) => void;
}) {
  if (items.length === 0) {
    return (
      <Card className="text-center py-12">
        <HardDrive className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
        <p className="text-muted-foreground">{t("media.noMedia")}</p>
      </Card>
    );
  }

  if (view === "list") {
    return (
      <div className="space-y-1.5">
        {items.map((m) => {
          const used = m.used_gb as number;
          const total = m.total_capacity_gb as number | null;
          const listCardContent = (
            <div className="flex items-center gap-4">
              <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center shrink-0">
                <HardDrive className="w-4 h-4 text-muted-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-semibold truncate">{m.name as string}</h3>
                <p className="text-xs text-muted-foreground truncate">
                  {t(`storageTypes.${m.type}`, { defaultValue: m.type as string })}
                  {m.is_encrypted ? ` \u00b7 \ud83d\udd12 ${m.encryption_label || t("media.encrypted")}` : ""}
                </p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-sm font-medium tabular-nums">
                  {total ? formatBytes(total * 1024 ** 3) : "\u2014"}
                </p>
                <p className="text-[10px] text-muted-foreground">
                  {formatBytes(used * 1024 ** 3)} {t("media.used")} \u00b7 {m.backup_count as number} {t("media.backupCount")}
                </p>
              </div>
              {editMode && (
                <div className="flex gap-1 shrink-0">
                  <button onClick={(e) => { e.stopPropagation(); openEdit(m); }} className="p-1 rounded hover:bg-muted"><Pencil className="w-3.5 h-3.5 text-muted-foreground" /></button>
                  <button onClick={(e) => { e.stopPropagation(); setSoftDeleteId(m.id as number); }} className="p-1 rounded hover:bg-muted"><Trash2 className="w-3.5 h-3.5 text-muted-foreground" /></button>
                </div>
              )}
            </div>
          );
          return (
            <div
              key={m.id as number}
              className="flex items-center gap-2"
            >
              {editMode && (
                <GripVertical
                  className="w-4 h-4 text-muted-foreground/40 shrink-0 cursor-grab"
                  {...(makeDraggable ? makeDraggable(m.id as number, selectedIds, m.name as string) : {})}
                />
              )}
              {editMode && (
                <input
                  type="checkbox"
                  checked={selectedIds.has(m.id as number)}
                  onChange={() => {}}
                  onClick={(e) => e.stopPropagation()}
                  className="rounded shrink-0 pointer-events-none"
                />
              )}
              <Card
                className={cn("py-3 flex-1", editMode && "cursor-pointer", editMode && selectedIds.has(m.id as number) && "ring-2 ring-primary")}
                onClick={editMode ? (e) => handleItemClick(m.id as number, e) : undefined}
              >
                {listCardContent}
              </Card>
            </div>
          );
        })}
      </div>
    );
  }

  const gridCardContent = (m: Record<string, any>) => {
    const used = m.used_gb as number;
    const total = m.total_capacity_gb as number | null;
    const pct = total ? Math.min((used / total) * 100, 100) : 0;
    return (
      <>
        <div className="flex items-start justify-between mb-3">
          <div>
            <h3 className="font-semibold text-sm">{m.name as string}</h3>
            <p className="text-xs text-muted-foreground">
              {t(`storageTypes.${m.type}`, { defaultValue: m.type as string })}
              {m.is_encrypted ? (
                <span className="ml-1.5 text-[10px] text-amber-600 font-medium">
                  \ud83d\udd12 {m.encryption_label || t("media.encrypted")}
                </span>
              ) : null}
            </p>
          </div>
          {editMode && <div className="flex gap-1">
            <button onClick={(e) => { e.stopPropagation(); openEdit(m); }} className="p-1 rounded hover:bg-muted"><Pencil className="w-3.5 h-3.5 text-muted-foreground" /></button>
            <button onClick={(e) => { e.stopPropagation(); setSoftDeleteId(m.id as number); }} className="p-1 rounded hover:bg-muted"><Trash2 className="w-3.5 h-3.5 text-muted-foreground" /></button>
          </div>}
        </div>
        {total && (
          <div className="mb-2">
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${pct}%` }} />
            </div>
            <div className="flex justify-between text-xs text-muted-foreground mt-1">
              <span>{formatBytes(used * 1024 ** 3)} {t("media.used")}</span>
              <span>{formatBytes(total * 1024 ** 3)}</span>
            </div>
          </div>
        )}
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{m.backup_count as number} {t("media.backupCount")}</span>
          {m.path && <span className="truncate max-w-[150px]">{String(m.path)}</span>}
        </div>
      </>
    );
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {items.map((m) => (
        <div key={m.id as number} className="relative">
          {editMode && (
            <input
              type="checkbox"
              checked={selectedIds.has(m.id as number)}
              onChange={() => {}}
              onClick={(e) => e.stopPropagation()}
              className="absolute top-3 left-3 rounded z-10 pointer-events-none"
            />
          )}
          <Card
            className={cn(editMode && "cursor-pointer", editMode && selectedIds.has(m.id as number) && "ring-2 ring-primary")}
            onClick={editMode ? (e) => handleItemClick(m.id as number, e) : undefined}
          >
            {gridCardContent(m)}
          </Card>
        </div>
      ))}
    </div>
  );
}

function MediaExpandedView({
  sorted,
  folderHook,
  view,
  editMode,
  selectedIds,
  openEdit,
  setSoftDeleteId,
  setRenamingFolder,
  setDeletingFolder,
  unfiledCollapsed,
  setUnfiledCollapsed,
  t,
  makeDraggable,
  registerDropTarget,
  isDragOver,
  handleItemClick,
}: {
  sorted: Array<Record<string, any>>;
  folderHook: ReturnType<typeof useFolders>;
  view: "grid" | "list";
  editMode: boolean;
  selectedIds: Set<number>;
  openEdit: (m: Record<string, any>) => void;
  setSoftDeleteId: (id: number | null) => void;
  setRenamingFolder: (f: FolderData | null) => void;
  setDeletingFolder: (f: FolderData | null) => void;
  unfiledCollapsed: boolean;
  setUnfiledCollapsed: (v: boolean) => void;
  t: (key: string, opts?: any) => string;
  makeDraggable?: (itemId: number, selectedIds: Set<number>, label?: string) => Record<string, any>;
  registerDropTarget: (folderId: number | null, el: HTMLElement | null) => void;
  isDragOver: (folderId: number | null) => boolean;
  handleItemClick: (id: number, e: React.MouseEvent) => void;
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
            <MediaItemList
              items={group.items}
              view={view}
              editMode={editMode}
              selectedIds={selectedIds}
              openEdit={openEdit}
              setSoftDeleteId={setSoftDeleteId}
              t={t}
              makeDraggable={editMode ? makeDraggable : undefined}
              handleItemClick={handleItemClick}
            />
          </FolderSection>
        );
      })}
    </div>
  );
}
