import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { lazy, Suspense } from "react";
import { Sidebar } from "./components/layout/Sidebar";
import { useAppStore } from "./lib/store";
import { cn } from "./lib/cn";
import { UpdateBanner } from "./components/ui/UpdateBanner";
import { Loader2 } from "lucide-react";

const Dashboard = lazy(() => import("./pages/Dashboard").then((m) => ({ default: m.Dashboard })));
const Backups = lazy(() => import("./pages/Backups").then((m) => ({ default: m.Backups })));
const BackupDetail = lazy(() => import("./pages/BackupDetail").then((m) => ({ default: m.BackupDetail })));
const Media = lazy(() => import("./pages/Media").then((m) => ({ default: m.Media })));
const History = lazy(() => import("./pages/History").then((m) => ({ default: m.History })));
const Devices = lazy(() => import("./pages/Devices").then((m) => ({ default: m.Devices })));
const Matrix = lazy(() => import("./pages/Matrix").then((m) => ({ default: m.Matrix })));
const Settings = lazy(() => import("./pages/Settings").then((m) => ({ default: m.Settings })));
const Statistics = lazy(() => import("./pages/Statistics").then((m) => ({ default: m.Statistics })));
const Calendar = lazy(() => import("./pages/Calendar").then((m) => ({ default: m.Calendar })));

function PageLoader() {
  return (
    <div className="flex items-center justify-center py-20">
      <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
    </div>
  );
}

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
            <Suspense fallback={<PageLoader />}>
              <Routes>
                <Route path="/" element={<Navigate to="/dashboard" replace />} />
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/backups" element={<Backups />} />
                <Route path="/backups/:id" element={<BackupDetail />} />
                <Route path="/media" element={<Media />} />
                <Route path="/matrix" element={<Matrix />} />
                <Route path="/history" element={<History />} />
                <Route path="/statistics" element={<Statistics />} />
                <Route path="/calendar" element={<Calendar />} />
                <Route path="/devices" element={<Devices />} />
                <Route path="/settings" element={<Settings />} />
              </Routes>
            </Suspense>
          </div>
        </main>
        <UpdateBanner />
      </div>
    </BrowserRouter>
  );
}
