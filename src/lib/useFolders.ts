import { useState, useEffect, useCallback, useMemo } from "react";
import {
  getFolders,
  createFolder,
  updateFolder,
  softDeleteFolder,
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
  created_at: string;
}

export interface FolderGroup<T> {
  folder: FolderData | null; // null = unfiled
  items: T[];
}

export function useFolders(entityType: FolderEntityType, refreshKey?: number) {
  const storageKey = `folder-view-mode-${entityType}`;
  const [folders, setFolders] = useState<FolderData[]>([]);
  const [viewMode, setViewModeState] = useState<FolderViewMode>(() => {
    return (localStorage.getItem(storageKey) as FolderViewMode) || "flat";
  });
  const [currentFolderId, setCurrentFolderId] = useState<number | null>(null);

  const setViewMode = useCallback(
    (mode: FolderViewMode) => {
      setViewModeState(mode);
      localStorage.setItem(storageKey, mode);
      // Reset navigation when switching modes
      if (mode !== "folder") setCurrentFolderId(null);
    },
    [storageKey]
  );

  const loadFolders = useCallback(async () => {
    try {
      const rows = await getFolders(entityType);
      setFolders(
        rows.map((r) => ({
          id: r.id as number,
          name: r.name as string,
          entity_type: r.entity_type as string,
          sort_order: r.sort_order as number,
          collapsed: !!(r.collapsed as number),
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

  const handleCreateFolder = useCallback(
    async (name: string) => {
      await createFolder(name, entityType);
      await loadFolders();
    },
    [entityType, loadFolders]
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

    // Add folder groups
    for (const folder of folders) {
      groups.push({
        folder,
        items: items.filter((item) => (item.folder_id as number | null) === folder.id),
      });
    }

    // Add unfiled group
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
    // In folder root view (currentFolderId === null), show unfiled items
    if (viewMode === "folder") {
      return items.filter((item) => !(item.folder_id as number | null));
    }
    // expanded mode: all items (grouped by folder in UI)
    return items;
  }

  return {
    folders,
    viewMode,
    setViewMode,
    currentFolderId,
    currentFolder,
    navigateToFolder,
    createFolder: handleCreateFolder,
    renameFolder: handleRenameFolder,
    deleteFolder: handleDeleteFolder,
    toggleCollapsed: handleToggleCollapsed,
    moveItem: handleMoveItem,
    moveItems: handleMoveItems,
    groupItemsByFolder,
    getVisibleItems,
    loadFolders,
  };
}
