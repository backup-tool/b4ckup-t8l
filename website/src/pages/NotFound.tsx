import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { langPrefix } from "@/components/LangRouter";
import { Home, ArrowLeft } from "lucide-react";

export function NotFound() {
  const { i18n } = useTranslation();
  const prefix = langPrefix(i18n.language);

  return (
    <div className="max-w-2xl mx-auto px-6 py-24 text-center">
      <p className="text-8xl font-bold text-accent mb-4">404</p>
      <h1 className="text-2xl font-bold mb-3">Page not found</h1>
      <p className="text-fg-muted mb-8">
        The page you're looking for doesn't exist or has been moved.
      </p>
      <div className="flex items-center justify-center gap-4">
        <Link
          to={prefix || "/"}
          className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-accent text-bg font-semibold text-sm hover:bg-accent-hover transition-colors"
        >
          <Home className="w-4 h-4" />
          Home
        </Link>
        <button
          onClick={() => window.history.back()}
          className="inline-flex items-center gap-2 px-6 py-3 rounded-xl border border-border text-sm hover:border-accent transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Go back
        </button>
      </div>
    </div>
  );
}
