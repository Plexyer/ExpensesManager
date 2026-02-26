import { useAppSelector } from "../store/hooks";
import AppHeader from "../components/common/AppHeader";
import Onboarding from "../components/features/Onboarding/Onboarding";
import DashboardShell from "../components/features/Dashboard/DashboardShell";

const DashboardPage = () => {
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
        <DashboardShell />
      </main>
    </div>
  );
};

export default DashboardPage;
