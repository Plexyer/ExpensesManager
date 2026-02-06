import { useAppSelector } from "../store/hooks";
import AppHeader from "../components/common/AppHeader";
import Onboarding from "../components/features/Onboarding/Onboarding";

const HomePage = () => {
  const { isFileOpen, fileName } = useAppSelector((state) => state.file);

  // Show onboarding if no file is open
  if (!isFileOpen) {
    return <Onboarding />;
  }

  // File is open - show placeholder content (to be replaced with budget grid later)
  return (
    <div className="min-h-screen bg-slate-900 flex flex-col">
      <AppHeader />

      {/* Main Content Placeholder */}
      <main className="flex-1 p-6">
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
            <h2 className="text-xl font-semibold text-white mb-2">Finance File Ready</h2>
            <p className="text-slate-400 mb-6">
              Your encrypted finance file is open. Use the navigation above to manage templates and settings.
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
