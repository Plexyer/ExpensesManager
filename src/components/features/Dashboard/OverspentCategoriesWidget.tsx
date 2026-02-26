import { useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { fetchGridData, fetchPeriods } from "../../../store/slices/budgetSlice";
import { useAppDispatch, useAppSelector } from "../../../store/hooks";
import { formatCurrency } from "../../../utils/currency";
import DashboardStateViews from "./DashboardStateViews";

const OverspentCategoriesWidget = () => {
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

  const overspentRows = useMemo(
    () =>
      (gridData?.rows ?? [])
        .filter((row) => row.remaining < 0)
        .sort((a, b) => a.remaining - b.remaining),
    [gridData?.rows]
  );

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

  if (!overspentRows.length) {
    return (
      <div className="rounded-lg border border-emerald-700/50 bg-emerald-900/20 p-3">
        <p className="text-sm text-emerald-200">{t("dashboard.overspentAllGood")}</p>
      </div>
    );
  }

  return (
    <section aria-label={t("dashboard.overspentRegion")}>
      <ul className="space-y-2" aria-label={t("dashboard.overspentListLabel")}>
        {overspentRows.map((row) => (
          <li
            key={row.budget_instance_category_id}
            className="flex items-center justify-between rounded-lg border border-red-700/40 bg-red-900/10 p-2"
          >
            <span className="text-sm text-slate-200">{row.category_name}</span>
            <span className="text-sm font-semibold text-red-300">
              {formatCurrency(Math.abs(row.remaining), row.default_currency)}
            </span>
          </li>
        ))}
      </ul>

      <button
        type="button"
        className="mt-3 rounded-md border border-slate-600 px-3 py-2 text-xs font-medium text-slate-200 hover:bg-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
        onClick={handleOpenPeriodDetails}
      >
        {t("dashboard.overspentOpenPeriod")}
      </button>
    </section>
  );
};

export default OverspentCategoriesWidget;

