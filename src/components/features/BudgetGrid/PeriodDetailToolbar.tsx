import { useState, useRef, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { saveDb } from "../../../services/fileService";
import { formatErrorMessage } from "../../../utils/formatErrorMessage";
import type { PeriodBudgetInstance } from "../../../types/period.types";

interface PeriodDetailToolbarProps {
  period: PeriodBudgetInstance | undefined;
  onBackToSelection: () => void;
}

/** Format cadence for display. */
const formatCadence = (cadence: string): string =>
  cadence.charAt(0).toUpperCase() + cadence.slice(1);

/** Format the date range. */
const formatDateRange = (startDate: string, endDate: string | null): string => {
  if (endDate) return `${startDate} to ${endDate}`;
  return startDate;
};

type SaveStatus = "idle" | "saving" | "saved" | "error";

const PeriodDetailToolbar = ({
  period,
  onBackToSelection,
}: PeriodDetailToolbarProps) => {
  const { t } = useTranslation();
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [saveError, setSaveError] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleSave = useCallback(async () => {
    if (saveStatus === "saving") return;

    // Clear any existing timer
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }

    setSaveStatus("saving");
    setSaveError(null);

    try {
      await saveDb();
      setSaveStatus("saved");
      // Auto-dismiss success after 2 seconds
      timerRef.current = setTimeout(() => {
        setSaveStatus("idle");
        timerRef.current = null;
      }, 2000);
    } catch (error) {
      setSaveError(formatErrorMessage(error, "Failed to save."));
      setSaveStatus("error");
      // Auto-dismiss error after 4 seconds
      timerRef.current = setTimeout(() => {
        setSaveStatus("idle");
        setSaveError(null);
        timerRef.current = null;
      }, 4000);
    }
  }, [saveStatus]);

  const name = period?.template_name ?? t("periods.budgetPeriod");

  /** Render the save button with current status. */
  const renderSaveButton = () => {
    switch (saveStatus) {
      case "saving":
        return (
          <button
            type="button"
            disabled
            className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-slate-400 bg-slate-700/50 rounded-lg cursor-not-allowed"
            aria-label={t("grid.savingLabel")}
            aria-busy="true"
          >
            <svg
              className="w-4 h-4 animate-spin"
              fill="none"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            {t("grid.saving")}
          </button>
        );

      case "saved":
        return (
          <span
            className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-emerald-400"
            role="status"
            aria-label={t("grid.savedLabel")}
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
            {t("grid.saved")}
          </span>
        );

      case "error":
        return (
          <span
            className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-red-400"
            role="alert"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            {saveError ?? t("grid.saveFailed")}
          </span>
        );

      default:
        return (
          <button
            type="button"
            onClick={handleSave}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500"
            aria-label={t("grid.savePeriodLabel")}
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4"
              />
            </svg>
            {t("grid.savePeriod")}
          </button>
        );
    }
  };

  return (
    <div className="flex items-center justify-between gap-4 px-1 py-2">
      {/* Left: Back to periods */}
      <button
        type="button"
        onClick={onBackToSelection}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-slate-300 hover:text-white hover:bg-slate-700/50 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500"
        aria-label={t("periods.backToSelection")}
      >
        <svg
          className="w-4 h-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 19l-7-7 7-7"
          />
        </svg>
        {t("periods.allPeriods")}
      </button>

      {/* Center: Period info */}
      {period && (
        <div className="flex items-center gap-3 min-w-0">
          <span className="text-sm font-semibold text-white truncate">
            {name}
          </span>
          <span className="text-xs px-2 py-0.5 rounded-full bg-slate-700/80 text-slate-300 font-medium flex-shrink-0">
            {formatCadence(period.cadence)}
          </span>
          <span className="text-xs text-slate-400 flex-shrink-0 hidden sm:inline">
            {formatDateRange(period.start_date, period.end_date)}
          </span>
        </div>
      )}

      {/* Right: Save button */}
      <div className="flex-shrink-0">{renderSaveButton()}</div>
    </div>
  );
};

export default PeriodDetailToolbar;
