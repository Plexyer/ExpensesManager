import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  setCurrentBudgetInstanceId,
  setShowPeriodSelector,
} from "../../../store/slices/budgetSlice";
import { useAppDispatch, useAppSelector } from "../../../store/hooks";
import DashboardStateViews from "./DashboardStateViews";

const MAX_RECENT_PERIODS = 5;

const formatCadence = (cadence: string): string =>
  cadence.charAt(0).toUpperCase() + cadence.slice(1);

const formatDateRange = (startDate: string, endDate: string | null, toLabel: string): string => {
  if (endDate) {
    return `${startDate} ${toLabel} ${endDate}`;
  }

  return startDate;
};

const RecentPeriodsWidget = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { periods, periodsStatus, periodsError, currentBudgetInstanceId } = useAppSelector(
    (state) => state.budget
  );

  const recentPeriods = useMemo(
    () =>
      [...periods]
        .sort((a, b) => b.start_date.localeCompare(a.start_date))
        .slice(0, MAX_RECENT_PERIODS),
    [periods]
  );

  const handleOpenPeriod = (budgetInstanceId: number) => {
    dispatch(setCurrentBudgetInstanceId(budgetInstanceId));
    dispatch(setShowPeriodSelector(false));
    navigate("/periods");
  };

  if (periodsStatus === "idle" || periodsStatus === "loading") {
    return <DashboardStateViews state="loading" />;
  }

  if (periodsError) {
    return <DashboardStateViews state="error" />;
  }

  if (!recentPeriods.length) {
    return <DashboardStateViews state="empty" />;
  }

  return (
    <section aria-label={t("dashboard.recentPeriodsRegion")}>
      <ul className="space-y-2" aria-label={t("dashboard.recentPeriodsListLabel")}>
        {recentPeriods.map((period) => {
          const periodName = period.template_name ?? t("periods.untitledPeriod");
          const isActive = period.budget_instance_id === currentBudgetInstanceId;
          const dateRange = formatDateRange(period.start_date, period.end_date, t("periods.to"));

          return (
            <li key={period.budget_instance_id}>
              <button
                type="button"
                onClick={() => handleOpenPeriod(period.budget_instance_id)}
                className={`flex w-full items-start justify-between rounded-lg border p-3 text-left transition-colors ${
                  isActive
                    ? "border-emerald-500/50 bg-emerald-900/20"
                    : "border-slate-700 bg-slate-900/30 hover:bg-slate-800/70"
                }`}
                aria-label={t("dashboard.recentPeriodsOpen", {
                  name: periodName,
                  cadence: formatCadence(period.cadence),
                  dates: dateRange,
                })}
              >
                <span className="min-w-0">
                  <span className="block truncate text-sm font-semibold text-white">{periodName}</span>
                  <span className="mt-1 block text-xs text-slate-400">
                    {formatCadence(period.cadence)} · {dateRange}
                  </span>
                </span>

                {isActive && (
                  <span className="ml-3 rounded-full border border-emerald-500/50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-300">
                    {t("dashboard.recentPeriodsActive")}
                  </span>
                )}
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
};

export default RecentPeriodsWidget;

