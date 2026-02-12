import React from "react";
import { useTranslation } from "react-i18next";
import type { PeriodBudgetInstance } from "../../../types/period.types";

interface PeriodListRowProps {
  period: PeriodBudgetInstance;
  isSelected: boolean;
  onSelect: (budgetInstanceId: number) => void;
}

/** Format cadence for display. */
const formatCadence = (cadence: string): string =>
  cadence.charAt(0).toUpperCase() + cadence.slice(1);

/** Format the date range. */
const formatDateRange = (startDate: string, endDate: string | null, toLabel: string): string => {
  if (endDate) return `${startDate}  ${toLabel}  ${endDate}`;
  return startDate;
};

const PeriodListRow = React.memo(
  ({ period, isSelected, onSelect }: PeriodListRowProps) => {
    const { t } = useTranslation();

    const handleClick = () => {
      onSelect(period.budget_instance_id);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        onSelect(period.budget_instance_id);
      }
    };

    const name = period.template_name ?? t("periods.untitledPeriod");
    const dateRange = formatDateRange(period.start_date, period.end_date, t("periods.to"));

    return (
      <div
        role="button"
        tabIndex={0}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        aria-label={t("periods.selectPeriod", { name, cadence: formatCadence(period.cadence), dates: dateRange })}
        aria-pressed={isSelected}
        className={`flex items-center gap-4 px-4 py-3 rounded-lg border cursor-pointer transition-all ${
          isSelected
            ? "bg-emerald-500/10 border-emerald-500/40 ring-1 ring-emerald-500/30"
            : "bg-slate-800/50 border-slate-700 hover:border-slate-500 hover:bg-slate-800"
        }`}
      >
        {/* Period name */}
        <span
          className={`text-sm font-semibold truncate min-w-0 flex-1 ${
            isSelected ? "text-emerald-300" : "text-white"
          }`}
        >
          {name}
        </span>

        {/* Cadence badge */}
        <span className="text-xs px-2 py-0.5 rounded-full bg-slate-700/80 text-slate-300 font-medium flex-shrink-0">
          {formatCadence(period.cadence)}
        </span>

        {/* Date range */}
        <span className="text-xs text-slate-400 flex-shrink-0">
          {dateRange}
        </span>

        {/* Selected indicator */}
        {isSelected && (
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 flex-shrink-0" />
        )}
      </div>
    );
  }
);

PeriodListRow.displayName = "PeriodListRow";

export default PeriodListRow;
