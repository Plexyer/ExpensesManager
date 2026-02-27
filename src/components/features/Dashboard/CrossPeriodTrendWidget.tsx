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
import { listPeriods } from "../../../services/periodService";
import { formatCurrency } from "../../../utils/currency";
import DashboardStateViews from "./DashboardStateViews";

const PERIOD_COUNT_OPTIONS = [3, 6, 12] as const;
const ALL_PERIODS_OPTION = "all" as const;
type PeriodSelection = (typeof PERIOD_COUNT_OPTIONS)[number] | typeof ALL_PERIODS_OPTION;
const DEFAULT_PERIOD_SELECTION: PeriodSelection = ALL_PERIODS_OPTION;

interface TrendPoint {
  label: string;
  received: number;
  spent: number;
  net: number;
  currencyCode: string;
}

type TrendStatus = "idle" | "loading" | "succeeded" | "failed";

const CrossPeriodTrendWidget = () => {
  const { t } = useTranslation();
  const { isFileOpen } = useAppSelector((state) => state.file);
  const [status, setStatus] = useState<TrendStatus>("idle");
  const [totalPeriodCount, setTotalPeriodCount] = useState(0);
  const [trendPoints, setTrendPoints] = useState<TrendPoint[]>([]);
  const [selectedPeriodCount, setSelectedPeriodCount] =
    useState<PeriodSelection>(DEFAULT_PERIOD_SELECTION);

  useEffect(() => {
    if (!isFileOpen) {
      setStatus("idle");
      setTotalPeriodCount(0);
      setTrendPoints([]);
      return;
    }

    let cancelled = false;

    const loadTrendData = async () => {
      setStatus("loading");

      try {
        const periods = await listPeriods();
        const limit =
          selectedPeriodCount === ALL_PERIODS_OPTION
            ? undefined
            : selectedPeriodCount;
        const buckets = await listDashboardTimeSeries({
          granularity: "period",
          limit,
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
        setTotalPeriodCount(periods.length);
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
  }, [isFileOpen, selectedPeriodCount]);

  const chartCurrencyCode = useMemo(
    () => trendPoints[trendPoints.length - 1]?.currencyCode ?? "CHF",
    [trendPoints]
  );

  if (status === "loading") {
    return <DashboardStateViews state="loading" />;
  }

  if (status === "failed") {
    return <DashboardStateViews state="error" />;
  }

  if (status === "succeeded" && totalPeriodCount === 0) {
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
          <label htmlFor="trend-period-count" className="text-xs text-slate-300">
            {t("dashboard.trendPeriodCountLabel")}
          </label>
          <select
            id="trend-period-count"
            className="rounded-md border border-slate-600 bg-slate-900 px-2 py-1 text-xs text-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
            value={String(selectedPeriodCount)}
            onChange={(event) => {
              const nextValue = event.target.value;
              if (nextValue === ALL_PERIODS_OPTION) {
                setSelectedPeriodCount(ALL_PERIODS_OPTION);
                return;
              }

              const parsedValue = Number.parseInt(nextValue, 10);
              setSelectedPeriodCount(
                PERIOD_COUNT_OPTIONS.includes(parsedValue as (typeof PERIOD_COUNT_OPTIONS)[number])
                  ? (parsedValue as (typeof PERIOD_COUNT_OPTIONS)[number])
                  : DEFAULT_PERIOD_SELECTION
              );
            }}
            aria-label={t("dashboard.trendPeriodCountLabel")}
          >
            <option value={ALL_PERIODS_OPTION}>
              {t("dashboard.trendAllPeriodsOption")}
            </option>
            {PERIOD_COUNT_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>
        <p className="text-xs text-slate-400">
          {t("dashboard.trendPeriodsShown", {
            shown: trendPoints.length,
            total: totalPeriodCount,
          })}
        </p>
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
