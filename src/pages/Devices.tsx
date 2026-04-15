import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Plus, Pencil, Trash2, Monitor, GripVertical } from "lucide-react";
import { ViewToggle } from "@/components/ui/ViewToggle";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Input, Textarea, Label } from "@/components/ui/Input";
import { CustomSelect } from "@/components/ui/CustomSelect";
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
import { DEVICE_TYPES } from "@/lib/types";
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
  const [view, setView] = useState<"grid" | "list">("grid");
  const [editMode, setEditMode] = useState(false);
  const [sortField, setSortField] = useState("name");
  const [sortDir, setSortDir] = useState("asc");
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  // Folder support
  const folderHook = useFolders("device");
  const [folderModalOpen, setFolderModalOpen] = useState(false);
  const [renamingFolder, setRenamingFolder] = useState<FolderData | null>(null);
  const [deletingFolder, setDeletingFolder] = useState<FolderData | null>(null);
  const [unfiledCollapsed, setUnfiledCollapsed] = useState(false);

  // Drag & drop for folder moves
  const { makeDraggable, registerDropTarget, isDragOver, dragging, ghostPos, dragLabel } = useDragDrop(
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
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

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

  function openCreate() {
    setEditing(null);
    setForm({ name: "", type: "laptop", os: "", model: "", serial_number: "", notes: "" });
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
    });
    setModalOpen(true);
  }

  async function handleSave() {
    if (editing) {
      await updateDevice(editing.id as number, {
        name: form.name,
        type: form.type,
        os: form.os || null,
        model: form.model || null,
        serial_number: form.serial_number || null,
        notes: form.notes || null,
      });
    } else {
      await createDevice(form.name, form.type);
      // Get the device we just created and update it with extra fields
      const all = await getDeviceWithBackupCount();
      const created = all.find((d) => d.name === form.name);
      if (created && (form.os || form.model || form.serial_number || form.notes)) {
        await updateDevice(created.id as number, {
          name: form.name,
          type: form.type,
          os: form.os || null,
          model: form.model || null,
          serial_number: form.serial_number || null,
          notes: form.notes || null,
        });
      }
    }
    setModalOpen(false);
    await loadDevices();
  }

  async function handleDelete(id: number) {
    await softDeleteDevice(id);
    await loadDevices();
  }


  const sorted = [...devices].sort((a, b) => {
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
          <ViewToggle view={view} onViewChange={setView} editMode={editMode} onEditModeChange={(v) => { setEditMode(v); if (!v) setSelectedIds(new Set()); }} />
          <FolderToolbar
            viewMode={folderHook.viewMode}
            onViewModeChange={folderHook.setViewMode}
            onCreateFolder={() => setFolderModalOpen(true)}
          />
          <CustomSelect
            className="w-32"
            value={sortField}
            onChange={setSortField}
            options={[
              { value: "name", label: t("devices.name") },
              { value: "type", label: t("devices.type") },
              { value: "backups", label: t("devices.backupCount") },
            ]}
          />
          <CustomSelect
            className="w-20"
            value={sortDir}
            onChange={setSortDir}
            options={[
              { value: "asc", label: "↑" },
              { value: "desc", label: "↓" },
            ]}
          />
        </div>
        <div className="flex items-center gap-2">
          {editMode && <TrashSection
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
          />}
          <Button onClick={openCreate}>
            <Plus className="w-4 h-4" />
            {t("devices.create")}
          </Button>
        </div>
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
          setSelectedIds={setSelectedIds}
          openEdit={openEdit}
          setDeleteId={setDeleteId}
          setRenamingFolder={setRenamingFolder}
          setDeletingFolder={setDeletingFolder}
          unfiledCollapsed={unfiledCollapsed}
          setUnfiledCollapsed={setUnfiledCollapsed}
          t={t}
          makeDraggable={makeDraggable}
          registerDropTarget={registerDropTarget}
          isDragOver={isDragOver}
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
            setSelectedIds={setSelectedIds}
            openEdit={openEdit}
            setDeleteId={setDeleteId}
            t={t}
            makeDraggable={makeDraggable}
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
          setSelectedIds={setSelectedIds}
          openEdit={openEdit}
          setDeleteId={setDeleteId}
          t={t}
          makeDraggable={folderHook.viewMode !== "flat" ? makeDraggable : undefined}
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
            <CustomSelect
              value={form.type}
              onChange={(val) => setForm({ ...form, type: val })}
              options={DEVICE_TYPES.map((type) => ({
                value: type,
                label: t(`deviceTypes.${type}`, { defaultValue: type }),
              }))}
            />
          </div>
          <div>
            <Label>{t("devices.os")}</Label>
            <Input
              value={form.os}
              onChange={(e) => setForm({ ...form, os: e.target.value })}
              placeholder="macOS 15, Windows 11, iOS 19..."
            />
          </div>
          <div>
            <Label>{t("devices.model")}</Label>
            <Input
              value={form.model}
              onChange={(e) => setForm({ ...form, model: e.target.value })}
              placeholder="MacBook Pro 16' M4 Max"
            />
          </div>
          <div>
            <Label>{t("devices.serialNumber")}</Label>
            <Input
              value={form.serial_number}
              onChange={(e) => setForm({ ...form, serial_number: e.target.value })}
              placeholder="C02X..."
            />
          </div>
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
      <DragGhost visible={dragging} pos={ghostPos} label={dragLabel} />
    </div>
  );
}

