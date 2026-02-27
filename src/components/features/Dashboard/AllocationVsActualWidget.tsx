import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAppSelector } from "../../../store/hooks";
import { formatCurrency } from "../../../utils/currency";
import DashboardStateViews from "./DashboardStateViews";

const MAX_VISIBLE_CATEGORIES = 6;

interface AllocationVarianceRow {
  id: number;
  name: string;
  allocated: number;
  spent: number;
  remaining: number;
  varianceAmount: number;
  variancePercent: number | null;
  currencyCode: string;
  state: "over" | "under" | "onTarget";
}

const AllocationVsActualWidget = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const {
    periods,
    periodsStatus,
    periodsError,
    gridData,
    gridDataStatus,
    gridDataError,
  } = useAppSelector((state) => state.budget);

  const varianceRows = useMemo<AllocationVarianceRow[]>(
    () =>
      (gridData?.rows ?? [])
        .map((row) => {
          const allocated = row.default_amount;
          const spent = row.spent_total;
          const varianceAmount = spent - allocated;
          const variancePercent =
            allocated > 0 ? (varianceAmount / allocated) * 100 : null;
          const state: AllocationVarianceRow["state"] =
            varianceAmount > 0 ? "over" : varianceAmount < 0 ? "under" : "onTarget";

          return {
            id: row.budget_instance_category_id,
            name: row.category_name,
            allocated,
            spent,
            remaining: row.remaining,
            varianceAmount,
            variancePercent,
            currencyCode: row.default_currency,
            state,
          };
        })
        .sort(
          (left, right) =>
            Math.abs(right.varianceAmount) - Math.abs(left.varianceAmount)
        ),
    [gridData?.rows]
  );

  const visibleRows = useMemo(
    () => varianceRows.slice(0, MAX_VISIBLE_CATEGORIES),
    [varianceRows]
  );

  const handleOpenPeriodDetails = () => {
    navigate("/periods");
  };

  if (periodsError || gridDataError) {
    return <DashboardStateViews state="error" />;
  }

  if (
    periodsStatus === "idle" ||
    periodsStatus === "loading" ||
    gridDataStatus === "idle" ||
    gridDataStatus === "loading"
  ) {
    return <DashboardStateViews state="loading" />;
  }

  if (!periods.length || !gridData?.rows.length) {
    return <DashboardStateViews state="empty" />;
  }

  return (
    <section aria-label={t("dashboard.allocationRegion")}>
      <p className="mb-2 text-xs text-slate-400">
        {t("dashboard.allocationCategoriesShown", {
          shown: visibleRows.length,
          total: varianceRows.length,
        })}
      </p>

      <ul className="space-y-2" aria-label={t("dashboard.allocationListLabel")}>
        {visibleRows.map((row) => {
          const stateLabel =
            row.state === "over"
              ? t("dashboard.allocationStateOver")
              : row.state === "under"
              ? t("dashboard.allocationStateUnder")
              : t("dashboard.allocationStateOnTarget");
          const stateColorClass =
            row.state === "over"
              ? "border-red-700/70 text-red-200"
              : row.state === "under"
              ? "border-emerald-700/70 text-emerald-200"
              : "border-slate-600 text-slate-300";
          const varianceSign = row.varianceAmount > 0 ? "+" : "";

          return (
            <li
              key={row.id}
              className="rounded-lg border border-slate-700 bg-slate-900/30 p-3"
            >
              <div className="mb-1 flex items-center justify-between gap-2">
                <span className="text-sm font-medium text-slate-100">{row.name}</span>
                <span
                  className={`rounded-full border px-2 py-0.5 text-[11px] font-medium ${stateColorClass}`}
                >
                  {stateLabel}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs text-slate-300 sm:grid-cols-4">
                <span>{t("dashboard.allocationAllocatedLabel")}</span>
                <span className="font-medium text-slate-100">
                  {formatCurrency(row.allocated, row.currencyCode)}
                </span>

                <span>{t("dashboard.allocationSpentLabel")}</span>
                <span className="font-medium text-slate-100">
                  {formatCurrency(row.spent, row.currencyCode)}
                </span>

                <span>{t("dashboard.allocationVarianceLabel")}</span>
                <span className="font-medium text-slate-100">
                  {varianceSign}
                  {formatCurrency(row.varianceAmount, row.currencyCode)}
                </span>

                <span>{t("dashboard.allocationRemainingLabel")}</span>
                <span className="font-medium text-slate-100">
                  {formatCurrency(row.remaining, row.currencyCode)}
                </span>
              </div>

              {row.variancePercent !== null && (
                <p className="mt-1 text-[11px] text-slate-400">
                  {t("dashboard.allocationVariancePercent", {
                    value: row.variancePercent.toFixed(1),
                  })}
                </p>
              )}
            </li>
          );
        })}
      </ul>

      <button
        type="button"
        className="mt-3 rounded-md border border-slate-600 px-3 py-2 text-xs font-medium text-slate-200 hover:bg-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
        onClick={handleOpenPeriodDetails}
      >
        {t("dashboard.allocationOpenPeriod")}
      </button>
    </section>
  );
};

export default AllocationVsActualWidget;
