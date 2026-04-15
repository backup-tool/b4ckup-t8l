import { useState, useCallback, DragEvent } from "react";

const DRAG_DATA_KEY = "application/x-folder-item-ids";

/**
 * Shared drag & drop logic for moving items into/out of folders.
 * Items set their IDs on dragStart; folder targets read them on drop.
 */
export function useDragDrop(
  onDrop: (itemIds: number[], folderId: number | null) => Promise<void>
) {
  const [dragOverFolderId, setDragOverFolderId] = useState<
    number | null | "unfiled" | undefined
  >(undefined);

  // --- Draggable item handlers ---

  const makeDraggable = useCallback(
    (itemId: number, selectedIds: Set<number>) => ({
      draggable: true,
      onDragStart: (e: DragEvent) => {
        const ids =
          selectedIds.size > 0 && selectedIds.has(itemId)
            ? Array.from(selectedIds)
            : [itemId];
        e.dataTransfer.setData(DRAG_DATA_KEY, JSON.stringify(ids));
        e.dataTransfer.effectAllowed = "move";
        // Dim the dragged element
        const el = e.currentTarget as HTMLElement;
        requestAnimationFrame(() => { el.style.opacity = "0.4"; });
      },
      onDragEnd: (e: DragEvent) => {
        const el = e.currentTarget as HTMLElement;
        el.style.opacity = "1";
      },
    }),
    []
  );

  // --- Drop target handlers ---

  const makeDropTarget = useCallback(
    (folderId: number | null) => {
      const key = folderId === null ? "unfiled" : folderId;
      return {
        onDragOver: (e: DragEvent) => {
          e.preventDefault();
          e.dataTransfer.dropEffect = "move";
          setDragOverFolderId(key as any);
        },
        onDragLeave: (e: DragEvent) => {
          // Only clear if we're actually leaving the element (not entering a child)
          const related = e.relatedTarget as Node | null;
          if (!e.currentTarget.contains(related)) {
            setDragOverFolderId(undefined);
          }
        },
        onDrop: async (e: DragEvent) => {
          e.preventDefault();
          setDragOverFolderId(undefined);
          const raw = e.dataTransfer.getData(DRAG_DATA_KEY);
          if (!raw) return;
          try {
            const ids: number[] = JSON.parse(raw);
            if (ids.length > 0) {
              await onDrop(ids, folderId);
            }
          } catch {
            // invalid data, ignore
          }
        },
      };
    },
    [onDrop]
  );

  const isDragOver = useCallback(
    (folderId: number | null) => {
      if (folderId === null) return dragOverFolderId === "unfiled";
      return dragOverFolderId === folderId;
    },
    [dragOverFolderId]
  );

  return { makeDraggable, makeDropTarget, isDragOver, dragOverFolderId };
}
