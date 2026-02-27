import { useTranslation } from "react-i18next";
import { useAppSelector } from "../../../store/hooks";
import { formatCurrency } from "../../../utils/currency";
import DashboardStateViews from "./DashboardStateViews";

const CurrentPeriodKpiWidget = () => {
  const { t } = useTranslation();
  const {
    periods,
    periodsStatus,
    periodsError,
    gridData,
    gridDataStatus,
    gridDataError,
  } = useAppSelector((state) => state.budget);

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

  const totals = gridData.rows.reduce(
    (acc, row) => {
      acc.receivedTotal += row.received_total;
      acc.spentTotal += row.spent_total;
      acc.remainingTotal += row.remaining;
      return acc;
    },
    { receivedTotal: 0, spentTotal: 0, remainingTotal: 0 }
  );
  const currencyCode = gridData.rows[0]?.default_currency ?? "CHF";
  const { receivedTotal, spentTotal, remainingTotal } = totals;

  const remainingClass =
    remainingTotal < 0 ? "text-red-300" : "text-emerald-300";

  return (
    <section aria-label={t("dashboard.kpiRegion", { defaultValue: "Current period KPIs" })}>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-lg border border-slate-700 bg-slate-900/40 p-3">
          <p className="text-xs text-slate-400" title={t("dashboard.kpiReceivedHint")}>
            {t("dashboard.kpiReceivedLabel")}
          </p>
          <p className="mt-1 text-lg font-semibold text-white">
            {formatCurrency(receivedTotal, currencyCode)}
          </p>
        </div>

        <div className="rounded-lg border border-slate-700 bg-slate-900/40 p-3">
          <p className="text-xs text-slate-400" title={t("dashboard.kpiSpentHint")}>
            {t("dashboard.kpiSpentLabel")}
          </p>
          <p className="mt-1 text-lg font-semibold text-white">
            {formatCurrency(spentTotal, currencyCode)}
          </p>
        </div>

        <div className="rounded-lg border border-slate-700 bg-slate-900/40 p-3">
          <p className="text-xs text-slate-400" title={t("dashboard.kpiRemainingHint")}>
            {t("dashboard.kpiRemainingLabel")}
          </p>
          <p
            className={`mt-1 text-lg font-semibold ${remainingClass}`}
            data-testid="kpi-remaining-value"
          >
            {formatCurrency(remainingTotal, currencyCode)}
          </p>
        </div>
      </div>
    </section>
  );
};

export default CurrentPeriodKpiWidget;

