import { useState, useMemo, useEffect } from "react";
import PeriodCard from "./PeriodCard";
import PeriodListRow from "./PeriodListRow";
import type { PeriodBudgetInstance } from "../../../types/period.types";
import type { Cadence } from "../../../types/template.types";
import { CADENCE_OPTIONS } from "../../../types/template.types";

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
  const [templateFilter, setTemplateFilter] = useState<string>("");
  const [cadenceFilter, setCadenceFilter] = useState<Cadence | "">("");

  // Derive unique template names from the periods for the dropdown
  const uniqueTemplateNames = useMemo(() => {
    const names = periods
      .map((p) => p.template_name)
      .filter((name): name is string => name !== null && name !== "");
    return [...new Set(names)].sort();
  }, [periods]);

  // Reset filters when the dataset changes (e.g., switching files).
  // We detect this by watching for a change in the set of budget_instance_ids.
  const periodIdsKey = useMemo(
    () => periods.map((p) => p.budget_instance_id).join(","),
    [periods]
  );

  useEffect(() => {
    setTemplateFilter("");
    setCadenceFilter("");
  }, [periodIdsKey]);

  // Apply filters
  const filteredPeriods = useMemo(() => {
    return periods.filter((p) => {
      if (templateFilter && p.template_name !== templateFilter) return false;
      if (cadenceFilter && p.cadence !== cadenceFilter) return false;
      return true;
    });
  }, [periods, templateFilter, cadenceFilter]);

  const isFiltering = templateFilter !== "" || cadenceFilter !== "";

  const handleClearFilters = () => {
    setTemplateFilter("");
    setCadenceFilter("");
  };

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

      {/* Filter controls */}
      {periods.length > 0 && (
        <div
          className="flex flex-wrap items-center gap-3"
          role="search"
          aria-label="Filter budget periods"
        >
          {/* Template name filter */}
          <div className="flex items-center gap-1.5">
            <label
              htmlFor="filter-template"
              className="text-xs font-medium text-slate-500"
            >
              Template
            </label>
            <select
              id="filter-template"
              value={templateFilter}
              onChange={(e) => setTemplateFilter(e.target.value)}
              className="px-2 py-1 text-sm bg-slate-800 border border-slate-700 rounded-md text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              aria-label="Filter by template name"
            >
              <option value="">All templates</option>
              {uniqueTemplateNames.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </div>

          {/* Cadence filter */}
          <div className="flex items-center gap-1.5">
            <label
              htmlFor="filter-cadence"
              className="text-xs font-medium text-slate-500"
            >
              Cadence
            </label>
            <select
              id="filter-cadence"
              value={cadenceFilter}
              onChange={(e) => setCadenceFilter(e.target.value as Cadence | "")}
              className="px-2 py-1 text-sm bg-slate-800 border border-slate-700 rounded-md text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              aria-label="Filter by cadence type"
            >
              <option value="">All cadences</option>
              {CADENCE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Clear filters button (shown only when filters are active) */}
          {isFiltering && (
            <button
              type="button"
              onClick={handleClearFilters}
              className="px-2 py-1 text-xs font-medium text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500"
              aria-label="Clear all filters"
            >
              Clear filters
            </button>
          )}

          {/* Active filter count */}
          {isFiltering && (
            <span className="text-xs text-slate-500">
              {filteredPeriods.length} of {periods.length} period{periods.length !== 1 ? "s" : ""}
            </span>
          )}
        </div>
      )}

      {/* Empty state: no periods at all */}
      {periods.length === 0 && (
        <div className="text-center py-8 text-slate-500">
          <p className="text-sm">No budget periods yet.</p>
          <p className="text-xs mt-1">Click "New Period" to create your first one.</p>
        </div>
      )}

      {/* Empty state: filters exclude all results */}
      {periods.length > 0 && filteredPeriods.length === 0 && (
        <div className="text-center py-8 text-slate-500">
          <p className="text-sm">No periods match the current filters.</p>
          <button
            type="button"
            onClick={handleClearFilters}
            className="mt-2 px-3 py-1.5 text-sm font-medium text-emerald-400 hover:text-emerald-300 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500"
            aria-label="Clear all filters to show all periods"
          >
            Clear filters
          </button>
        </div>
      )}

      {/* Grid view */}
      {viewMode === "grid" && filteredPeriods.length > 0 && (
        <div
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3"
          role="listbox"
          aria-label="Budget periods (grid view)"
        >
          {filteredPeriods.map((period) => (
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
      {viewMode === "list" && filteredPeriods.length > 0 && (
        <div
          className="flex flex-col gap-2"
          role="listbox"
          aria-label="Budget periods (list view)"
        >
          {filteredPeriods.map((period) => (
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
