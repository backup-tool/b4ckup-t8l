import { LayoutGrid, List } from "lucide-react";
import { cn } from "@/lib/cn";

export function ViewToggle({
  view,
  onViewChange,
}: {
  view: "grid" | "list";
  onViewChange: (v: "grid" | "list") => void;
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
    </div>
  );
}
