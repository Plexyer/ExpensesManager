import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { type GridCategoryRow } from "../../../services/fileService";
import { useAppSelector } from "../../../store/hooks";
import { formatCurrency } from "../../../utils/currency";
import type { PeriodBudgetInstance } from "../../../types/period.types";
import DashboardStateViews from "./DashboardStateViews";
import {
  getDedupedGridData,
  getDedupedPeriods,
} from "./dashboardRequestDeduper";

const MAX_VISIBLE_CHANGES = 6;

type LargestChangesStatus = "idle" | "loading" | "succeeded" | "failed";
type DeltaMetric = "spent_total" | "received_total" | "remaining" | "net";

interface CategoryComparisonRow {
  globalCategoryId: number;
  categoryName: string;
  currencyCode: string;
  currentRow: GridCategoryRow | null;
  previousRow: GridCategoryRow | null;
}

interface DeltaDisplayRow {
  globalCategoryId: number;
  categoryName: string;
  currencyCode: string;
  currentValue: number;
  previousValue: number;
  delta: number;
  direction: "increase" | "decrease" | "unchanged";
}

const sortPeriodsDescending = (periods: PeriodBudgetInstance[]) =>
  [...periods].sort(
    (left, right) =>
      new Date(right.start_date).getTime() - new Date(left.start_date).getTime()
  );

const getMetricValue = (row: GridCategoryRow | null, metric: DeltaMetric) => {
  if (row === null) {
    return 0;
  }

  if (metric === "spent_total") {
    return row.spent_total;
  }

  if (metric === "received_total") {
    return row.received_total;
  }

  if (metric === "remaining") {
    return row.remaining;
  }

  return row.received_total - row.spent_total;
};

const buildCategoryComparisons = (
  currentRows: GridCategoryRow[],
  previousRows: GridCategoryRow[]
): CategoryComparisonRow[] => {
  const byGlobalCategory = new Map<number, CategoryComparisonRow>();

  currentRows.forEach((row) => {
    byGlobalCategory.set(row.global_category_id, {
      globalCategoryId: row.global_category_id,
      categoryName: row.category_name,
      currencyCode: row.default_currency,
      currentRow: row,
      previousRow: null,
    });
  });

  previousRows.forEach((row) => {
    const existing = byGlobalCategory.get(row.global_category_id);

    if (existing) {
      byGlobalCategory.set(row.global_category_id, {
        ...existing,
        previousRow: row,
        categoryName: existing.categoryName || row.category_name,
        currencyCode: existing.currencyCode || row.default_currency,
      });
      return;
    }

    byGlobalCategory.set(row.global_category_id, {
      globalCategoryId: row.global_category_id,
      categoryName: row.category_name,
      currencyCode: row.default_currency,
      currentRow: null,
      previousRow: row,
    });
  });

  return Array.from(byGlobalCategory.values());
};

