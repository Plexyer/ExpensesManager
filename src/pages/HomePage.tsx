import { useAppSelector } from "../store/hooks";
import AppHeader from "../components/common/AppHeader";
import Onboarding from "../components/features/Onboarding/Onboarding";
import PeriodGrid from "../components/features/BudgetGrid/PeriodGrid";

const HomePage = () => {
  const { isFileOpen } = useAppSelector((state) => state.file);

  // Show onboarding if no file is open
  if (!isFileOpen) {
    return <Onboarding />;
  }

  // File is open - show budget grid
  return (
    <div className="min-h-screen bg-slate-900 flex flex-col">
      <AppHeader />

      <main className="flex-1 p-6">
        <PeriodGrid />
      </main>
    </div>
  );
};

export default HomePage;
