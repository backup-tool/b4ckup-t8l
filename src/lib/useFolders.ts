import { useState, useEffect, useCallback, useMemo } from "react";
import {
  getFolders,
  createFolder,
  updateFolder,
  softDeleteFolder,
  restoreFolder,
  permanentDeleteFolder,
  getDeletedFolders,
  moveFolderToParent,
  updateFolderCollapsed,
  moveItemToFolder,
  moveItemsToFolder,
} from "@/lib/db";
import type { FolderEntityType, FolderViewMode } from "@/lib/types";

export interface FolderData {
  id: number;
  name: string;
  entity_type: string;
  sort_order: number;
  collapsed: boolean;
  parent_id: number | null;
  created_at: string;
}

export interface FolderGroup<T> {
  folder: FolderData | null; // null = unfiled
  items: T[];
}

export function useFolders(entityType: FolderEntityType, refreshKey?: number) {
  const storageKey = `folder-view-mode-${entityType}`;
  const [folders, setFolders] = useState<FolderData[]>([]);
  const [deletedFolders, setDeletedFolders] = useState<FolderData[]>([]);
  const [viewMode, setViewModeState] = useState<FolderViewMode>(() => {
    return (localStorage.getItem(storageKey) as FolderViewMode) || "flat";
  });
  const [currentFolderId, setCurrentFolderId] = useState<number | null>(null);

  const setViewMode = useCallback(
    (mode: FolderViewMode) => {
      setViewModeState(mode);
      localStorage.setItem(storageKey, mode);
      if (mode !== "folder") setCurrentFolderId(null);
    },
    [storageKey]
  );

  const loadFolders = useCallback(async () => {
    try {
      const [rows, deleted] = await Promise.all([
        getFolders(entityType),
        getDeletedFolders(entityType),
      ]);
      setFolders(
        rows.map((r) => ({
          id: r.id as number,
          name: r.name as string,
          entity_type: r.entity_type as string,
          sort_order: r.sort_order as number,
          collapsed: !!(r.collapsed as number),
          parent_id: (r.parent_id as number | null) ?? null,
          created_at: r.created_at as string,
        }))
      );
      setDeletedFolders(
        deleted.map((r) => ({
          id: r.id as number,
          name: r.name as string,
          entity_type: r.entity_type as string,
          sort_order: r.sort_order as number,
          collapsed: false,
          parent_id: (r.parent_id as number | null) ?? null,
          created_at: r.created_at as string,
        }))
      );
    } catch (err) {
      console.error("Failed to load folders:", err);
    }
  }, [entityType]);

  useEffect(() => {
    loadFolders();
  }, [loadFolders, refreshKey]);

  // Get root folders (no parent) for current context
  const rootFolders = useMemo(
    () => folders.filter((f) => f.parent_id === currentFolderId),
    [folders, currentFolderId]
  );

  // Get child folders of a specific parent
  const getChildFolders = useCallback(
    (parentId: number | null) => folders.filter((f) => f.parent_id === parentId),
    [folders]
  );

  // Get full breadcrumb path for current folder
  const breadcrumbPath = useMemo(() => {
    const path: FolderData[] = [];
    let id = currentFolderId;
    while (id != null) {
      const folder = folders.find((f) => f.id === id);
      if (!folder) break;
      path.unshift(folder);
      id = folder.parent_id;
    }
    return path;
  }, [folders, currentFolderId]);

  // Check if a folder is an ancestor of another (to prevent circular moves)
  const isAncestor = useCallback(
    (folderId: number, potentialChildId: number): boolean => {
      let id: number | null = potentialChildId;
      while (id != null) {
        if (id === folderId) return true;
        const folder = folders.find((f) => f.id === id);
        id = folder?.parent_id ?? null;
      }
      return false;
    },
    [folders]
  );

  const handleCreateFolder = useCallback(
    async (name: string, parentId?: number | null) => {
      await createFolder(name, entityType, parentId ?? currentFolderId);
      await loadFolders();
    },
    [entityType, currentFolderId, loadFolders]
  );

  const handleRenameFolder = useCallback(
    async (id: number, name: string) => {
      await updateFolder(id, name);
      await loadFolders();
    },
    [loadFolders]
  );

  const handleDeleteFolder = useCallback(
    async (id: number) => {
      await softDeleteFolder(id);
      if (currentFolderId === id) setCurrentFolderId(null);
      await loadFolders();
    },
    [currentFolderId, loadFolders]
  );

  const handleRestoreFolder = useCallback(
    async (id: number) => {
      await restoreFolder(id);
      await loadFolders();
    },
    [loadFolders]
  );

  const handlePermanentDeleteFolder = useCallback(
    async (id: number) => {
      await permanentDeleteFolder(id);
      await loadFolders();
    },
    [loadFolders]
  );

  const handleMoveFolder = useCallback(
    async (folderId: number, targetParentId: number | null) => {
      // Prevent moving a folder into itself or its own descendants
      if (targetParentId !== null && (folderId === targetParentId || isAncestor(folderId, targetParentId))) {
        return;
      }
      await moveFolderToParent(folderId, targetParentId);
      await loadFolders();
    },
    [isAncestor, loadFolders]
  );

  const handleToggleCollapsed = useCallback(
    async (id: number) => {
      const folder = folders.find((f) => f.id === id);
      if (folder) {
        await updateFolderCollapsed(id, !folder.collapsed);
        await loadFolders();
      }
    },
    [folders, loadFolders]
  );

  const handleMoveItem = useCallback(
    async (itemId: number, folderId: number | null) => {
      await moveItemToFolder(entityType, itemId, folderId);
    },
    [entityType]
  );

  const handleMoveItems = useCallback(
    async (itemIds: number[], folderId: number | null) => {
      await moveItemsToFolder(entityType, itemIds, folderId);
    },
    [entityType]
  );

  const navigateToFolder = useCallback((folderId: number | null) => {
    setCurrentFolderId(folderId);
  }, []);

  const currentFolder = useMemo(
    () => folders.find((f) => f.id === currentFolderId) || null,
    [folders, currentFolderId]
  );

  function groupItemsByFolder<T extends Record<string, any>>(items: T[]): FolderGroup<T>[] {
    const groups: FolderGroup<T>[] = [];

    for (const folder of folders) {
      groups.push({
        folder,
        items: items.filter((item) => (item.folder_id as number | null) === folder.id),
      });
    }

    const unfiled = items.filter(
      (item) => !(item.folder_id as number | null)
    );
    if (unfiled.length > 0 || folders.length > 0) {
      groups.push({ folder: null, items: unfiled });
    }

    return groups;
  }

  function getVisibleItems<T extends Record<string, any>>(items: T[]): T[] {
    if (viewMode === "flat") return items;
    if (viewMode === "folder" && currentFolderId !== null) {
      return items.filter((item) => (item.folder_id as number | null) === currentFolderId);
    }
    if (viewMode === "folder") {
      return items.filter((item) => !(item.folder_id as number | null));
    }
    return items;
  }

  return {
    folders,
    deletedFolders,
    rootFolders,
    viewMode,
    setViewMode,
    currentFolderId,
    currentFolder,
    breadcrumbPath,
    navigateToFolder,
    getChildFolders,
    isAncestor,
    createFolder: handleCreateFolder,
    renameFolder: handleRenameFolder,
    deleteFolder: handleDeleteFolder,
    restoreFolder: handleRestoreFolder,
    permanentDeleteFolder: handlePermanentDeleteFolder,
    moveFolder: handleMoveFolder,
    toggleCollapsed: handleToggleCollapsed,
    moveItem: handleMoveItem,
    moveItems: handleMoveItems,
    groupItemsByFolder,
    getVisibleItems,
    loadFolders,
  };
}
