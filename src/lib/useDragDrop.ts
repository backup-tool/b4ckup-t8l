import { useState, useCallback, useRef, useEffect, type CSSProperties } from "react";

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
  const [ghostSize, setGhostSize] = useState<{ w: number; h: number } | null>(null);
  const [ghostOffset, setGhostOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [dragLabel, setDragLabel] = useState("");
  const dropTargets = useRef(new Map<number | "unfiled", HTMLElement>());
  const dragSourceEl = useRef<HTMLElement | null>(null);

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

      // Restore source element
      if (dragSourceEl.current) {
        dragSourceEl.current.style.opacity = "1";
        dragSourceEl.current = null;
      }

      setDragging(false);
      setDragIds([]);
      setDragOverFolderId(undefined);
      setGhostPos(null);
      setGhostSize(null);
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
        if (e.button !== 0) return;
        const tag = (e.target as HTMLElement).tagName;
        // Only block drag on actual interactive controls, not links wrapping content
        if (tag === "INPUT" || tag === "SELECT" || tag === "TEXTAREA") return;
        if ((e.target as HTMLElement).closest("button")) return;

        e.preventDefault();
        const ids =
          selectedIds.size > 0 && selectedIds.has(itemId)
            ? Array.from(selectedIds)
            : [itemId];

        // Capture the dragged element's position for the ghost
        const el = e.currentTarget as HTMLElement;
        const rect = el.getBoundingClientRect();
        dragSourceEl.current = el;

        setDragIds(ids);
        setDragging(true);
        setGhostPos({ x: e.clientX, y: e.clientY });
        setGhostSize({ w: rect.width, h: Math.min(rect.height, 80) });
        setGhostOffset({ x: e.clientX - rect.left, y: e.clientY - rect.top });
        setDragLabel(label || `${ids.length} item${ids.length > 1 ? "s" : ""}`);

        // Dim the source element
        el.style.opacity = "0.3";
        el.style.transition = "opacity 0.15s";
      },
      style: { userSelect: "none" } as CSSProperties,
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
    ghostSize,
    ghostOffset,
    dragLabel,
    dragIds,
  };
}
