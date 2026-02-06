import { Link, useLocation } from "react-router-dom";
import { useAppSelector, useAppDispatch } from "../../store/hooks";
import { closeFile } from "../../store/slices/fileSlice";
import { resetCategories } from "../../store/slices/categorySlice";
import { resetTemplates } from "../../store/slices/templateSlice";
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
  const { isFileOpen, fileName, filePath } = useAppSelector((state) => state.file);
  const location = useLocation();
  const dispatch = useAppDispatch();

  // Don't render if no file is open
  if (!isFileOpen) {
    return null;
  }

  const handleCloseFile = async () => {
    try {
      await closeDb();
    } catch (error) {
      console.error("Error closing database:", error);
    }
    // Reset all related state
    dispatch(closeFile());
    dispatch(resetCategories());
    dispatch(resetTemplates());
  };

  const navItems = [
    { to: "/", label: "Home" },
    { to: "/templates", label: "Templates" },
    { to: "/settings", label: "Settings" },
  ];

  return (
    <header className="bg-slate-800 border-b border-slate-700 px-6 py-3">
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
          <nav className="flex items-center gap-1 ml-4" aria-label="Main navigation">
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
          aria-label="Close current file and return to file selection"
        >
          Close File
        </button>
      </div>
    </header>
  );
};

export default AppHeader;
