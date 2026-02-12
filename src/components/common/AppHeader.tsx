import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAppSelector, useAppDispatch } from "../../store/hooks";
import { closeFile } from "../../store/slices/fileSlice";
import { resetCategories } from "../../store/slices/categorySlice";
import { resetTemplates } from "../../store/slices/templateSlice";
import { clearBudgetState } from "../../store/slices/budgetSlice";
import { closeDb } from "../../services/fileService";

interface NavLinkProps {
  to: string;
  label: string;
  isActive: boolean;
}

const NavLink = ({ to, label, isActive }: NavLinkProps) => {
  const baseClasses =
    "px-3 py-1.5 text-sm rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500";
  const activeClasses = "bg-emerald-500/20 text-emerald-300";
  const inactiveClasses = "text-slate-300 hover:text-white hover:bg-slate-700";

  return (
    <Link
      to={to}
      className={`${baseClasses} ${isActive ? activeClasses : inactiveClasses}`}
      aria-current={isActive ? "page" : undefined}
    >
      {label}
    </Link>
  );
};

/**
 * Application header with navigation links.
 * Only visible when a file is open.
 */
const AppHeader = () => {
  const { t } = useTranslation();
  const { isFileOpen, fileName, filePath } = useAppSelector((state) => state.file);
  const location = useLocation();
  const dispatch = useAppDispatch();
  const [closeError, setCloseError] = useState<string | null>(null);

  // Don't render if no file is open
  if (!isFileOpen) {
    return null;
  }

  const handleCloseFile = async () => {
    setCloseError(null);
    try {
      await closeDb();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error("Error closing database:", message);
      setCloseError(t("errors.failedToCloseDb"));
    }
    // Reset all related state regardless — the file handle is released
    dispatch(closeFile());
    dispatch(resetCategories());
    dispatch(resetTemplates());
    dispatch(clearBudgetState());
  };

  const handleDismissCloseError = () => {
    setCloseError(null);
  };

  const navItems = [
    { to: "/", label: t("nav.dashboard") },
    { to: "/periods", label: t("nav.periods") },
    { to: "/templates", label: t("nav.templates") },
    { to: "/settings", label: t("nav.settings") },
  ];

  return (
    <header className="bg-slate-800 border-b border-slate-700 px-6 py-3">
      {/* Close-file error banner */}
      {closeError && (
        <div
          className="flex items-center justify-between gap-2 mb-2 px-3 py-2 text-sm bg-red-500/10 border border-red-500/30 rounded-lg text-red-400"
          role="alert"
        >
          <span>{closeError}</span>
          <button
            type="button"
            onClick={handleDismissCloseError}
            className="text-red-400 hover:text-red-300 transition-colors flex-shrink-0 p-0.5"
            aria-label={t("common.dismissError")}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}
      <div className="flex items-center justify-between">
        {/* Left side: Logo + File info */}
        <div className="flex items-center gap-4">
          {/* App icon */}
          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center flex-shrink-0">
            <svg
              className="w-5 h-5 text-emerald-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>

          {/* File info */}
          <div className="hidden sm:block">
            <p className="text-sm font-medium text-white truncate max-w-xs" title={fileName || undefined}>
              {fileName}
            </p>
            <p className="text-xs text-slate-500 truncate max-w-xs" title={filePath || undefined}>
              {filePath}
            </p>
          </div>

          {/* Navigation */}
          <nav className="flex items-center gap-1 ml-4" aria-label={t("nav.mainNavigation")}>
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                label={item.label}
                isActive={location.pathname === item.to}
              />
            ))}
          </nav>
        </div>

        {/* Right side: Close button */}
        <button
          onClick={handleCloseFile}
          className="px-3 py-1.5 text-sm text-slate-400 hover:text-white hover:bg-slate-700 rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500"
          type="button"
          aria-label={t("nav.closeFileDesc")}
        >
          {t("nav.closeFile")}
        </button>
      </div>
    </header>
  );
};

export default AppHeader;
