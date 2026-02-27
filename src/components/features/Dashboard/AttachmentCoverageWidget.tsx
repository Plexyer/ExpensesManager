import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { type GridCategoryRow } from "../../../services/fileService";
import { getAttachmentCounts } from "../../../services/attachmentService";
import { listLineItems } from "../../../services/lineItemService";
import { useAppSelector } from "../../../store/hooks";
import type { LineItem } from "../../../types/lineItem.types";
import DashboardStateViews from "./DashboardStateViews";
import {
  getDedupedGridData,
  getDedupedPeriods,
} from "./dashboardRequestDeduper";

type CoverageStatus = "idle" | "loading" | "succeeded" | "failed";

interface CoverageBucket {
  covered: number;
  total: number;
  percentage: number | null;
}

interface AttachmentCoverageMetrics {
  received: CoverageBucket;
  spent: CoverageBucket;
  overall: CoverageBucket;
  totalAttachmentCount: number;
}

const EMPTY_BUCKET: CoverageBucket = { covered: 0, total: 0, percentage: null };

const sortPeriodsDescending = <T extends { start_date: string }>(periods: T[]) =>
  [...periods].sort(
    (left, right) =>
      new Date(right.start_date).getTime() - new Date(left.start_date).getTime()
  );

const toCoverageBucket = (covered: number, total: number): CoverageBucket => ({
  covered,
  total,
  percentage: total === 0 ? null : (covered / total) * 100,
});

const toAttachmentTotal = (counts: Record<string, number>): number =>
  Object.values(counts).reduce((sum, count) => sum + count, 0);

const toCoveredCount = (lineItems: LineItem[], counts: Record<string, number>): number =>
  lineItems.reduce(
    (sum, lineItem) => sum + ((counts[String(lineItem.line_item_id)] ?? 0) > 0 ? 1 : 0),
    0
  );

