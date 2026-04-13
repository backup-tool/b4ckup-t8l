import { useState, useRef, useEffect } from "react";
import { ChevronDown, Plus } from "lucide-react";
import { cn } from "@/lib/cn";

export interface ComboOption {
  value: string;
  label: string;
}

interface ComboSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: ComboOption[];
  placeholder?: string;
  className?: string;
  createLabel?: string;
}

export function ComboSelect({
  value,
  onChange,
  options,
  placeholder = "Select or type...",
  className,
  createLabel = "Create",
}: ComboSelectProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const ref = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setQuery("");
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const filtered = query
    ? options.filter((o) =>
        o.label.toLowerCase().includes(query.toLowerCase())
      )
    : options;

  const exactMatch = options.some(
    (o) => o.label.toLowerCase() === query.toLowerCase()
  );
  const showCreate = query.trim() && !exactMatch;

  function handleSelect(val: string) {
    onChange(val);
    setOpen(false);
    setQuery("");
  }

  function handleCreate() {
    onChange(query.trim());
    setOpen(false);
    setQuery("");
  }

  const displayValue = options.find((o) => o.value === value)?.label || value;

  return (
    <div ref={ref} className={cn("relative", className)}>
      <div
        className={cn(
          "w-full flex items-center rounded-lg border border-input bg-background px-3 py-2 text-sm transition-colors",
          "hover:border-ring/40 focus-within:ring-2 focus-within:ring-ring/20 focus-within:border-ring"
        )}
        onClick={() => {
          setOpen(true);
          setTimeout(() => inputRef.current?.focus(), 0);
        }}
      >
        <input
          ref={inputRef}
          value={open ? query : displayValue}
          onChange={(e) => {
            setQuery(e.target.value);
            if (!open) setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          placeholder={value ? displayValue : placeholder}
          className="flex-1 bg-transparent outline-none placeholder:text-muted-foreground"
        />
        <ChevronDown
          className={cn(
            "w-4 h-4 text-muted-foreground shrink-0 ml-2 transition-transform",
            open && "rotate-180"
          )}
        />
      </div>

      {open && (
        <div className="absolute z-50 mt-1 w-full rounded-lg border border-border bg-card shadow-lg py-1 max-h-60 overflow-y-auto animate-in fade-in-0 zoom-in-95 duration-100">
          {filtered.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => handleSelect(option.value)}
              className={cn(
                "w-full flex items-center px-3 py-2 text-sm text-left transition-colors hover:bg-muted",
                option.value === value && "font-medium"
              )}
            >
              {option.label}
            </button>
          ))}
          {showCreate && (
            <button
              type="button"
              onClick={handleCreate}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-left text-primary hover:bg-muted transition-colors border-t border-border"
            >
              <Plus className="w-3.5 h-3.5" />
              {createLabel} "{query.trim()}"
            </button>
          )}
          {filtered.length === 0 && !showCreate && (
            <p className="px-3 py-2 text-sm text-muted-foreground">—</p>
          )}
        </div>
      )}
    </div>
  );
}
