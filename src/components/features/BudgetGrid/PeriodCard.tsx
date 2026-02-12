import React from "react";
import { useTranslation } from "react-i18next";
import type { PeriodBudgetInstance } from "../../../types/period.types";

interface PeriodCardProps {
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

const PeriodCard = React.memo(
  ({ period, isSelected, onSelect }: PeriodCardProps) => {
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
        className={`group relative flex flex-col gap-1.5 p-4 rounded-xl border cursor-pointer transition-all ${
          isSelected
            ? "bg-emerald-500/10 border-emerald-500/40 ring-1 ring-emerald-500/30"
            : "bg-slate-800/50 border-slate-700 hover:border-slate-500 hover:bg-slate-800"
        }`}
      >
        {/* Selected indicator */}
        {isSelected && (
          <div className="absolute top-3 right-3">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
          </div>
        )}

        {/* Period name */}
        <h3
          className={`text-sm font-semibold truncate pr-6 ${
            isSelected ? "text-emerald-300" : "text-white"
          }`}
        >
          {name}
        </h3>

        {/* Cadence badge */}
        <div className="flex items-center gap-2">
          <span className="text-xs px-2 py-0.5 rounded-full bg-slate-700/80 text-slate-300 font-medium">
            {formatCadence(period.cadence)}
          </span>
        </div>

        {/* Date range */}
        <p className="text-xs text-slate-400 mt-0.5">
          {dateRange}
        </p>
      </div>
    );
  }
);

PeriodCard.displayName = "PeriodCard";

export default PeriodCard;
