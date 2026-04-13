import { NavLink } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  LayoutDashboard,
  HardDrive,
  Database,
  Monitor,
  Grid3X3,
  Clock,
  Settings,
  ChevronLeft,
  ChevronRight,
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
  { to: "/settings", icon: Settings, label: "nav.settings" },
];

export function Sidebar() {
  const { t } = useTranslation();
  const collapsed = useAppStore((s) => s.sidebarCollapsed);
  const toggle = useAppStore((s) => s.toggleSidebar);

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 h-full bg-card border-r border-border flex flex-col transition-all duration-200 z-10",
        collapsed ? "w-16" : "w-56"
      )}
    >
      <div className="flex items-center h-14 px-4 border-b border-border">
        {!collapsed && (
          <span className="font-semibold text-sm truncate">
            {t("app.title")}
          </span>
        )}
        <button
          onClick={toggle}
          className={cn(
            "p-1.5 rounded-md hover:bg-muted transition-colors",
            collapsed ? "mx-auto" : "ml-auto"
          )}
        >
          {collapsed ? (
            <ChevronRight className="w-4 h-4" />
          ) : (
            <ChevronLeft className="w-4 h-4" />
          )}
        </button>
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
          >
            <item.icon className="w-4 h-4 shrink-0" />
            {!collapsed && <span className="truncate">{t(item.label)}</span>}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