const AttachmentCoverageWidget = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { isFileOpen } = useAppSelector((state) => state.file);
  const { currentBudgetInstanceId } = useAppSelector((state) => state.budget);
  const [status, setStatus] = useState<CoverageStatus>("idle");
  const [periodLabel, setPeriodLabel] = useState("");
  const [hasAnyPeriod, setHasAnyPeriod] = useState(false);
  const [metrics, setMetrics] = useState<AttachmentCoverageMetrics>({
    received: EMPTY_BUCKET,
    spent: EMPTY_BUCKET,
    overall: EMPTY_BUCKET,
    totalAttachmentCount: 0,
  });

  useEffect(() => {
    if (!isFileOpen) {
      setStatus("idle");
      setPeriodLabel("");
      setHasAnyPeriod(false);
      setMetrics({
        received: EMPTY_BUCKET,
        spent: EMPTY_BUCKET,
        overall: EMPTY_BUCKET,
        totalAttachmentCount: 0,
      });
      return;
    }

    let cancelled = false;

    const loadCoverage = async () => {
      setStatus("loading");

      try {
        const periods = await getDedupedPeriods();
        const sortedPeriods = sortPeriodsDescending(periods);

        if (cancelled) {
          return;
        }

        if (sortedPeriods.length === 0) {
          setHasAnyPeriod(false);
          setPeriodLabel("");
          setMetrics({
            received: EMPTY_BUCKET,
            spent: EMPTY_BUCKET,
            overall: EMPTY_BUCKET,
            totalAttachmentCount: 0,
          });
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
        const gridData = await getDedupedGridData(currentPeriod.budget_instance_id);
        const rows: GridCategoryRow[] = gridData.rows;

        const lineItemPairs = await Promise.all(
          rows.map(async (row) => {
            const [receivedItems, spentItems] = await Promise.all([
              listLineItems(row.budget_instance_category_id, "received"),
              listLineItems(row.budget_instance_category_id, "spent"),
            ]);
            return { receivedItems, spentItems };
          })
        );

        if (cancelled) {
          return;
        }

        const receivedLineItems = lineItemPairs.flatMap((pair) => pair.receivedItems);
        const spentLineItems = lineItemPairs.flatMap((pair) => pair.spentItems);
        const allLineItems = [...receivedLineItems, ...spentLineItems];
        const lineItemIds = allLineItems.map((lineItem) => lineItem.line_item_id);
        const attachmentCounts =
          lineItemIds.length > 0 ? await getAttachmentCounts(lineItemIds) : {};

        if (cancelled) {
          return;
        }

        const receivedCovered = toCoveredCount(receivedLineItems, attachmentCounts);
        const spentCovered = toCoveredCount(spentLineItems, attachmentCounts);
        const overallCovered = toCoveredCount(allLineItems, attachmentCounts);

        setHasAnyPeriod(true);
        setPeriodLabel(currentPeriod.template_name || currentPeriod.start_date);
        setMetrics({
          received: toCoverageBucket(receivedCovered, receivedLineItems.length),
          spent: toCoverageBucket(spentCovered, spentLineItems.length),
          overall: toCoverageBucket(overallCovered, allLineItems.length),
          totalAttachmentCount: toAttachmentTotal(attachmentCounts),
        });
        setStatus("succeeded");
      } catch {
        if (!cancelled) {
          setStatus("failed");
        }
      }
    };

    void loadCoverage();

    return () => {
      cancelled = true;
    };
  }, [currentBudgetInstanceId, isFileOpen]);

  const hasNoTransactions = useMemo(() => metrics.overall.total === 0, [metrics.overall.total]);

  const handleOpenPeriodDetails = () => {
    navigate("/periods");
  };

  if (status === "loading") {
    return <DashboardStateViews state="loading" />;
  }

  if (status === "failed") {
    return <DashboardStateViews state="error" />;
  }

  if (status === "succeeded" && !hasAnyPeriod) {
    return <DashboardStateViews state="empty" />;
  }

  if (status !== "succeeded") {
    return <DashboardStateViews state="empty" />;
  }

  return (
    <section aria-label={t("dashboard.attachmentCoverageRegion")}>
      <p className="mb-3 text-xs text-slate-400">
        {t("dashboard.attachmentCoveragePeriodLabel", { period: periodLabel })}
      </p>

      <ul className="space-y-2" aria-label={t("dashboard.attachmentCoverageListLabel")}>
        {[
          {
            key: "received",
            label: t("dashboard.attachmentCoverageReceivedLabel"),
            bucket: metrics.received,
          },
          {
            key: "spent",
            label: t("dashboard.attachmentCoverageSpentLabel"),
            bucket: metrics.spent,
          },
          {
            key: "overall",
            label: t("dashboard.attachmentCoverageOverallLabel"),
            bucket: metrics.overall,
          },
        ].map((item) => (
          <li
            key={item.key}
            className="rounded-lg border border-slate-700 bg-slate-900/30 p-3"
          >
            <p className="text-sm font-medium text-slate-100">{item.label}</p>
            <p className="mt-1 text-xs text-slate-300">
              {t("dashboard.attachmentCoverageCoveredLine", {
                covered: item.bucket.covered,
                total: item.bucket.total,
              })}
            </p>
            <p className="text-xs text-slate-400">
              {t("dashboard.attachmentCoveragePercentLine", {
                value:
                  item.bucket.percentage === null
                    ? t("dashboard.attachmentCoverageNotApplicable")
                    : `${item.bucket.percentage.toFixed(1)}%`,
              })}
            </p>
          </li>
        ))}
      </ul>

      <p className="mt-3 text-xs text-slate-300">
        {t("dashboard.attachmentCoverageTotalAttachments", {
          count: metrics.totalAttachmentCount,
        })}
      </p>

      {hasNoTransactions && (
        <p className="mt-2 rounded-lg border border-slate-700 bg-slate-900/30 p-3 text-sm text-slate-300">
          {t("dashboard.attachmentCoverageNoTransactions")}
        </p>
      )}

      <button
        type="button"
        className="mt-3 rounded-md border border-slate-600 px-3 py-2 text-xs font-medium text-slate-200 hover:bg-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
        onClick={handleOpenPeriodDetails}
      >
        {t("dashboard.attachmentCoverageOpenPeriod")}
      </button>
    </section>
  );
};

export default AttachmentCoverageWidget;
