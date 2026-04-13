import { create } from "zustand";

interface AppState {
  sidebarCollapsed: boolean;
  toggleSidebar: () => void;
  refreshKey: number;
  triggerRefresh: () => void;
}

export const useAppStore = create<AppState>((set) => ({
  sidebarCollapsed: false,
  toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
  refreshKey: 0,
  triggerRefresh: () => set((s) => ({ refreshKey: s.refreshKey + 1 })),
}));

// --- Theme ---

type ThemeMode = "light" | "dark" | "system";
type AccentColor = "b4ckup" | "default" | "blue" | "purple" | "green" | "orange" | "pink" | "red" | "teal";

interface ThemeState {
  mode: ThemeMode;
  accent: AccentColor;
  setMode: (mode: ThemeMode) => void;
  setAccent: (accent: AccentColor) => void;
}

function applyTheme(mode: ThemeMode, accent: AccentColor) {
  const root = document.documentElement;

  // Resolve effective mode
  let effective: "light" | "dark";
  if (mode === "system") {
    effective = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  } else {
    effective = mode;
  }

  root.classList.toggle("dark", effective === "dark");
  root.setAttribute("data-accent", accent);

  localStorage.setItem("theme-mode", mode);
  localStorage.setItem("theme-accent", accent);
}

const savedMode = (localStorage.getItem("theme-mode") as ThemeMode) || "system";
const savedAccent = (localStorage.getItem("theme-accent") as AccentColor) || "b4ckup";

// Apply on load
applyTheme(savedMode, savedAccent);

// Listen for system theme changes
window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => {
  const currentMode = localStorage.getItem("theme-mode") as ThemeMode || "system";
  if (currentMode === "system") {
    const accent = (localStorage.getItem("theme-accent") as AccentColor) || "b4ckup";
    applyTheme("system", accent);
  }
});

export const useThemeStore = create<ThemeState>((set) => ({
  mode: savedMode,
  accent: savedAccent,
  setMode: (mode) => {
    set((s) => {
      applyTheme(mode, s.accent);
      return { mode };
    });
  },
  setAccent: (accent) => {
    set((s) => {
      applyTheme(s.mode, accent);
      return { accent };
    });
  },
}));
