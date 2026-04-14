import { NavLink, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import {
  LayoutDashboard,
  HardDrive,
  Database,
  Monitor,
  Grid3X3,
  Clock,
  BarChart3,
  CalendarDays,
  Settings,
  ChevronLeft,
} from "lucide-react";
import { useAppStore } from "@/lib/store";
import { cn } from "@/lib/cn";
import { GlobalSearch } from "./GlobalSearch";

const navItems = [
  { to: "/dashboard", icon: LayoutDashboard, label: "nav.dashboard" },
  { to: "/backups", icon: Database, label: "nav.backups" },
  { to: "/media", icon: HardDrive, label: "nav.media" },
  { to: "/devices", icon: Monitor, label: "nav.devices" },
  { to: "/matrix", icon: Grid3X3, label: "nav.matrix" },
  { to: "/history", icon: Clock, label: "nav.history" },
  { to: "/statistics", icon: BarChart3, label: "nav.statistics" },
  { to: "/calendar", icon: CalendarDays, label: "nav.calendar" },
  { to: "/settings", icon: Settings, label: "nav.settings" },
];

export function Sidebar() {
  const { t } = useTranslation();
  const collapsed = useAppStore((s) => s.sidebarCollapsed);
  const toggle = useAppStore((s) => s.toggleSidebar);
  const navigate = useNavigate();

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey)) return;
      const idx = parseInt(e.key) - 1;
      if (idx >= 0 && idx < navItems.length) {
        e.preventDefault();
        navigate(navItems[idx].to);
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [navigate]);

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 h-full bg-card border-r border-border flex flex-col transition-all duration-200 z-10",
        collapsed ? "w-16" : "w-56"
      )}
    >
      <div className={cn(
        "flex items-center h-14 border-b border-border",
        collapsed ? "justify-center px-2" : "px-4"
      )}>
        <button
          onClick={toggle}
          className={cn(
            "flex items-center gap-2.5 rounded-lg transition-colors hover:bg-muted p-1.5",
            collapsed && "justify-center"
          )}
          title={collapsed ? t("app.title") : undefined}
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" className="w-7 h-7 shrink-0">
            <rect width="512" height="512" rx="80" fill="#000000"/>
            <path d="M256 72 L408 138 L408 280 Q408 388 256 448 Q104 388 104 280 L104 138 Z"
                  fill="none" stroke="#4ade80" strokeWidth="36" strokeLinejoin="round"/>
            <path d="M256 190 L256 348" stroke="#ffffff" strokeWidth="40" strokeLinecap="round"/>
            <path d="M186 260 L256 190 L326 260" stroke="#ffffff" strokeWidth="40" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
            <line x1="200" y1="348" x2="312" y2="348" stroke="#4ade80" strokeWidth="24" strokeLinecap="round"/>
          </svg>
          {!collapsed && (
            <span className="font-semibold text-sm truncate">
              {t("app.title")}
            </span>
          )}
        </button>
        {!collapsed && (
          <button
            onClick={toggle}
            className="ml-auto p-1.5 rounded-md hover:bg-muted transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
        )}
      </div>

      <div className="pt-2">
        <GlobalSearch collapsed={collapsed} />
      </div>
      <nav className="flex-1 py-2">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-3 mx-2 px-3 py-2 rounded-lg text-sm transition-colors",
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )
            }
            aria-label={collapsed ? t(item.label) : undefined}
          >
            <item.icon className="w-4 h-4 shrink-0" aria-hidden="true" />
            {!collapsed && <span className="truncate">{t(item.label)}</span>}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
