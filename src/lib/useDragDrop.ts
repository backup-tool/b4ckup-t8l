import { useState, useCallback, useRef, useEffect } from "react";

/**
 * Mouse-based drag & drop for moving items into folders.
 * Uses mousedown/mousemove/mouseup instead of HTML5 drag API
 * because Tauri/WebKit on macOS blocks native drag events.
 */
export function useDragDrop(
  onDrop: (itemIds: number[], folderId: number | null) => Promise<void>
) {
  const [dragging, setDragging] = useState(false);
  const [dragIds, setDragIds] = useState<number[]>([]);
  const [dragOverFolderId, setDragOverFolderId] = useState<number | null | undefined>(undefined);
  const [ghostPos, setGhostPos] = useState<{ x: number; y: number } | null>(null);
  const [dragLabel, setDragLabel] = useState("");
  const dropTargets = useRef(new Map<number | "unfiled", HTMLElement>());

  // Global mouse handlers during drag
  useEffect(() => {
    if (!dragging) return;

    function onMouseMove(e: MouseEvent) {
      setGhostPos({ x: e.clientX, y: e.clientY });

      // Check which drop target we're over
      let foundTarget: number | null | undefined = undefined;
      for (const [key, el] of dropTargets.current.entries()) {
        const rect = el.getBoundingClientRect();
        if (
          e.clientX >= rect.left &&
          e.clientX <= rect.right &&
          e.clientY >= rect.top &&
          e.clientY <= rect.bottom
        ) {
          foundTarget = key === "unfiled" ? null : (key as number);
          break;
        }
      }
      setDragOverFolderId(foundTarget);
    }

    async function onMouseUp(e: MouseEvent) {
      // Check final drop target
      let finalTarget: number | null | undefined = undefined;
      for (const [key, el] of dropTargets.current.entries()) {
        const rect = el.getBoundingClientRect();
        if (
          e.clientX >= rect.left &&
          e.clientX <= rect.right &&
          e.clientY >= rect.top &&
          e.clientY <= rect.bottom
        ) {
          finalTarget = key === "unfiled" ? null : (key as number);
          break;
        }
      }

      if (finalTarget !== undefined && dragIds.length > 0) {
        await onDrop(dragIds, finalTarget);
      }

      setDragging(false);
      setDragIds([]);
      setDragOverFolderId(undefined);
      setGhostPos(null);
      setDragLabel("");
    }

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
  }, [dragging, dragIds, onDrop]);

  // Make an item draggable
  const makeDraggable = useCallback(
    (itemId: number, selectedIds: Set<number>, label?: string) => ({
      onMouseDown: (e: React.MouseEvent) => {
        // Only left click, ignore if on a button/input/link
        if (e.button !== 0) return;
        const tag = (e.target as HTMLElement).tagName;
        if (tag === "INPUT" || tag === "BUTTON" || tag === "A" || tag === "SELECT") return;
        // Check if target or parent is a link
        if ((e.target as HTMLElement).closest("a, button, input")) return;

        e.preventDefault();
        const ids =
          selectedIds.size > 0 && selectedIds.has(itemId)
            ? Array.from(selectedIds)
            : [itemId];
        setDragIds(ids);
        setDragging(true);
        setGhostPos({ x: e.clientX, y: e.clientY });
        setDragLabel(label || `${ids.length} item${ids.length > 1 ? "s" : ""}`);
      },
      style: { cursor: "grab", userSelect: "none" } as React.CSSProperties,
    }),
    []
  );

  // Register a folder element as a drop target
  const registerDropTarget = useCallback(
    (folderId: number | null, el: HTMLElement | null) => {
      const key = folderId === null ? "unfiled" : folderId;
      if (el) {
        dropTargets.current.set(key as any, el);
      } else {
        dropTargets.current.delete(key as any);
      }
    },
    []
  );

  const isDragOver = useCallback(
    (folderId: number | null) => {
      if (!dragging) return false;
      if (folderId === null) return dragOverFolderId === null;
      return dragOverFolderId === folderId;
    },
    [dragging, dragOverFolderId]
  );

  return {
    makeDraggable,
    registerDropTarget,
    isDragOver,
    dragging,
    ghostPos,
    dragLabel,
    dragIds,
  };
}
