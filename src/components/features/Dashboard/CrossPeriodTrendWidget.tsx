import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useAppSelector } from "../../../store/hooks";
import { listDashboardTimeSeries } from "../../../services/lineItemService";
import { formatCurrency } from "../../../utils/currency";
import DashboardStateViews from "./DashboardStateViews";

const GRANULARITY_OPTIONS = ["daily", "weekly", "period"] as const;
type GranularitySelection = (typeof GRANULARITY_OPTIONS)[number];

const TIMEFRAME_OPTIONS = ["30d", "90d", "180d", "all"] as const;
type TimeframeSelection = (typeof TIMEFRAME_OPTIONS)[number];

const DEFAULT_GRANULARITY: GranularitySelection = "weekly";
const DEFAULT_TIMEFRAME: TimeframeSelection = "all";

const LIMIT_BY_GRANULARITY: Record<GranularitySelection, number> = {
  daily: 180,
  weekly: 104,
  period: 60,
};

interface TrendPoint {
  label: string;
  received: number;
  spent: number;
  net: number;
  currencyCode: string;
}

interface DateRange {
  startDate?: string;
  endDate?: string;
}

type TrendStatus = "idle" | "loading" | "succeeded" | "failed";

const toIsoDate = (date: Date): string => date.toISOString().slice(0, 10);

const getTimeframeRange = (selection: TimeframeSelection): DateRange => {
  if (selection === "all") {
    return {};
  }

  const daysBackBySelection: Record<Exclude<TimeframeSelection, "all">, number> = {
    "30d": 30,
    "90d": 90,
    "180d": 180,
  };
  const endDate = new Date();
  const startDate = new Date(endDate);
  startDate.setDate(startDate.getDate() - daysBackBySelection[selection]);

  return {
    startDate: toIsoDate(startDate),
    endDate: toIsoDate(endDate),
  };
};

