import PeriodCard from "./PeriodCard";
import PeriodListRow from "./PeriodListRow";
import type { PeriodBudgetInstance } from "../../../types/period.types";

type PeriodViewMode = "grid" | "list";

interface PeriodListProps {
  periods: PeriodBudgetInstance[];
  currentBudgetInstanceId: number | null;
  viewMode: PeriodViewMode;
  onViewModeChange: (mode: PeriodViewMode) => void;
  onSelectPeriod: (budgetInstanceId: number) => void;
  onCreatePeriod: () => void;
}

/** Toggle button for grid/list view modes. */
const ViewToggleButton = ({
  mode,
  isActive,
  onClick,
}: {
  mode: PeriodViewMode;
  isActive: boolean;
  onClick: () => void;
}) => {
  const label = mode === "grid" ? "Grid view" : "List view";

  return (
    <button
      type="button"
      onClick={onClick}
      className={`p-1.5 rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
        isActive
          ? "bg-slate-600 text-white"
          : "text-slate-400 hover:text-white hover:bg-slate-700"
      }`}
      aria-label={label}
      aria-pressed={isActive}
    >
      {mode === "grid" ? (
        <svg
          className="w-4 h-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"
          />
        </svg>
      ) : (
        <svg
          className="w-4 h-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 6h16M4 12h16M4 18h16"
          />
        </svg>
      )}
    </button>
  );
};

const PeriodList = ({
  periods,
  currentBudgetInstanceId,
  viewMode,
  onViewModeChange,
  onSelectPeriod,
  onCreatePeriod,
}: PeriodListProps) => {
  return (
    <div className="flex flex-col gap-3">
      {/* Header row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h2 className="text-sm font-medium text-slate-400 uppercase tracking-wider">
            Budget Periods
          </h2>

          {/* View mode toggle */}
          <div
            className="flex items-center gap-0.5 bg-slate-800 rounded-lg p-0.5 border border-slate-700"
            role="radiogroup"
            aria-label="Period view mode"
          >
            <ViewToggleButton
              mode="grid"
              isActive={viewMode === "grid"}
              onClick={() => onViewModeChange("grid")}
            />
            <ViewToggleButton
              mode="list"
              isActive={viewMode === "list"}
              onClick={() => onViewModeChange("list")}
            />
          </div>
        </div>

        <button
          type="button"
          onClick={onCreatePeriod}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500"
          aria-label="Create a new budget period"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 4v16m8-8H4"
            />
          </svg>
          New Period
        </button>
      </div>

      {/* Grid view */}
      {viewMode === "grid" && (
        <div
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3"
          role="listbox"
          aria-label="Budget periods (grid view)"
        >
          {periods.map((period) => (
            <PeriodCard
              key={period.budget_instance_id}
              period={period}
              isSelected={period.budget_instance_id === currentBudgetInstanceId}
              onSelect={onSelectPeriod}
            />
          ))}
        </div>
      )}

      {/* List view */}
      {viewMode === "list" && (
        <div
          className="flex flex-col gap-2"
          role="listbox"
          aria-label="Budget periods (list view)"
        >
          {periods.map((period) => (
            <PeriodListRow
              key={period.budget_instance_id}
              period={period}
              isSelected={period.budget_instance_id === currentBudgetInstanceId}
              onSelect={onSelectPeriod}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default PeriodList;
