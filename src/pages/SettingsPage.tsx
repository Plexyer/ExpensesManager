import { useTranslation } from "react-i18next";
import { useAppSelector, useAppDispatch } from "../store/hooks";
import { setSnapMode, saveSnapMode } from "../store/slices/budgetSlice";
import type { SnapMode } from "../components/features/BudgetGrid/types";
import AppHeader from "../components/common/AppHeader";
import Onboarding from "../components/features/Onboarding/Onboarding";
import BackupSettings from "../components/features/Settings/BackupSettings";
import ExportSettings from "../components/features/Settings/ExportSettings";
import LanguageSettings from "../components/features/Settings/LanguageSettings";

const SettingsPage = () => {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const { isFileOpen } = useAppSelector((state) => state.file);
  const snapMode = useAppSelector((state) => state.budget.snapMode);

  // Show onboarding if no file is open
  if (!isFileOpen) {
    return <Onboarding />;
  }

  const SNAP_MODE_OPTIONS: { value: SnapMode; label: string; description: string }[] = [
    {
      value: "magnetic",
      label: t("settings.magneticSnap"),
      description: t("settings.magneticSnapDesc"),
    },
    {
      value: "detent",
      label: t("settings.detentSnap"),
      description: t("settings.detentSnapDesc"),
    },
  ];

  const handleSnapModeChange = (mode: SnapMode) => {
    dispatch(setSnapMode(mode));
    dispatch(saveSnapMode(mode));
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col">
      <AppHeader />

      {/* Main Content */}
      <main className="flex-1 p-6">
        <div className="max-w-2xl mx-auto space-y-6">
          {/* Page Title */}
          <h1 className="text-2xl font-semibold text-white">{t("settings.title")}</h1>

          {/* Language Settings */}
          <LanguageSettings />

          {/* Grid Settings Section */}
          <section
            aria-labelledby="grid-settings-heading"
            className="bg-slate-800/50 border border-slate-700 rounded-xl p-6"
          >
            <h2
              id="grid-settings-heading"
              className="text-lg font-medium text-white mb-4"
            >
              {t("settings.grid")}
            </h2>

            {/* Snap Mode Setting */}
            <fieldset>
              <legend className="text-sm font-medium text-slate-300 mb-3">
                {t("settings.columnResizeSnap")}
              </legend>
              <div className="space-y-3">
                {SNAP_MODE_OPTIONS.map((option) => {
                  const isSelected = snapMode === option.value;
                  return (
                    <label
                      key={option.value}
                      className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                        isSelected
                          ? "border-blue-500/50 bg-blue-500/10"
                          : "border-slate-600/50 hover:border-slate-500/50 hover:bg-slate-700/30"
                      }`}
                    >
                      <input
                        type="radio"
                        name="snap-mode"
                        value={option.value}
                        checked={isSelected}
                        onChange={() => handleSnapModeChange(option.value)}
                        className="mt-0.5 w-4 h-4 text-blue-500 bg-slate-700 border-slate-500 focus:ring-blue-500 focus:ring-offset-0 focus:ring-2"
                        aria-describedby={`snap-mode-${option.value}-desc`}
                      />
                      <div className="flex-1 min-w-0">
                        <span className="text-sm font-medium text-white">
                          {option.label}
                        </span>
                        <p
                          id={`snap-mode-${option.value}-desc`}
                          className="text-xs text-slate-400 mt-0.5"
                        >
                          {option.description}
                        </p>
                      </div>
                    </label>
                  );
                })}
              </div>
            </fieldset>
          </section>

          {/* Export Settings */}
          <ExportSettings />

          {/* Backup Settings */}
          <BackupSettings />
        </div>
      </main>
    </div>
  );
};

export default SettingsPage;
