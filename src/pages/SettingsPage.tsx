import { useTranslation } from "react-i18next";
import { useAppSelector } from "../store/hooks";
import AppHeader from "../components/common/AppHeader";
import Onboarding from "../components/features/Onboarding/Onboarding";
import BackupSettings from "../components/features/Settings/BackupSettings";
import ExportSettings from "../components/features/Settings/ExportSettings";
import LanguageSettings from "../components/features/Settings/LanguageSettings";
import PeriodTableSettings from "../components/features/Settings/PeriodTableSettings";

const SettingsPage = () => {
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
        <div className="max-w-2xl mx-auto space-y-6">
          {/* Page Title */}
          <h1 className="text-2xl font-semibold text-white">{t("settings.title")}</h1>

          {/* Language Settings */}
          <LanguageSettings />

          {/* Period Table Settings */}
          <PeriodTableSettings />

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
