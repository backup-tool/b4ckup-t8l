import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Sidebar } from "./components/layout/Sidebar";
import { Dashboard } from "./pages/Dashboard";
import { Backups } from "./pages/Backups";
import { BackupDetail } from "./pages/BackupDetail";
import { Media } from "./pages/Media";
import { History } from "./pages/History";
import { Devices } from "./pages/Devices";
import { Matrix } from "./pages/Matrix";
import { Settings } from "./pages/Settings";
import { Statistics } from "./pages/Statistics";
import { useAppStore } from "./lib/store";
import { cn } from "./lib/cn";
import { UpdateBanner } from "./components/ui/UpdateBanner";

export default function App() {
  const collapsed = useAppStore((s) => s.sidebarCollapsed);

  return (
    <BrowserRouter>
      <div className="flex h-screen overflow-hidden">
        <Sidebar />
        <main
          className={cn(
            "flex-1 overflow-y-auto transition-all duration-200",
            collapsed ? "ml-16" : "ml-56"
          )}
        >
          <div className="p-6 max-w-7xl mx-auto">
            <Routes>
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/backups" element={<Backups />} />
              <Route path="/backups/:id" element={<BackupDetail />} />
              <Route path="/media" element={<Media />} />
              <Route path="/matrix" element={<Matrix />} />
              <Route path="/history" element={<History />} />
              <Route path="/statistics" element={<Statistics />} />
              <Route path="/devices" element={<Devices />} />
              <Route path="/settings" element={<Settings />} />
            </Routes>
          </div>
        </main>
        <UpdateBanner />
      </div>
    </BrowserRouter>
  );
}
