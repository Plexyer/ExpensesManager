import { useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { fetchGridData, fetchPeriods } from "../../../store/slices/budgetSlice";
import { useAppDispatch, useAppSelector } from "../../../store/hooks";
import DashboardStateViews from "./DashboardStateViews";

const InactiveCategoriesWidget = () => {
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

  const inactiveRows = useMemo(
    () =>
      (gridData?.rows ?? [])
        .filter((row) => row.received_total === 0 && row.spent_total === 0)
        .sort((a, b) => a.category_name.localeCompare(b.category_name)),
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

  if (!inactiveRows.length) {
    return (
      <div className="rounded-lg border border-emerald-700/50 bg-emerald-900/20 p-3">
        <p className="text-sm text-emerald-200">{t("dashboard.inactiveCategoriesAllActive")}</p>
      </div>
    );
  }

  return (
    <section aria-label={t("dashboard.inactiveCategoriesRegion")}>
      <p className="mb-2 text-xs text-slate-400">
        {t("dashboard.inactiveCategoriesCount", { count: inactiveRows.length })}
      </p>

      <ul className="space-y-2" aria-label={t("dashboard.inactiveCategoriesListLabel")}>
        {inactiveRows.map((row) => (
          <li
            key={row.budget_instance_category_id}
            className="rounded-lg border border-slate-700 bg-slate-900/30 p-2 text-sm text-slate-200"
          >
            {row.category_name}
          </li>
        ))}
      </ul>

      <button
        type="button"
        className="mt-3 rounded-md border border-slate-600 px-3 py-2 text-xs font-medium text-slate-200 hover:bg-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
        onClick={handleOpenPeriodDetails}
      >
        {t("dashboard.inactiveCategoriesOpenPeriod")}
      </button>
    </section>
  );
};

export default InactiveCategoriesWidget;

