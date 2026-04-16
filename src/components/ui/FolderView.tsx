import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Folder,
  FolderOpen,
  FolderPlus,
  ChevronRight,
  ChevronDown,
  Pencil,
  Trash2,
  FolderInput,
  LayoutList,
  FolderTree,
  Rows3,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Input, Label } from "@/components/ui/Input";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { cn } from "@/lib/cn";
import type { FolderViewMode } from "@/lib/types";
import type { FolderData } from "@/lib/useFolders";

// --- Folder View Mode Toggle ---

export function FolderToolbar({
  viewMode,
  onViewModeChange,
  onCreateFolder,
}: {
  viewMode: FolderViewMode;
  onViewModeChange: (mode: FolderViewMode) => void;
  onCreateFolder: () => void;
}) {
  const { t } = useTranslation();

  return (
    <div className="flex items-center gap-1.5">
      <div className="flex items-center gap-1 bg-muted rounded-lg p-0.5">
        <button
          onClick={() => onViewModeChange("flat")}
          className={cn(
            "p-1.5 rounded-md transition-colors",
            viewMode === "flat" ? "bg-card shadow-sm" : "hover:bg-card/50"
          )}
          title={t("folders.viewFlat")}
        >
          <LayoutList className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => onViewModeChange("folder")}
          className={cn(
            "p-1.5 rounded-md transition-colors",
            viewMode === "folder" ? "bg-card shadow-sm" : "hover:bg-card/50"
          )}
          title={t("folders.viewFolder")}
        >
          <FolderTree className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => onViewModeChange("expanded")}
          className={cn(
            "p-1.5 rounded-md transition-colors",
            viewMode === "expanded" ? "bg-card shadow-sm" : "hover:bg-card/50"
          )}
          title={t("folders.viewExpanded")}
        >
          <Rows3 className="w-3.5 h-3.5" />
        </button>
      </div>
      {viewMode !== "flat" && (
        <button
          onClick={onCreateFolder}
          className="p-1.5 rounded-md hover:bg-muted transition-colors"
          title={t("folders.create")}
        >
          <FolderPlus className="w-4 h-4 text-muted-foreground" />
        </button>
      )}
    </div>
  );
}

// --- Breadcrumb for folder navigation ---

export function FolderBreadcrumb({
  currentFolder,
  onNavigateBack,
  breadcrumbPath,
  onNavigateToFolder,
  dropRef,
  isDropOver,
}: {
  currentFolder: FolderData | null;
  onNavigateBack: () => void;
  breadcrumbPath?: Array<{ id: number; name: string }>;
  onNavigateToFolder?: (id: number | null) => void;
  dropRef?: (el: HTMLElement | null) => void;
  isDropOver?: boolean;
}) {
  const { t } = useTranslation();

  if (!currentFolder) return null;

  const path = breadcrumbPath ?? [];

  return (
    <div className="flex items-center gap-1.5 text-sm">
      <button
        ref={dropRef as any}
        onClick={onNavigateBack}
        className={cn(
          "px-2 py-1 rounded-md transition-colors",
          isDropOver
            ? "bg-primary/10 text-primary ring-2 ring-primary/40"
            : "text-muted-foreground hover:text-foreground"
        )}
      >
        {t("folders.allFolders")}
      </button>
      {path.length > 1
        ? path.map((segment, i) => {
            const isLast = i === path.length - 1;
            return (
              <span key={segment.id} className="flex items-center gap-1.5">
                <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
                {isLast ? (
                  <span className="font-medium flex items-center gap-1.5">
                    <FolderOpen className="w-4 h-4 text-primary" />
                    {segment.name}
                  </span>
                ) : (
                  <button
                    onClick={() => onNavigateToFolder?.(segment.id)}
                    className="text-muted-foreground hover:text-foreground transition-colors px-1 py-0.5 rounded-md"
                  >
                    {segment.name}
                  </button>
                )}
              </span>
            );
          })
        : (
          <>
            <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="font-medium flex items-center gap-1.5">
              <FolderOpen className="w-4 h-4 text-primary" />
              {currentFolder.name}
            </span>
          </>
        )}
    </div>
  );
}

// --- Folder Card (for folder view mode) ---

