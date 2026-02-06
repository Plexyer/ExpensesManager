import { useAppSelector, useAppDispatch } from "../store/hooks";
import { closeFile } from "../store/slices/fileSlice";
import { closeDb } from "../services/fileService";
import Onboarding from "../components/features/Onboarding/Onboarding";

const HomePage = () => {
  const { isFileOpen, fileName, filePath } = useAppSelector((state) => state.file);
  const dispatch = useAppDispatch();

  const handleCloseFile = async () => {
    try {
      // Close the database connection in the backend first
      await closeDb();
    } catch (error) {
      // Log but don't block - if close fails, we still want to reset UI state
      console.error("Error closing database:", error);
    }
    // Reset frontend state
    dispatch(closeFile());
  };

  // Show onboarding if no file is open
  if (!isFileOpen) {
    return <Onboarding />;
  }

  // File is open - show placeholder content (to be replaced with budget grid later)
  return (
    <div className="min-h-screen bg-slate-900">
      {/* Header */}
      <header className="bg-slate-800 border-b border-slate-700 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
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
            <div>
              <h1 className="text-lg font-semibold text-white">{fileName}</h1>
              <p className="text-xs text-slate-400 truncate max-w-md" title={filePath || undefined}>
                {filePath}
              </p>
            </div>
          </div>
          <button
            onClick={handleCloseFile}
            className="px-4 py-2 text-sm text-slate-300 hover:text-white hover:bg-slate-700 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500"
            type="button"
            aria-label="Close current file"
          >
            Close File
          </button>
        </div>
      </header>

      {/* Main Content Placeholder */}
      <main className="p-6">
        <div className="max-w-4xl mx-auto">
          <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-8 text-center">
            <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto mb-4">
              <svg
                className="w-8 h-8 text-emerald-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-white mb-2">Finance File Created</h2>
            <p className="text-slate-400 mb-6">
              Your encrypted finance file is ready. The budget grid and data storage will be implemented in the next tasks.
            </p>
            <p className="text-xs text-amber-400/80 mb-4">
              Remember: Keep your master password safe. It cannot be recovered.
            </p>
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-slate-700/50 rounded-lg">
              <svg
                className="w-4 h-4 text-slate-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
              <span className="text-sm text-slate-300 font-mono">{fileName}</span>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default HomePage;
