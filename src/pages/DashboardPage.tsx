import { useTranslation } from "react-i18next";
import { useAppSelector } from "../store/hooks";
import AppHeader from "../components/common/AppHeader";
import Onboarding from "../components/features/Onboarding/Onboarding";

const DashboardPage = () => {
  const { t } = useTranslation();
  const { isFileOpen } = useAppSelector((state) => state.file);

  // Show onboarding if no file is open
  if (!isFileOpen) {
    return <Onboarding />;
  }

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col">
      <AppHeader />

      {/* Main Content */}
      <main className="flex-1 p-6">
        <div className="max-w-2xl mx-auto">
          <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-8 text-center">
            <div className="w-16 h-16 rounded-2xl bg-slate-700/50 border border-slate-600 flex items-center justify-center mx-auto mb-4">
              <svg
                className="w-8 h-8 text-slate-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z"
                />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-white mb-2">{t("dashboard.title")}</h2>
            <p className="text-slate-400">
              {t("dashboard.placeholder")}
            </p>
          </div>
        </div>
      </main>
    </div>
  );
};

export default DashboardPage;
