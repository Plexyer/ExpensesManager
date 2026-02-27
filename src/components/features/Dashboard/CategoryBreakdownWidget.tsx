import { useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { fetchGridData, fetchPeriods } from "../../../store/slices/budgetSlice";
import { useAppDispatch, useAppSelector } from "../../../store/hooks";
import { formatCurrency } from "../../../utils/currency";
import DashboardStateViews from "./DashboardStateViews";

const MAX_VISIBLE_CATEGORIES = 5;
const CHART_COLORS = ["#38bdf8", "#34d399", "#f59e0b", "#fb7185", "#a78bfa", "#94a3b8"];

interface CategoryBreakdownDatum {
  name: string;
  value: number;
}

const CategoryBreakdownWidget = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { isFileOpen } = useAppSelector((state) => state.file);
  const {
    periods,
    periodsStatus,
    periodsError,
    currentBudgetInstanceId,
    gridData,
    gridDataStatus,
    gridDataError,
  } = useAppSelector((state) => state.budget);

  useEffect(() => {
    if (!isFileOpen || periodsStatus !== "idle") {
      return;
    }
    void dispatch(fetchPeriods());
  }, [dispatch, isFileOpen, periodsStatus]);

  useEffect(() => {
    if (!isFileOpen || currentBudgetInstanceId === null) {
      return;
    }
    if (
      gridDataStatus === "idle" ||
      gridData?.budget_instance_id !== currentBudgetInstanceId
    ) {
      void dispatch(fetchGridData(currentBudgetInstanceId));
    }
  }, [
    currentBudgetInstanceId,
    dispatch,
    gridData?.budget_instance_id,
    gridDataStatus,
    isFileOpen,
  ]);

  const spendingRows = useMemo(
    () =>
      (gridData?.rows ?? [])
        .filter((row) => row.spent_total > 0)
        .sort((a, b) => b.spent_total - a.spent_total),
    [gridData?.rows]
  );

  const visibleRows = useMemo(
    () => spendingRows.slice(0, MAX_VISIBLE_CATEGORIES),
    [spendingRows]
  );

  const otherTotal = useMemo(
    () =>
      spendingRows
        .slice(MAX_VISIBLE_CATEGORIES)
        .reduce((sum, row) => sum + row.spent_total, 0),
    [spendingRows]
  );

  const chartData = useMemo<CategoryBreakdownDatum[]>(() => {
    const topCategoryData = visibleRows.map((row) => ({
      name: row.category_name,
      value: row.spent_total,
    }));

    if (otherTotal <= 0) {
      return topCategoryData;
    }

    return [
      ...topCategoryData,
      {
        name: t("dashboard.categoryBreakdownOtherLabel"),
        value: otherTotal,
      },
    ];
  }, [otherTotal, t, visibleRows]);

  const currency = visibleRows[0]?.default_currency ?? "CHF";

  const handleOpenPeriodDetails = () => {
    navigate("/periods");
  };

  if (periodsStatus === "loading" || gridDataStatus === "loading") {
    return <DashboardStateViews state="loading" />;
  }

  if (periodsError || gridDataError) {
    return <DashboardStateViews state="error" />;
  }

  if (!periods.length || !gridData?.rows.length) {
    return <DashboardStateViews state="empty" />;
  }

  if (!spendingRows.length) {
    return (
      <div className="rounded-lg border border-slate-700 bg-slate-900/30 p-3">
        <p className="text-sm text-slate-300">{t("dashboard.categoryBreakdownNoSpending")}</p>
      </div>
    );
  }

  return (
    <section aria-label={t("dashboard.categoryBreakdownRegion")}>
      <p className="mb-2 text-xs text-slate-400">
        {t("dashboard.categoryBreakdownCategoriesShown", {
          shown: visibleRows.length,
          total: spendingRows.length,
        })}
      </p>

      <div className="h-64 w-full" aria-label={t("dashboard.categoryBreakdownChartLabel")}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={chartData}
              dataKey="value"
              nameKey="name"
              innerRadius={54}
              outerRadius={92}
              paddingAngle={2}
            >
              {chartData.map((entry, index) => (
                <Cell
                  key={`${entry.name}-${index}`}
                  fill={CHART_COLORS[index % CHART_COLORS.length]}
                />
              ))}
            </Pie>
            <Tooltip
              formatter={(value: number) =>
                formatCurrency(Number(value), currency)
              }
            />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </div>

      <ul className="mt-3 space-y-2" aria-label={t("dashboard.categoryBreakdownListLabel")}>
        {visibleRows.map((row) => (
          <li
            key={row.budget_instance_category_id}
            className="flex items-center justify-between rounded-lg border border-slate-700 bg-slate-900/30 p-2"
          >
            <span className="text-sm text-slate-200">{row.category_name}</span>
            <span className="text-sm font-semibold text-slate-100">
              {formatCurrency(row.spent_total, row.default_currency)}
            </span>
          </li>
        ))}
        {otherTotal > 0 && (
          <li className="flex items-center justify-between rounded-lg border border-slate-700 bg-slate-900/30 p-2">
            <span className="text-sm text-slate-300">{t("dashboard.categoryBreakdownOtherLabel")}</span>
            <span className="text-sm font-semibold text-slate-100">
              {formatCurrency(otherTotal, currency)}
            </span>
          </li>
        )}
      </ul>

      <button
        type="button"
        className="mt-3 rounded-md border border-slate-600 px-3 py-2 text-xs font-medium text-slate-200 hover:bg-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
        onClick={handleOpenPeriodDetails}
      >
        {t("dashboard.categoryBreakdownOpenPeriod")}
      </button>
    </section>
  );
};

export default CategoryBreakdownWidget;