const LargestChangesVsPreviousPeriodWidget = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { isFileOpen } = useAppSelector((state) => state.file);
  const { currentBudgetInstanceId } = useAppSelector((state) => state.budget);
  const [status, setStatus] = useState<LargestChangesStatus>("idle");
  const [metric, setMetric] = useState<DeltaMetric>("spent_total");
  const [totalPeriodCount, setTotalPeriodCount] = useState(0);
  const [currentPeriodLabel, setCurrentPeriodLabel] = useState("");
  const [previousPeriodLabel, setPreviousPeriodLabel] = useState("");
  const [hasInsufficientPeriods, setHasInsufficientPeriods] = useState(false);
  const [comparisonRows, setComparisonRows] = useState<CategoryComparisonRow[]>([]);

  useEffect(() => {
    if (!isFileOpen) {
      setStatus("idle");
      setTotalPeriodCount(0);
      setCurrentPeriodLabel("");
      setPreviousPeriodLabel("");
      setHasInsufficientPeriods(false);
      setComparisonRows([]);
      return;
    }

    let cancelled = false;

    const loadLargestChanges = async () => {
      setStatus("loading");

      try {
          const periods = await getDedupedPeriods();
        const sortedPeriods = sortPeriodsDescending(periods);

        if (cancelled) {
          return;
        }

        setTotalPeriodCount(sortedPeriods.length);

        if (sortedPeriods.length === 0) {
          setCurrentPeriodLabel("");
          setPreviousPeriodLabel("");
          setHasInsufficientPeriods(false);
          setComparisonRows([]);
          setStatus("succeeded");
          return;
        }

        const selectedCurrentIndex =
          currentBudgetInstanceId === null
            ? 0
            : sortedPeriods.findIndex(
                (period) => period.budget_instance_id === currentBudgetInstanceId
              );
        const safeCurrentIndex = selectedCurrentIndex >= 0 ? selectedCurrentIndex : 0;
        const currentPeriod = sortedPeriods[safeCurrentIndex];
        const previousPeriod = sortedPeriods[safeCurrentIndex + 1] ?? null;

        setCurrentPeriodLabel(currentPeriod.template_name || currentPeriod.start_date);

        if (previousPeriod === null) {
          setPreviousPeriodLabel("");
          setHasInsufficientPeriods(true);
          setComparisonRows([]);
          setStatus("succeeded");
          return;
        }

        setPreviousPeriodLabel(previousPeriod.template_name || previousPeriod.start_date);
        setHasInsufficientPeriods(false);

        const [currentGridData, previousGridData] = await Promise.all([
                  getDedupedGridData(currentPeriod.budget_instance_id),
                  getDedupedGridData(previousPeriod.budget_instance_id),
        ]);

        if (cancelled) {
          return;
        }

        setComparisonRows(
          buildCategoryComparisons(currentGridData.rows, previousGridData.rows)
        );
        setStatus("succeeded");
      } catch {
        if (!cancelled) {
          setStatus("failed");
        }
      }
    };

    void loadLargestChanges();

    return () => {
      cancelled = true;
    };
  }, [currentBudgetInstanceId, isFileOpen]);

  const deltaRows = useMemo<DeltaDisplayRow[]>(
    () =>
      comparisonRows
        .map((row) => {
          const currentValue = getMetricValue(row.currentRow, metric);
          const previousValue = getMetricValue(row.previousRow, metric);
          const delta = currentValue - previousValue;
          const direction: DeltaDisplayRow["direction"] =
            delta > 0 ? "increase" : delta < 0 ? "decrease" : "unchanged";

          return {
            globalCategoryId: row.globalCategoryId,
            categoryName: row.categoryName,
            currencyCode: row.currencyCode,
            currentValue,
            previousValue,
            delta,
            direction,
          };
        })
        .filter((row) => row.delta !== 0)
        .sort((left, right) => Math.abs(right.delta) - Math.abs(left.delta)),
    [comparisonRows, metric]
  );

  const visibleRows = useMemo(
    () => deltaRows.slice(0, MAX_VISIBLE_CHANGES),
    [deltaRows]
  );

  const handleOpenPeriodDetails = () => {
    navigate("/periods");
  };

  if (status === "loading") {
    return <DashboardStateViews state="loading" />;
  }

  if (status === "failed") {
    return <DashboardStateViews state="error" />;
  }

  if (status === "succeeded" && totalPeriodCount === 0) {
    return <DashboardStateViews state="empty" />;
  }

  if (status === "succeeded" && hasInsufficientPeriods) {
    return (
      <div className="rounded-lg border border-slate-700 bg-slate-900/30 p-3">
        <p className="text-sm text-slate-300">
          {t("dashboard.largestChangesInsufficientPeriods")}
        </p>
      </div>
    );
  }

  if (status !== "succeeded") {
    return <DashboardStateViews state="empty" />;
  }

  return (
    <section aria-label={t("dashboard.largestChangesRegion")}>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <label htmlFor="largest-changes-metric" className="text-xs text-slate-300">
            {t("dashboard.largestChangesMetricLabel")}
          </label>
          <select
            id="largest-changes-metric"
            className="rounded-md border border-slate-600 bg-slate-900 px-2 py-1 text-xs text-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
            value={metric}
            onChange={(event) => {
              setMetric(event.target.value as DeltaMetric);
            }}
            aria-label={t("dashboard.largestChangesMetricLabel")}
          >
            <option value="spent_total">{t("dashboard.largestChangesMetricSpent")}</option>
            <option value="received_total">{t("dashboard.largestChangesMetricReceived")}</option>
            <option value="remaining">{t("dashboard.largestChangesMetricRemaining")}</option>
            <option value="net">{t("dashboard.largestChangesMetricNet")}</option>
          </select>
        </div>
        <p className="text-xs text-slate-400">
          {t("dashboard.largestChangesComparedPeriods", {
            current: currentPeriodLabel,
            previous: previousPeriodLabel,
          })}
        </p>
      </div>

      {visibleRows.length === 0 ? (
        <p className="rounded-lg border border-slate-700 bg-slate-900/30 p-3 text-sm text-slate-300">
          {t("dashboard.largestChangesNoDifferences")}
        </p>
      ) : (
        <ul className="space-y-2" aria-label={t("dashboard.largestChangesListLabel")}>
          {visibleRows.map((row) => {
            const stateLabel =
              row.direction === "increase"
                ? t("dashboard.largestChangesDirectionIncrease")
                : row.direction === "decrease"
                ? t("dashboard.largestChangesDirectionDecrease")
                : t("dashboard.largestChangesDirectionUnchanged");
            const stateClass =
              row.direction === "increase"
                ? "border-red-700/70 text-red-200"
                : row.direction === "decrease"
                ? "border-emerald-700/70 text-emerald-200"
                : "border-slate-600 text-slate-300";
            const deltaSign = row.delta > 0 ? "+" : "";

            return (
              <li
                key={row.globalCategoryId}
                className="rounded-lg border border-slate-700 bg-slate-900/30 p-3"
              >
                <div className="mb-1 flex items-center justify-between gap-2">
                  <span className="text-sm font-medium text-slate-100">{row.categoryName}</span>
                  <span
                    className={`rounded-full border px-2 py-0.5 text-[11px] font-medium ${stateClass}`}
                  >
                    {stateLabel}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs text-slate-300 sm:grid-cols-3">
                  <span>{t("dashboard.largestChangesPreviousLabel")}</span>
                  <span>{t("dashboard.largestChangesCurrentLabel")}</span>
                  <span>{t("dashboard.largestChangesDeltaLabel")}</span>

                  <span className="font-medium text-slate-100">
                    {formatCurrency(row.previousValue, row.currencyCode)}
                  </span>
                  <span className="font-medium text-slate-100">
                    {formatCurrency(row.currentValue, row.currencyCode)}
                  </span>
                  <span className="font-medium text-slate-100">
                    {deltaSign}
                    {formatCurrency(row.delta, row.currencyCode)}
                  </span>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <button
        type="button"
        className="mt-3 rounded-md border border-slate-600 px-3 py-2 text-xs font-medium text-slate-200 hover:bg-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
        onClick={handleOpenPeriodDetails}
      >
        {t("dashboard.largestChangesOpenPeriod")}
      </button>
    </section>
  );
};

export default LargestChangesVsPreviousPeriodWidget;