export function FolderCard({
  folder,
  itemCount,
  childCount,
  onOpen,
  onRename,
  onDelete,
  selected,
  onSelect,
  editMode,
  dropRef,
  isDropOver,
}: {
  folder: FolderData;
  itemCount: number;
  childCount?: number;
  onOpen: () => void;
  onRename: () => void;
  onDelete: () => void;
  selected?: boolean;
  onSelect?: (e: React.MouseEvent) => void;
  editMode: boolean;
  dropRef?: (el: HTMLElement | null) => void;
  isDropOver?: boolean;
}) {
  const { t } = useTranslation();

  return (
    <div
      ref={dropRef}
      className={cn(
        "bg-card rounded-xl border border-border p-5 transition-colors cursor-pointer",
        isDropOver
          ? "border-primary ring-2 ring-primary/40 bg-primary/5"
          : selected
            ? "ring-2 ring-primary"
            : "hover:border-primary/30"
      )}
      onClick={editMode && onSelect ? onSelect : editMode ? undefined : onOpen}
    >
      <div className="flex items-center gap-3">
        {editMode && (
          <input
            type="checkbox"
            checked={!!selected}
            onChange={() => {}}
            onClick={(e) => e.stopPropagation()}
            className="rounded shrink-0 pointer-events-none"
          />
        )}
        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
          <Folder className="w-5 h-5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-sm truncate">{folder.name}</h3>
          <p className="text-xs text-muted-foreground">
            {itemCount} {t("folders.items")}
            {(childCount ?? 0) > 0 && (
              <span className="ml-1.5 inline-flex items-center gap-0.5">
                <FolderTree className="w-3 h-3 inline" />
                {childCount}
              </span>
            )}
          </p>
        </div>
        {editMode && (
          <div className="flex gap-1 shrink-0">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onRename();
              }}
              className="p-1 rounded hover:bg-muted"
            >
              <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
              className="p-1 rounded hover:bg-muted"
            >
              <Trash2 className="w-3.5 h-3.5 text-muted-foreground" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// --- Folder Grid (shows folder cards in folder view root) ---

export function FolderGrid({
  folders,
  itemCounts,
  childCounts,
  onOpen,
  onRename,
  onDelete,
  selectedFolderIds,
  onFolderSelect,
  editMode,
  registerDropTarget,
  isDragOver,
}: {
  folders: FolderData[];
  itemCounts: Map<number, number>;
  childCounts?: Map<number, number>;
  onOpen: (folderId: number) => void;
  onRename: (folder: FolderData) => void;
  onDelete: (folder: FolderData) => void;
  selectedFolderIds?: Set<number>;
  onFolderSelect?: (id: number, e: React.MouseEvent) => void;
  editMode: boolean;
  registerDropTarget?: (folderId: number | null, el: HTMLElement | null) => void;
  isDragOver?: (folderId: number | null) => boolean;
}) {
  if (folders.length === 0) return null;

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 mb-6">
      {folders.map((folder) => (
        <FolderCard
          key={folder.id}
          folder={folder}
          itemCount={itemCounts.get(folder.id) || 0}
          childCount={childCounts?.get(folder.id)}
          onOpen={() => onOpen(folder.id)}
          onRename={() => onRename(folder)}
          onDelete={() => onDelete(folder)}
          selected={selectedFolderIds?.has(folder.id)}
          onSelect={onFolderSelect ? (e) => onFolderSelect(folder.id, e) : undefined}
          editMode={editMode}
          dropRef={registerDropTarget ? (el) => registerDropTarget(folder.id, el) : undefined}
          isDropOver={isDragOver?.(folder.id)}
        />
      ))}
    </div>
  );
}

// --- Collapsible Folder Section (for expanded mode) ---

export function FolderSection({
  folder,
  collapsed,
  onToggleCollapsed,
  onRename,
  onDelete,
  editMode,
  itemCount,
  children,
  dropRef,
  isDropOver,
}: {
  folder: FolderData | null;
  collapsed: boolean;
  onToggleCollapsed: () => void;
  onRename?: () => void;
  onDelete?: () => void;
  editMode: boolean;
  itemCount: number;
  children: React.ReactNode;
  dropRef?: (el: HTMLElement | null) => void;
  isDropOver?: boolean;
}) {
  const { t } = useTranslation();
  const isUnfiled = folder === null;

  return (
    <div className="space-y-2">
      <div
        ref={dropRef}
        className={cn(
          "flex items-center gap-2 rounded-md px-1 -mx-1 transition-colors",
          isDropOver && "bg-primary/10 ring-2 ring-primary/40"
        )}
      >
        <button
          onClick={onToggleCollapsed}
          className="flex items-center gap-2 hover:text-primary transition-colors"
        >
          {collapsed ? (
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="w-4 h-4 text-muted-foreground" />
          )}
          {isUnfiled ? (
            <LayoutList className="w-4 h-4 text-muted-foreground" />
          ) : (
            <Folder className="w-4 h-4 text-primary" />
          )}
          <h2 className="text-sm font-semibold text-muted-foreground">
            {isUnfiled ? t("folders.unfiled") : folder.name}
          </h2>
        </button>
        <span className="text-xs text-muted-foreground">({itemCount})</span>
        {editMode && !isUnfiled && (
          <div className="flex gap-1 ml-auto">
            <button
              onClick={onRename}
              className="p-1 rounded hover:bg-muted"
            >
              <Pencil className="w-3 h-3 text-muted-foreground" />
            </button>
            <button
              onClick={onDelete}
              className="p-1 rounded hover:bg-muted"
            >
              <Trash2 className="w-3 h-3 text-muted-foreground" />
            </button>
          </div>
        )}
      </div>
      {!collapsed && <div className="ml-6">{children}</div>}
    </div>
  );
}

// --- Move to Folder Menu ---

export function MoveToFolderMenu({
  folders,
  onMove,
  excludeFolderIds,
  onMoveFolder,
  className,
}: {
  folders: FolderData[];
  onMove: (folderId: number | null) => void;
  excludeFolderIds?: Set<number>;
  onMoveFolder?: (folderId: number | null) => void;
  className?: string;
}) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);

  // Build a nested tree for display with indentation
  function buildTree(parentId: number | null, depth: number): Array<{ folder: FolderData; depth: number }> {
    const result: Array<{ folder: FolderData; depth: number }> = [];
    for (const f of folders) {
      if (f.parent_id === parentId && !excludeFolderIds?.has(f.id)) {
        result.push({ folder: f, depth });
        result.push(...buildTree(f.id, depth + 1));
      }
    }
    return result;
  }

  const tree = buildTree(null, 0);

  const handleMove = (folderId: number | null) => {
    onMove(folderId);
    if (onMoveFolder) onMoveFolder(folderId);
    setOpen(false);
  };

  return (
    <div className={cn("relative", className)}>
      <Button
        size="sm"
        variant="secondary"
        onClick={() => setOpen(!open)}
      >
        <FolderInput className="w-3.5 h-3.5" />
        {t("folders.moveToFolder")}
      </Button>
      {open && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setOpen(false)}
          />
          <div className="absolute top-full mt-1 left-0 z-50 bg-card border border-border rounded-lg shadow-lg py-1 min-w-[180px] max-h-64 overflow-y-auto">
            <button
              className="w-full text-left px-3 py-1.5 text-sm hover:bg-muted transition-colors flex items-center gap-2"
              onClick={() => handleMove(null)}
            >
              <LayoutList className="w-3.5 h-3.5 text-muted-foreground" />
              {t("folders.unfiled")}
            </button>
            {tree.map(({ folder: f, depth }) => (
              <button
                key={f.id}
                className="w-full text-left py-1.5 text-sm hover:bg-muted transition-colors flex items-center gap-2"
                style={{ paddingLeft: `${12 + depth * 16}px` }}
                onClick={() => handleMove(f.id)}
              >
                <Folder className="w-3.5 h-3.5 text-primary" />
                {f.name}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// --- Create/Rename Folder Modal ---

export function FolderModal({
  open,
  onClose,
  onSave,
  initialName,
  isRename,
}: {
  open: boolean;
  onClose: () => void;
  onSave: (name: string) => void;
  initialName?: string;
  isRename?: boolean;
}) {
  const { t } = useTranslation();
  const [name, setName] = useState(initialName || "");

  // Reset name when modal opens
  useState(() => {
    if (open) setName(initialName || "");
  });

  return (
    <Modal
      open={open}
      onClose={onClose}
      onSave={() => {
        if (name.trim()) {
          onSave(name.trim());
          onClose();
        }
      }}
      title={isRename ? t("folders.rename") : t("folders.create")}
    >
      <div className="space-y-4">
        <div>
          <Label>{t("folders.folderName")}</Label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t("folders.folderName")}
            autoFocus
            onKeyDown={(e) => {
              if (e.key === "Enter" && name.trim()) {
                onSave(name.trim());
                onClose();
              }
            }}
          />
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="secondary" onClick={onClose}>
            {t("common.cancel")}
          </Button>
          <Button onClick={() => { if (name.trim()) { onSave(name.trim()); onClose(); } }} disabled={!name.trim()}>
            {t("common.save")}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

// --- Delete Folder Confirm ---

export function FolderDeleteConfirm({
  open,
  folderName,
  onClose,
  onConfirm,
}: {
  open: boolean;
  folderName: string;
  onClose: () => void;
  onConfirm: () => void;
}) {
  const { t } = useTranslation();

  return (
    <ConfirmDialog
      open={open}
      onClose={onClose}
      onConfirm={onConfirm}
      title={t("folders.deleteFolder")}
      message={t("folders.deleteConfirm", { name: folderName })}
      confirmLabel={t("common.delete")}
      cancelLabel={t("common.cancel")}
      variant="danger"
    />
  );
}

// --- Drag Ghost (floating element following cursor during drag) ---

export function DragGhost({
  visible,
  pos,
  size,
  offset,
  label,
  count,
}: {
  visible: boolean;
  pos: { x: number; y: number } | null;
  size?: { w: number; h: number } | null;
  offset?: { x: number; y: number };
  label: string;
  count?: number;
}) {
  if (!visible || !pos) return null;

  const ox = offset?.x ?? 0;
  const oy = offset?.y ?? 0;
  const w = size?.w ?? 200;

  return (
    <div
      className="fixed z-[9999] pointer-events-none"
      style={{ left: pos.x - ox, top: pos.y - oy }}
    >
      <div
        className="bg-card border-2 border-primary rounded-xl shadow-2xl px-4 py-3 opacity-90"
        style={{ width: w, maxWidth: "90vw" }}
      >
        <div className="flex items-center gap-2">
          <Folder className="w-4 h-4 text-primary shrink-0" />
          <span className="text-sm font-medium truncate">{label}</span>
        </div>
      </div>
      {(count ?? 0) > 1 && (
        <div className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center shadow-md">
          {count}
        </div>
      )}
    </div>
  );
}