const CrossPeriodTrendWidget = () => {
  const { t } = useTranslation();
  const { isFileOpen } = useAppSelector((state) => state.file);
  const [status, setStatus] = useState<TrendStatus>("idle");
  const [totalBucketCount, setTotalBucketCount] = useState(0);
  const [trendPoints, setTrendPoints] = useState<TrendPoint[]>([]);
  const [selectedGranularity, setSelectedGranularity] =
    useState<GranularitySelection>(DEFAULT_GRANULARITY);
  const [selectedTimeframe, setSelectedTimeframe] =
    useState<TimeframeSelection>(DEFAULT_TIMEFRAME);

  useEffect(() => {
    if (!isFileOpen) {
      setStatus("idle");
      setTotalBucketCount(0);
      setTrendPoints([]);
      return;
    }

    let cancelled = false;

    const loadTrendData = async () => {
      setStatus("loading");

      try {
        const timeframeRange = getTimeframeRange(selectedTimeframe);
        const buckets = await listDashboardTimeSeries({
          granularity: selectedGranularity,
          limit: LIMIT_BY_GRANULARITY[selectedGranularity],
          start_date: timeframeRange.startDate,
          end_date: timeframeRange.endDate,
        });
        const points = buckets.map((bucket) => ({
          label: bucket.bucket_label || bucket.bucket_start_date,
          received: bucket.received_total,
          spent: bucket.spent_total,
          net: bucket.net_total,
          currencyCode: bucket.currency || "CHF",
        }));

        if (cancelled) {
          return;
        }

        setTrendPoints(points);
        setTotalBucketCount(buckets.length);
        setStatus("succeeded");
      } catch {
        if (!cancelled) {
          setStatus("failed");
        }
      }
    };

    void loadTrendData();

    return () => {
      cancelled = true;
    };
  }, [isFileOpen, selectedGranularity, selectedTimeframe]);

  const chartCurrencyCode = useMemo(
    () => trendPoints[trendPoints.length - 1]?.currencyCode ?? "CHF",
    [trendPoints]
  );
  const anomalyPoints = useMemo(() => {
    if (trendPoints.length === 0) {
      return [];
    }

    const averageMagnitude =
      trendPoints.reduce((sum, point) => sum + Math.abs(point.net), 0) /
      trendPoints.length;
    const anomalyThreshold = averageMagnitude * 1.5;

    return [...trendPoints]
      .filter((point) => Math.abs(point.net) >= anomalyThreshold && anomalyThreshold > 0)
      .sort((left, right) => Math.abs(right.net) - Math.abs(left.net))
      .slice(0, 3);
  }, [trendPoints]);

  if (status === "loading") {
    return <DashboardStateViews state="loading" />;
  }

  if (status === "failed") {
    return <DashboardStateViews state="error" />;
  }

  if (status === "succeeded" && totalBucketCount === 0) {
    return <DashboardStateViews state="empty" />;
  }

  if (status === "succeeded" && trendPoints.length < 2) {
    return (
      <div className="rounded-lg border border-slate-700 bg-slate-900/30 p-3">
        <p className="text-sm text-slate-300">
          {t("dashboard.trendInsufficientPeriods")}
        </p>
      </div>
    );
  }

  if (status !== "succeeded") {
    return <DashboardStateViews state="empty" />;
  }

  return (
    <section aria-label={t("dashboard.trendRegion")}>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <label htmlFor="trend-granularity" className="text-xs text-slate-300">
            {t("dashboard.trendGranularityLabel")}
          </label>
          <select
            id="trend-granularity"
            className="rounded-md border border-slate-600 bg-slate-900 px-2 py-1 text-xs text-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
            value={selectedGranularity}
            onChange={(event) =>
              setSelectedGranularity(event.target.value as GranularitySelection)
            }
            aria-label={t("dashboard.trendGranularityLabel")}
          >
            <option value="daily">{t("dashboard.trendGranularityDaily")}</option>
            <option value="weekly">{t("dashboard.trendGranularityWeekly")}</option>
            <option value="period">{t("dashboard.trendGranularityPeriod")}</option>
          </select>
        </div>
        <div className="flex items-center gap-2">
          <label htmlFor="trend-timeframe" className="text-xs text-slate-300">
            {t("dashboard.trendTimeframeLabel")}
          </label>
          <select
            id="trend-timeframe"
            className="rounded-md border border-slate-600 bg-slate-900 px-2 py-1 text-xs text-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
            value={selectedTimeframe}
            onChange={(event) =>
              setSelectedTimeframe(event.target.value as TimeframeSelection)
            }
            aria-label={t("dashboard.trendTimeframeLabel")}
          >
            <option value="30d">{t("dashboard.trendTimeframe30d")}</option>
            <option value="90d">{t("dashboard.trendTimeframe90d")}</option>
            <option value="180d">{t("dashboard.trendTimeframe180d")}</option>
            <option value="all">{t("dashboard.trendTimeframeAll")}</option>
          </select>
        </div>
        <p className="text-xs text-slate-400">
          {t("dashboard.trendBucketsShown", {
            shown: trendPoints.length,
            total: totalBucketCount,
          })}
        </p>
      </div>

      {selectedGranularity === "daily" && trendPoints.length > 60 && (
        <p className="mb-2 text-xs text-amber-300">{t("dashboard.trendDenseDataHint")}</p>
      )}

      <div className="mb-3 rounded-lg border border-slate-700 bg-slate-900/30 p-2">
        <p className="text-xs font-medium text-slate-200">{t("dashboard.trendAnomaliesLabel")}</p>
        {anomalyPoints.length === 0 ? (
          <p className="mt-1 text-xs text-slate-400">{t("dashboard.trendNoAnomalies")}</p>
        ) : (
          <ul className="mt-1 space-y-1 text-xs text-slate-300">
            {anomalyPoints.map((point) => (
              <li key={`${point.label}-${point.net}`}>
                {point.label}: {formatCurrency(point.net, point.currencyCode)}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="h-64 w-full" aria-label={t("dashboard.trendChartLabel")}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={trendPoints}>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
            <XAxis dataKey="label" tick={{ fill: "#94a3b8", fontSize: 12 }} />
            <YAxis tick={{ fill: "#94a3b8", fontSize: 12 }} />
            <Tooltip
              formatter={(value: number) =>
                formatCurrency(Number(value), chartCurrencyCode)
              }
            />
            <Legend />
            <Line
              type="monotone"
              dataKey="received"
              name={t("dashboard.trendReceivedLine")}
              stroke="#22c55e"
              strokeWidth={2}
              dot={{ r: 3 }}
            />
            <Line
              type="monotone"
              dataKey="spent"
              name={t("dashboard.trendSpentLine")}
              stroke="#ef4444"
              strokeWidth={2}
              dot={{ r: 3 }}
            />
            <Line
              type="monotone"
              dataKey="net"
              name={t("dashboard.trendNetLine")}
              stroke="#38bdf8"
              strokeWidth={2}
              strokeDasharray="4 3"
              dot={{ r: 3 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
};

export default CrossPeriodTrendWidget;
