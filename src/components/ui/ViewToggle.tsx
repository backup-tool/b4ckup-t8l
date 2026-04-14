import { LayoutGrid, List, Pencil } from "lucide-react";
import { cn } from "@/lib/cn";

export function ViewToggle({
  view,
  onViewChange,
  editMode,
  onEditModeChange,
}: {
  view: "grid" | "list";
  onViewChange: (v: "grid" | "list") => void;
  editMode: boolean;
  onEditModeChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center gap-1 bg-muted rounded-lg p-0.5">
      <button
        onClick={() => onViewChange("list")}
        className={cn(
          "p-1.5 rounded-md transition-colors",
          view === "list" ? "bg-card shadow-sm" : "hover:bg-card/50"
        )}
        title="List"
      >
        <List className="w-3.5 h-3.5" />
      </button>
      <button
        onClick={() => onViewChange("grid")}
        className={cn(
          "p-1.5 rounded-md transition-colors",
          view === "grid" ? "bg-card shadow-sm" : "hover:bg-card/50"
        )}
        title="Grid"
      >
        <LayoutGrid className="w-3.5 h-3.5" />
      </button>
      <div className="w-px h-4 bg-border mx-0.5" />
      <button
        onClick={() => onEditModeChange(!editMode)}
        className={cn(
          "p-1.5 rounded-md transition-colors",
          editMode ? "bg-primary text-primary-foreground" : "hover:bg-card/50"
        )}
        title="Edit"
      >
        <Pencil className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
