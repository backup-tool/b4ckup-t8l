import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Plus, Pencil, Trash2, Monitor, GripVertical, Search, Filter, ArrowUpDown } from "lucide-react";
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
  getDeviceWithBackupCount,
  getDeletedDevices,
  createDevice,
  updateDevice,
  softDeleteDevice,
  restoreDevice,
  permanentDeleteDevice,
} from "@/lib/db";
import { DEVICE_TYPES, SIZE_UNITS, getDeviceFields } from "@/lib/types";
import { useViewPrefs } from "@/lib/store";
import { useFolders } from "@/lib/useFolders";
import { useDragDrop } from "@/lib/useDragDrop";
import type { FolderData } from "@/lib/useFolders";

export function Devices() {
  const { t } = useTranslation();
  const [devices, setDevices] = useState<Array<Record<string, any>>>([]);
  const [loading, setLoading] = useState(true);
  const [deleted, setDeleted] = useState<Array<Record<string, any>>>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Record<string, any> | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const prefsPages = useViewPrefs((s) => s.pages);
  const setPrefs = useViewPrefs((s) => s.set);
  const savedDevices = prefsPages["devices"] || {};
  const prefs = { view: (savedDevices.view || "grid") as "grid" | "list", sortField: savedDevices.sortField || "name", sortDir: savedDevices.sortDir || "asc", filters: savedDevices.filters || {} as Record<string, string>, search: savedDevices.search || "" };
  const [view, _setView] = useState<"grid" | "list">(prefs.view as "grid" | "list");
  const setView = (v: "grid" | "list") => { _setView(v); setPrefs("devices", { view: v }); };
  const [editMode, setEditMode] = useState(false);
  const [search, _setSearch] = useState(prefs.search);
  const setSearch = (v: string) => { _setSearch(v); setPrefs("devices", { search: v }); };
  const [filterDeviceType, _setFilterDeviceType] = useState(prefs.filters.type || "all");
  const setFilterDeviceType = (v: string) => { _setFilterDeviceType(v); setPrefs("devices", { filters: { ...prefs.filters, type: v } }); };
  const [sortField, _setSortField] = useState(prefs.sortField);
  const setSortField = (v: string) => { _setSortField(v); setPrefs("devices", { sortField: v }); };
  const [sortDir, _setSortDir] = useState(prefs.sortDir);
  const setSortDir = (v: string) => { _setSortDir(v); setPrefs("devices", { sortDir: v }); };
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [bulkConfirmOpen, setBulkConfirmOpen] = useState(false);
  const [lastClickedId, setLastClickedId] = useState<number | null>(null);

  // Folder support
  const folderHook = useFolders("device");
  const [folderModalOpen, setFolderModalOpen] = useState(false);
  const [renamingFolder, setRenamingFolder] = useState<FolderData | null>(null);
  const [deletingFolder, setDeletingFolder] = useState<FolderData | null>(null);
  const [unfiledCollapsed, setUnfiledCollapsed] = useState(false);

  // Drag & drop for folder moves
  const { makeDraggable, registerDropTarget, isDragOver, dragging, ghostPos, ghostSize, ghostOffset, dragLabel, dragIds } = useDragDrop(
    async (itemIds, folderId) => {
      await folderHook.moveItems(itemIds, folderId);
      setSelectedIds(new Set());
      await loadDevices();
    }
  );

  const [form, setForm] = useState({
    name: "",
    type: "laptop",
    os: "",
    model: "",
    serial_number: "",
    notes: "",
    brand: "",
    provider: "",
    ip_address: "",
    url: "",
    storage_capacity_value: "",
    storage_capacity_unit: "GB",
  });

  useEffect(() => {
    loadDevices();
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "n") {
        e.preventDefault();
        openCreate();
      }
      if (editMode && (e.metaKey || e.ctrlKey) && e.key === "a") {
        e.preventDefault();
        setSelectedIds(new Set(devices.map((d) => d.id as number)));
      }
      if (editMode && e.key === "Escape") {
        setSelectedIds(new Set());
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [editMode, devices]);

  function handleItemClick(id: number, e: React.MouseEvent) {
    if (!editMode) return;
    e.preventDefault();
    e.stopPropagation();
    const next = new Set(selectedIds);
    if (e.shiftKey && lastClickedId != null) {
      const ids = sorted.map((d) => d.id as number);
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

  async function loadDevices() {
    try {
      const [active, trash] = await Promise.all([getDeviceWithBackupCount(), getDeletedDevices()]);
      setDevices(active);
      setDeleted(trash);
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  }

  const emptyForm = { name: "", type: "laptop", os: "", model: "", serial_number: "", notes: "", brand: "", provider: "", ip_address: "", url: "", storage_capacity_value: "", storage_capacity_unit: "GB" };

  function openCreate() {
    setEditing(null);
    setForm(emptyForm);
    setModalOpen(true);
  }

  function openEdit(d: Record<string, any>) {
    setEditing(d);
    setForm({
      name: (d.name as string) || "",
      type: (d.type as string) || "other",
      os: (d.os as string) || "",
      model: (d.model as string) || "",
      serial_number: (d.serial_number as string) || "",
      notes: (d.notes as string) || "",
      brand: (d.brand as string) || "",
      provider: (d.provider as string) || "",
      ip_address: (d.ip_address as string) || "",
      url: (d.url as string) || "",
      ...parseCapacity((d.storage_capacity as string) || ""),
    });
    setModalOpen(true);
  }

  function parseCapacity(str: string) {
    const match = str.match(/^([\d.]+)\s*(.+)$/);
    if (match) {
      const unit = SIZE_UNITS.find((u) => u.value === match[2])?.value || "GB";
      return { storage_capacity_value: match[1], storage_capacity_unit: unit };
    }
    return { storage_capacity_value: str ? str.replace(/[^\d.]/g, "") : "", storage_capacity_unit: "GB" };
  }

  const deviceData = () => ({
    name: form.name,
    type: form.type,
    os: form.os || null,
    model: form.model || null,
    serial_number: form.serial_number || null,
    notes: form.notes || null,
    brand: form.brand || null,
    provider: form.provider || null,
    ip_address: form.ip_address || null,
    url: form.url || null,
    storage_capacity: form.storage_capacity_value ? `${form.storage_capacity_value} ${form.storage_capacity_unit}` : null,
  });

  async function handleSave() {
    if (editing) {
      await updateDevice(editing.id as number, deviceData());
    } else {
      await createDevice(form.name, form.type);
      const all = await getDeviceWithBackupCount();
      const created = all.find((d) => d.name === form.name);
      if (created) {
        await updateDevice(created.id as number, deviceData());
      }
    }
    setModalOpen(false);
    await loadDevices();
  }

  async function handleDelete(id: number) {
    await softDeleteDevice(id);
    await loadDevices();
  }


  const filtered = devices.filter((d) => {
    const matchesSearch = !search ||
      (d.name as string).toLowerCase().includes(search.toLowerCase()) ||
      (d.type as string).toLowerCase().includes(search.toLowerCase()) ||
      ((d.brand as string) || "").toLowerCase().includes(search.toLowerCase()) ||
      ((d.model as string) || "").toLowerCase().includes(search.toLowerCase()) ||
      ((d.provider as string) || "").toLowerCase().includes(search.toLowerCase());
    const matchesType = filterDeviceType === "all" || d.type === filterDeviceType;
    return matchesSearch && matchesType;
  });

  const sorted = [...filtered].sort((a, b) => {
    const key = sortField;
    const mult = sortDir === "desc" ? -1 : 1;
    if (key === "name") return mult * (a.name as string).localeCompare(b.name as string);
    if (key === "type") return mult * ((t(`deviceTypes.${a.type}`, { defaultValue: "" })).localeCompare(t(`deviceTypes.${b.type}`, { defaultValue: "" })));
    if (key === "backups") return mult * ((a.backup_count as number) - (b.backup_count as number));
    return 0;
  });

  if (loading) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-bold">{t("devices.title")}</h1>
          <ViewToggle view={view} onViewChange={setView} />
          <FolderToolbar
            viewMode={folderHook.viewMode}
            onViewModeChange={folderHook.setViewMode}
            onCreateFolder={() => setFolderModalOpen(true)}
          />
        </div>
        <div className="flex items-center gap-2">
          <TrashSection
            items={deleted.map((d) => ({
              id: d.id as number,
              title: d.name as string,
              subtitle: t(`deviceTypes.${d.type}`, { defaultValue: d.type as string }),
              deleted_at: d.deleted_at as string,
            }))}
            onRestore={async (id) => { await restoreDevice(id); await loadDevices(); }}
            onPermanentDelete={async (id) => { await permanentDeleteDevice(id); await loadDevices(); }}
            onRestoreAll={async () => { for (const d of deleted) await restoreDevice(d.id as number); await loadDevices(); }}
            onDeleteAll={async () => { for (const d of deleted) await permanentDeleteDevice(d.id as number); await loadDevices(); }}
            permanentDeleteMessage={t("trash.confirmPermanent")}
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
            {t("devices.create")}
          </Button>
        </div>
      </div>

      {/* Search, Filter, Sort */}
      <div className="flex gap-3 items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder={t("devices.search")}
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
              {filterDeviceType !== "all" && (
                <span className="ml-1 px-1.5 py-0.5 text-[10px] font-medium rounded-full bg-primary text-primary-foreground">1</span>
              )}
            </button>
          }
        >
          <div className="space-y-3 min-w-[240px]">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">{t("devices.type")}</label>
              <CustomSelect
                value={filterDeviceType}
                onChange={setFilterDeviceType}
                options={[
                  { value: "all", label: t("backups.filterAll") },
                  ...DEVICE_TYPES.map((type) => ({
                    value: type,
                    label: t(`deviceTypes.${type}`, { defaultValue: type }),
                  })),
                  ...Array.from(new Set(devices.map((d) => d.type as string)))
                    .filter((type) => !(DEVICE_TYPES as readonly string[]).includes(type))
                    .map((type) => ({ value: type, label: type })),
                ]}
              />
            </div>
            {filterDeviceType !== "all" && (
              <button
                onClick={() => setFilterDeviceType("all")}
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
                  { value: "name", label: t("devices.name") },
                  { value: "type", label: t("devices.type") },
                  { value: "backups", label: t("devices.backupCount") },
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
                  await loadDevices();
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

      {devices.length === 0 && folderHook.viewMode === "flat" ? (
        <Card className="text-center py-12">
          <Monitor className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
          <p className="text-muted-foreground">{t("devices.noDevices")}</p>
        </Card>
      ) : folderHook.viewMode === "expanded" ? (
        <DevicesExpandedView
          sorted={sorted}
          folderHook={folderHook}
          view={view}
          editMode={editMode}
          selectedIds={selectedIds}
          openEdit={openEdit}
          setDeleteId={setDeleteId}
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
                counts.set(f.id, sorted.filter((d) => (d.folder_id as number | null) === f.id).length);
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
          <DevicesItemList
            items={sorted.filter((d) => !(d.folder_id as number | null))}
            view={view}
            editMode={editMode}
            selectedIds={selectedIds}
            openEdit={openEdit}
            setDeleteId={setDeleteId}
            t={t}
            makeDraggable={editMode ? makeDraggable : undefined}
            handleItemClick={handleItemClick}
          />
        </div>
      ) : (
        <DevicesItemList
          items={folderHook.viewMode === "folder"
            ? sorted.filter((d) => (d.folder_id as number | null) === folderHook.currentFolderId)
            : sorted
          }
          view={view}
          editMode={editMode}
          selectedIds={selectedIds}
          openEdit={openEdit}
          setDeleteId={setDeleteId}
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
        title={editing ? t("devices.edit") : t("devices.create")}
      >
        <div className="space-y-4">
          <div>
            <Label>{t("devices.name")}</Label>
            <Input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="MacBook Pro"
            />
          </div>
          <div>
            <Label>{t("devices.type")}</Label>
            <ComboSelect
              value={form.type}
              onChange={(val) => setForm({ ...form, type: val })}
              options={DEVICE_TYPES.map((type) => ({
                value: type,
                label: t(`deviceTypes.${type}`, { defaultValue: type }),
              }))}
              createLabel={t("devices.customType")}
            />
          </div>
          {(() => {
            const fields = getDeviceFields(form.type);
            return (
              <>
                {fields.includes("brand") && (
                  <div>
                    <Label>{t("devices.brand")}</Label>
                    <Input
                      value={form.brand}
                      onChange={(e) => setForm({ ...form, brand: e.target.value })}
                      placeholder="Apple, Samsung, Dell..."
                    />
                  </div>
                )}
                {fields.includes("model") && (
                  <div>
                    <Label>{t("devices.model")}</Label>
                    <Input
                      value={form.model}
                      onChange={(e) => setForm({ ...form, model: e.target.value })}
                      placeholder="MacBook Pro 16' M4 Max"
                    />
                  </div>
                )}
                {fields.includes("os") && (
                  <div>
                    <Label>{t("devices.os")}</Label>
                    <Input
                      value={form.os}
                      onChange={(e) => setForm({ ...form, os: e.target.value })}
                      placeholder="macOS 15, Windows 11, iOS 19..."
                    />
                  </div>
                )}
                {fields.includes("serial_number") && (
                  <div>
                    <Label>{t("devices.serialNumber")}</Label>
                    <Input
                      value={form.serial_number}
                      onChange={(e) => setForm({ ...form, serial_number: e.target.value })}
                      placeholder="C02X..."
                    />
                  </div>
                )}
                {fields.includes("ip_address") && (
                  <div>
                    <Label>{t("devices.ipAddress")}</Label>
                    <Input
                      value={form.ip_address}
                      onChange={(e) => setForm({ ...form, ip_address: e.target.value })}
                      placeholder="192.168.1.100"
                    />
                  </div>
                )}
                {fields.includes("provider") && (
                  <div>
                    <Label>{t("devices.provider")}</Label>
                    <Input
                      value={form.provider}
                      onChange={(e) => setForm({ ...form, provider: e.target.value })}
                      placeholder="Google, AWS, Dropbox..."
                    />
                  </div>
                )}
                {fields.includes("url") && (
                  <div>
                    <Label>{t("devices.url")}</Label>
                    <Input
                      value={form.url}
                      onChange={(e) => setForm({ ...form, url: e.target.value })}
                      placeholder="https://..."
                    />
                  </div>
                )}
                {fields.includes("storage_capacity") && (
                  <div>
                    <Label>{t("devices.storageCapacity")}</Label>
                    <div className="flex gap-2">
                      <Input
                        type="number"
                        value={form.storage_capacity_value}
                        onChange={(e) => setForm({ ...form, storage_capacity_value: e.target.value })}
                        placeholder="512"
                        className="flex-1"
                      />
                      <CustomSelect
                        className="w-24"
                        value={form.storage_capacity_unit}
                        onChange={(val) => setForm({ ...form, storage_capacity_unit: val })}
                        options={SIZE_UNITS.map((u) => ({ value: u.value, label: u.label }))}
                      />
                    </div>
                  </div>
                )}
              </>
            );
          })()}
          <div>
            <Label>{t("devices.notes")}</Label>
            <Textarea
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setModalOpen(false)}>
              {t("devices.cancel")}
            </Button>
            <Button onClick={handleSave} disabled={!form.name}>
              {t("devices.save")}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Delete confirm */}
      <ConfirmDialog
        open={deleteId !== null}
        onClose={() => setDeleteId(null)}
        onConfirm={() => deleteId && handleDelete(deleteId)}
        title={t("trash.moveToTrash")}
        message={t("trash.confirmSoftDelete")}
        confirmLabel={t("trash.moveToTrash")}
        cancelLabel={t("common.cancel")}
      />

      <ConfirmDialog
        open={bulkConfirmOpen}
        onClose={() => setBulkConfirmOpen(false)}
        onConfirm={async () => {
          for (const id of selectedIds) await softDeleteDevice(id);
          setSelectedIds(new Set());
          setBulkConfirmOpen(false);
          await loadDevices();
        }}
        title={t("trash.moveToTrash")}
        message={`${selectedIds.size} ${t("bulk.deleteConfirmDevices")}`}
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
        }}
      />
      <FolderModal
        open={renamingFolder !== null}
        onClose={() => setRenamingFolder(null)}
        onSave={async (name) => {
          if (renamingFolder) {
            await folderHook.renameFolder(renamingFolder.id, name);
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
            await loadDevices();
          }
        }}
      />
      <DragGhost visible={dragging} pos={ghostPos} size={ghostSize} offset={ghostOffset} label={dragLabel} count={dragIds.length} />
    </div>
  );
}

// --- Sub-components ---

function DevicesItemList({
  items,
  view,
  editMode,
  selectedIds,
  openEdit,
  setDeleteId,
  t,
  makeDraggable,
  handleItemClick,
}: {
  items: Array<Record<string, any>>;
  view: "grid" | "list";
  editMode: boolean;
  selectedIds: Set<number>;
  openEdit: (d: Record<string, any>) => void;
  setDeleteId: (id: number | null) => void;
  t: (key: string, opts?: any) => string;
  makeDraggable?: (itemId: number, selectedIds: Set<number>, label?: string) => Record<string, any>;
  handleItemClick: (id: number, e: React.MouseEvent) => void;
}) {
  if (items.length === 0) {
    return (
      <Card className="text-center py-12">
        <Monitor className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
        <p className="text-muted-foreground">{t("devices.noDevices")}</p>
      </Card>
    );
  }

  if (view === "list") {
    return (
      <div className="space-y-1.5">
        {items.map((d) => {
          const listCardContent = (
            <div className="flex items-center gap-4">
              <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center shrink-0">
                <Monitor className="w-4 h-4 text-muted-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-semibold truncate">{d.name as string}</h3>
                <p className="text-xs text-muted-foreground truncate">
                  {t(`deviceTypes.${d.type}`, { defaultValue: d.type as string })}
                  {d.brand ? ` · ${d.brand}` : ""}
                  {d.model ? ` · ${d.model}` : ""}
                  {d.os ? ` · ${d.os}` : ""}
                  {d.provider ? ` · ${d.provider}` : ""}
                </p>
              </div>
              <span className="text-xs text-muted-foreground shrink-0">{d.backup_count as number} {t("devices.backupCount")}</span>
              {editMode && (
                <div className="flex gap-1 shrink-0">
                  <button onClick={(e) => { e.stopPropagation(); openEdit(d); }} className="p-1 rounded hover:bg-muted"><Pencil className="w-3.5 h-3.5 text-muted-foreground" /></button>
                  <button onClick={(e) => { e.stopPropagation(); setDeleteId(d.id as number); }} className="p-1 rounded hover:bg-muted"><Trash2 className="w-3.5 h-3.5 text-muted-foreground" /></button>
                </div>
              )}
            </div>
          );
          return (
            <div
              key={d.id as number}
              className="flex items-center gap-2"
            >
              {editMode && (
                <GripVertical
                  className="w-4 h-4 text-muted-foreground/40 shrink-0 cursor-grab"
                  {...(makeDraggable ? makeDraggable(d.id as number, selectedIds, d.name as string) : {})}
                />
              )}
              {editMode && (
                <input
                  type="checkbox"
                  checked={selectedIds.has(d.id as number)}
                  onChange={() => {}}
                  onClick={(e) => e.stopPropagation()}
                  className="rounded shrink-0 pointer-events-none"
                />
              )}
              <Card
                className={cn("py-3 flex-1", editMode && "cursor-pointer", editMode && selectedIds.has(d.id as number) && "ring-2 ring-primary")}
                onClick={editMode ? (e) => handleItemClick(d.id as number, e) : undefined}
              >
                {listCardContent}
              </Card>
            </div>
          );
        })}
      </div>
    );
  }

  const gridCardContent = (d: Record<string, any>) => (
    <>
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center shrink-0">
            <Monitor className="w-5 h-5 text-muted-foreground" />
          </div>
          <div className="min-w-0">
            <h3 className="font-semibold text-sm truncate">{d.name as string}</h3>
            <p className="text-xs text-muted-foreground truncate">
              {t(`deviceTypes.${d.type}`, { defaultValue: d.type as string })}
            </p>
          </div>
        </div>
        {editMode && <div className="flex gap-1">
          <button onClick={(e) => { e.stopPropagation(); openEdit(d); }} className="p-1 rounded hover:bg-muted transition-colors">
            <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
          </button>
          <button onClick={(e) => { e.stopPropagation(); setDeleteId(d.id as number); }} className="p-1 rounded hover:bg-muted transition-colors">
            <Trash2 className="w-3.5 h-3.5 text-muted-foreground" />
          </button>
        </div>}
      </div>
      <div className="space-y-1 text-xs text-muted-foreground mt-3">
        {d.brand && (
          <div className="flex justify-between gap-2">
            <span className="shrink-0">{t("devices.brand")}</span>
            <span className="text-foreground truncate">{d.brand as string}</span>
          </div>
        )}
        {d.model && (
          <div className="flex justify-between gap-2">
            <span className="shrink-0">{t("devices.model")}</span>
            <span className="text-foreground truncate">{d.model as string}</span>
          </div>
        )}
        {d.os && (
          <div className="flex justify-between gap-2">
            <span className="shrink-0">{t("devices.os")}</span>
            <span className="text-foreground truncate">{d.os as string}</span>
          </div>
        )}
        {d.serial_number && (
          <div className="flex justify-between gap-2">
            <span className="shrink-0">{t("devices.serialNumber")}</span>
            <span className="text-foreground font-mono text-[10px] truncate">{d.serial_number as string}</span>
          </div>
        )}
        {d.ip_address && (
          <div className="flex justify-between gap-2">
            <span className="shrink-0">{t("devices.ipAddress")}</span>
            <span className="text-foreground font-mono text-[10px] truncate">{d.ip_address as string}</span>
          </div>
        )}
        {d.provider && (
          <div className="flex justify-between gap-2">
            <span className="shrink-0">{t("devices.provider")}</span>
            <span className="text-foreground truncate">{d.provider as string}</span>
          </div>
        )}
        {d.url && (
          <div className="flex justify-between gap-2">
            <span className="shrink-0">{t("devices.url")}</span>
            <span className="text-foreground truncate">{d.url as string}</span>
          </div>
        )}
        {d.storage_capacity && (
          <div className="flex justify-between gap-2">
            <span className="shrink-0">{t("devices.storageCapacity")}</span>
            <span className="text-foreground truncate">{d.storage_capacity as string}</span>
          </div>
        )}
        <div className="flex justify-between pt-1 border-t border-border mt-2">
          <span>{t("devices.backupCount")}</span>
          <span className="text-foreground font-medium">{d.backup_count as number}</span>
        </div>
      </div>
      {d.notes && (
        <p className="text-xs text-muted-foreground mt-2 pt-2 border-t border-border">
          {d.notes as string}
        </p>
      )}
    </>
  );

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {items.map((d) => (
        <div key={d.id as number} className="relative">
          {editMode && (
            <input
              type="checkbox"
              checked={selectedIds.has(d.id as number)}
              onChange={() => {}}
              onClick={(e) => e.stopPropagation()}
              className="absolute top-3 left-3 rounded z-10 pointer-events-none"
            />
          )}
          <Card
            className={cn(editMode && "cursor-pointer", editMode && selectedIds.has(d.id as number) && "ring-2 ring-primary")}
            onClick={editMode ? (e) => handleItemClick(d.id as number, e) : undefined}
          >
            {gridCardContent(d)}
          </Card>
        </div>
      ))}
    </div>
  );
}

function DevicesExpandedView({
  sorted,
  folderHook,
  view,
  editMode,
  selectedIds,
  openEdit,
  setDeleteId,
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
  openEdit: (d: Record<string, any>) => void;
  setDeleteId: (id: number | null) => void;
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
            <DevicesItemList
              items={group.items}
              view={view}
              editMode={editMode}
              selectedIds={selectedIds}
              openEdit={openEdit}
              setDeleteId={setDeleteId}
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
