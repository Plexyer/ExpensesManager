import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { listDashboardTimeSeries } from "../../../services/lineItemService";
import { formatCurrency } from "../../../utils/currency";
import DashboardStateViews from "./DashboardStateViews";

const GRANULARITY_OPTIONS = ["weekly", "period"] as const;
type GranularitySelection = (typeof GRANULARITY_OPTIONS)[number];

const TIMEFRAME_OPTIONS = ["90d", "180d", "all"] as const;
type TimeframeSelection = (typeof TIMEFRAME_OPTIONS)[number];

type ForecastStatus = "idle" | "loading" | "succeeded" | "failed";
type ForecastConfidence = "low" | "medium" | "high";
type RunwayBand = "critical" | "watch" | "stable";

interface DateRange {
  startDate?: string;
  endDate?: string;
}

interface ForecastSummary {
  averageReceived: number;
  averageSpent: number;
  averageNet: number;
  projectedNextNet: number;
  confidence: ForecastConfidence;
  runwayBand: RunwayBand;
  sampleSize: number;
}

const LIMIT_BY_GRANULARITY: Record<GranularitySelection, number> = {
  weekly: 104,
  period: 60,
};

const toIsoDate = (date: Date): string => date.toISOString().slice(0, 10);

const getTimeframeRange = (selection: TimeframeSelection): DateRange => {
  if (selection === "all") {
    return {};
  }

  const daysBackBySelection: Record<Exclude<TimeframeSelection, "all">, number> = {
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

const calculateLinearSlope = (values: number[]): number => {
  if (values.length < 2) {
    return 0;
  }

  const count = values.length;
  const xMean = (count - 1) / 2;
  const yMean = values.reduce((sum, value) => sum + value, 0) / count;

  let numerator = 0;
  let denominator = 0;

  values.forEach((value, index) => {
    const xDelta = index - xMean;
    const yDelta = value - yMean;
    numerator += xDelta * yDelta;
    denominator += xDelta * xDelta;
  });

  return denominator === 0 ? 0 : numerator / denominator;
};

const calculateVolatilityRatio = (values: number[]): number => {
  if (values.length < 2) {
    return 1;
  }

  const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
  const variance =
    values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / values.length;
  const standardDeviation = Math.sqrt(variance);

  return standardDeviation / Math.max(Math.abs(mean), 1);
};

const ForecastRunwayInsightsWidget = () => {
  const { t } = useTranslation();
  const [status, setStatus] = useState<ForecastStatus>("idle");
  const [selectedGranularity, setSelectedGranularity] =
    useState<GranularitySelection>("weekly");
  const [selectedTimeframe, setSelectedTimeframe] =
    useState<TimeframeSelection>("all");
  const [currencyCode, setCurrencyCode] = useState("CHF");
  const [forecastSummary, setForecastSummary] = useState<ForecastSummary | null>(null);
  const [hasInsufficientData, setHasInsufficientData] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const loadForecastData = async () => {
      setStatus("loading");

      try {
        const timeframeRange = getTimeframeRange(selectedTimeframe);
        const buckets = await listDashboardTimeSeries({
          granularity: selectedGranularity,
          limit: LIMIT_BY_GRANULARITY[selectedGranularity],
          start_date: timeframeRange.startDate,
          end_date: timeframeRange.endDate,
        });

        if (cancelled) {
          return;
        }

        if (buckets.length === 0) {
          setHasInsufficientData(false);
          setForecastSummary(null);
          setStatus("succeeded");
          return;
        }

        const orderedBuckets = [...buckets].sort((left, right) =>
          left.bucket_start_date.localeCompare(right.bucket_start_date)
        );
        const nets = orderedBuckets.map((bucket) => bucket.net_total);
        const averageNet = nets.reduce((sum, value) => sum + value, 0) / nets.length;
        const averageSpent =
          orderedBuckets.reduce((sum, bucket) => sum + bucket.spent_total, 0) /
          orderedBuckets.length;
        const averageReceived =
          orderedBuckets.reduce((sum, bucket) => sum + bucket.received_total, 0) /
          orderedBuckets.length;
        const netSlope = calculateLinearSlope(nets);
        const projectedNextNet = averageNet + netSlope;
        const volatilityRatio = calculateVolatilityRatio(nets);

        const isSparse = orderedBuckets.length < 3;
        const hasNoMeaningfulSpendBaseline = averageSpent < 1;
        const isHighlyVolatile = volatilityRatio > 1.25;
        const insufficientData = isSparse || hasNoMeaningfulSpendBaseline;

        let confidence: ForecastConfidence = "high";
        if (insufficientData || isHighlyVolatile || orderedBuckets.length < 6) {
          confidence = "low";
        } else if (volatilityRatio > 0.75 || orderedBuckets.length < 12) {
          confidence = "medium";
        }

        let runwayBand: RunwayBand = "stable";
        if (projectedNextNet <= averageSpent * -0.5) {
          runwayBand = "critical";
        } else if (projectedNextNet < 0 || volatilityRatio > 0.75) {
          runwayBand = "watch";
        }

        setCurrencyCode(orderedBuckets[orderedBuckets.length - 1]?.currency || "CHF");
        setHasInsufficientData(insufficientData);
        setForecastSummary({
          averageReceived,
          averageSpent,
          averageNet,
          projectedNextNet,
          confidence,
          runwayBand,
          sampleSize: orderedBuckets.length,
        });
        setStatus("succeeded");
      } catch {
        if (!cancelled) {
          setStatus("failed");
        }
      }
    };

    void loadForecastData();

    return () => {
      cancelled = true;
    };
  }, [selectedGranularity, selectedTimeframe]);

  const confidenceLabel = useMemo(() => {
    if (forecastSummary === null) {
      return "";
    }

    if (forecastSummary.confidence === "high") {
      return t("dashboard.forecastConfidenceHigh");
    }
    if (forecastSummary.confidence === "medium") {
      return t("dashboard.forecastConfidenceMedium");
    }
    return t("dashboard.forecastConfidenceLow");
  }, [forecastSummary, t]);

  const runwayBandLabel = useMemo(() => {
    if (forecastSummary === null) {
      return "";
    }

    if (forecastSummary.runwayBand === "critical") {
      return t("dashboard.forecastBandCritical");
    }
    if (forecastSummary.runwayBand === "watch") {
      return t("dashboard.forecastBandWatch");
    }
    return t("dashboard.forecastBandStable");
  }, [forecastSummary, t]);

  if (status === "loading") {
    return <DashboardStateViews state="loading" />;
  }

  if (status === "failed") {
    return <DashboardStateViews state="error" />;
  }

  if (status === "succeeded" && forecastSummary === null) {
    return <DashboardStateViews state="empty" />;
  }

  if (status !== "succeeded" || forecastSummary === null) {
    return <DashboardStateViews state="empty" />;
  }

  return (
    <section aria-label={t("dashboard.forecastRegion")}>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <label htmlFor="forecast-granularity" className="text-xs text-slate-300">
          {t("dashboard.forecastGranularityLabel")}
        </label>
        <select
          id="forecast-granularity"
          className="rounded-md border border-slate-600 bg-slate-900 px-2 py-1 text-xs text-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
          value={selectedGranularity}
          onChange={(event) =>
            setSelectedGranularity(event.target.value as GranularitySelection)
          }
          aria-label={t("dashboard.forecastGranularityLabel")}
        >
          <option value="weekly">{t("dashboard.forecastGranularityWeekly")}</option>
          <option value="period">{t("dashboard.forecastGranularityPeriod")}</option>
        </select>

        <label htmlFor="forecast-timeframe" className="ml-2 text-xs text-slate-300">
          {t("dashboard.forecastTimeframeLabel")}
        </label>
        <select
          id="forecast-timeframe"
          className="rounded-md border border-slate-600 bg-slate-900 px-2 py-1 text-xs text-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
          value={selectedTimeframe}
          onChange={(event) =>
            setSelectedTimeframe(event.target.value as TimeframeSelection)
          }
          aria-label={t("dashboard.forecastTimeframeLabel")}
        >
          <option value="90d">{t("dashboard.forecastTimeframe90d")}</option>
          <option value="180d">{t("dashboard.forecastTimeframe180d")}</option>
          <option value="all">{t("dashboard.forecastTimeframeAll")}</option>
        </select>
      </div>

      <div className="rounded-lg border border-slate-700 bg-slate-900/30 p-3">
        <p className="text-xs text-slate-400">
          {t("dashboard.forecastSamples", { count: forecastSummary.sampleSize })}
        </p>
        <p className="mt-1 text-sm text-slate-100">
          {t("dashboard.forecastRunwayBandLine", {
            band: runwayBandLabel,
            confidence: confidenceLabel,
          })}
        </p>
        {hasInsufficientData && (
          <p className="mt-1 text-xs text-amber-300">{t("dashboard.forecastInsufficientData")}</p>
        )}

        <div className="mt-3 grid grid-cols-1 gap-2 text-xs text-slate-300 sm:grid-cols-2">
          <p>
            {t("dashboard.forecastAverageReceived")}:{" "}
            <span className="font-medium text-slate-100">
              {formatCurrency(forecastSummary.averageReceived, currencyCode)}
            </span>
          </p>
          <p>
            {t("dashboard.forecastAverageSpent")}:{" "}
            <span className="font-medium text-slate-100">
              {formatCurrency(forecastSummary.averageSpent, currencyCode)}
            </span>
          </p>
          <p>
            {t("dashboard.forecastAverageNet")}:{" "}
            <span className="font-medium text-slate-100">
              {formatCurrency(forecastSummary.averageNet, currencyCode)}
            </span>
          </p>
          <p>
            {t("dashboard.forecastProjectedNextNet")}:{" "}
            <span className="font-medium text-slate-100">
              {formatCurrency(forecastSummary.projectedNextNet, currencyCode)}
            </span>
          </p>
        </div>
      </div>

      <div className="mt-3 rounded-lg border border-slate-700 bg-slate-900/30 p-3">
        <p className="text-xs font-medium text-slate-200">{t("dashboard.forecastAssumptionsTitle")}</p>
        <ul className="mt-1 list-disc space-y-1 pl-4 text-xs text-slate-300">
          <li>{t("dashboard.forecastAssumptionRecentPace")}</li>
          <li>{t("dashboard.forecastAssumptionNoFutureEvents")}</li>
          <li>{t("dashboard.forecastAssumptionDirectionOnly")}</li>
        </ul>
      </div>
    </section>
  );
};

export default ForecastRunwayInsightsWidget;