// --- Sub-components ---

function DevicesItemList({
  items,
  view,
  editMode,
  selectedIds,
  setSelectedIds,
  openEdit,
  setDeleteId,
  t,
  makeDraggable,
}: {
  items: Array<Record<string, any>>;
  view: "grid" | "list";
  editMode: boolean;
  selectedIds: Set<number>;
  setSelectedIds: (s: Set<number>) => void;
  openEdit: (d: Record<string, any>) => void;
  setDeleteId: (id: number | null) => void;
  t: (key: string, opts?: any) => string;
  makeDraggable?: (itemId: number, selectedIds: Set<number>) => Record<string, any>;
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
        {items.map((d) => (
          <div
            key={d.id as number}
            className="flex items-center gap-2"
            {...(makeDraggable ? makeDraggable(d.id as number, selectedIds) : {})}
          >
            {makeDraggable && (
              <GripVertical className="w-4 h-4 text-muted-foreground/40 shrink-0 cursor-grab" />
            )}
            {editMode && (
              <input
                type="checkbox"
                checked={selectedIds.has(d.id as number)}
                onChange={(e) => {
                  const next = new Set(selectedIds);
                  if (e.target.checked) next.add(d.id as number);
                  else next.delete(d.id as number);
                  setSelectedIds(next);
                }}
                className="rounded shrink-0"
              />
            )}
            <Card className="py-3 flex-1">
              <div className="flex items-center gap-4">
                <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center shrink-0">
                  <Monitor className="w-4 h-4 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-semibold truncate">{d.name as string}</h3>
                  <p className="text-xs text-muted-foreground truncate">
                    {t(`deviceTypes.${d.type}`, { defaultValue: d.type as string })}
                    {d.os ? ` \u00b7 ${d.os}` : ""}
                    {d.model ? ` \u00b7 ${d.model}` : ""}
                  </p>
                </div>
                <span className="text-xs text-muted-foreground shrink-0">{d.backup_count as number} {t("devices.backupCount")}</span>
                {editMode && (
                  <div className="flex gap-1 shrink-0">
                    <button onClick={() => openEdit(d)} className="p-1 rounded hover:bg-muted"><Pencil className="w-3.5 h-3.5 text-muted-foreground" /></button>
                    <button onClick={() => setDeleteId(d.id as number)} className="p-1 rounded hover:bg-muted"><Trash2 className="w-3.5 h-3.5 text-muted-foreground" /></button>
                  </div>
                )}
              </div>
            </Card>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {items.map((d) => (
        <div
          key={d.id as number}
          className="relative"
          {...(makeDraggable ? makeDraggable(d.id as number, selectedIds) : {})}
        >
          {editMode && (
            <input
              type="checkbox"
              checked={selectedIds.has(d.id as number)}
              onChange={(e) => {
                const next = new Set(selectedIds);
                if (e.target.checked) next.add(d.id as number);
                else next.delete(d.id as number);
                setSelectedIds(next);
              }}
              className="absolute top-3 left-3 rounded z-10"
            />
          )}
          <Card>
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
                <button onClick={() => openEdit(d)} className="p-1 rounded hover:bg-muted transition-colors">
                  <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
                </button>
                <button onClick={() => setDeleteId(d.id as number)} className="p-1 rounded hover:bg-muted transition-colors">
                  <Trash2 className="w-3.5 h-3.5 text-muted-foreground" />
                </button>
              </div>}
            </div>
            <div className="space-y-1 text-xs text-muted-foreground mt-3">
              {d.os && (
                <div className="flex justify-between gap-2">
                  <span className="shrink-0">{t("devices.os")}</span>
                  <span className="text-foreground truncate">{d.os as string}</span>
                </div>
              )}
              {d.model && (
                <div className="flex justify-between gap-2">
                  <span className="shrink-0">{t("devices.model")}</span>
                  <span className="text-foreground truncate">{d.model as string}</span>
                </div>
              )}
              {d.serial_number && (
                <div className="flex justify-between gap-2">
                  <span className="shrink-0">{t("devices.serialNumber")}</span>
                  <span className="text-foreground font-mono text-[10px] truncate">{d.serial_number as string}</span>
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
  setSelectedIds,
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
}: {
  sorted: Array<Record<string, any>>;
  folderHook: ReturnType<typeof useFolders>;
  view: "grid" | "list";
  editMode: boolean;
  selectedIds: Set<number>;
  setSelectedIds: (s: Set<number>) => void;
  openEdit: (d: Record<string, any>) => void;
  setDeleteId: (id: number | null) => void;
  setRenamingFolder: (f: FolderData | null) => void;
  setDeletingFolder: (f: FolderData | null) => void;
  unfiledCollapsed: boolean;
  setUnfiledCollapsed: (v: boolean) => void;
  t: (key: string, opts?: any) => string;
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
            <DevicesItemList
              items={group.items}
              view={view}
              editMode={editMode}
              selectedIds={selectedIds}
              setSelectedIds={setSelectedIds}
              openEdit={openEdit}
              setDeleteId={setDeleteId}
              t={t}
              makeDraggable={makeDraggable}
            />
          </FolderSection>
        );
      })}
    </div>
  );
}
