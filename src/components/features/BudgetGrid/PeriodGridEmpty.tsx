import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

interface PeriodGridEmptyProps {
  /** Whether the file has no periods at all, vs. the selected period has no categories. */
  variant: "no-periods" | "no-categories";
  /** Callback to open the create period modal (only used for "no-periods" variant). */
  onCreatePeriod?: () => void;
}

const PeriodGridEmpty = ({ variant, onCreatePeriod }: PeriodGridEmptyProps) => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  if (variant === "no-categories") {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mb-4">
          <svg
            className="w-7 h-7 text-amber-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"
            />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-white mb-2">
          {t("periods.noCategoriesTitle")}
        </h3>
        <p className="text-slate-400 text-sm max-w-sm mb-4">
          {t("periods.noCategoriesDesc")}
        </p>
        <button
          type="button"
          onClick={() => navigate("/templates")}
          className="px-4 py-2 text-sm font-medium text-amber-400 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 rounded-lg transition-colors"
          aria-label={t("periods.goToTemplatesLabel")}
        >
          {t("periods.manageTemplates")}
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-14 h-14 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center mb-4">
        <svg
          className="w-7 h-7 text-blue-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
          />
        </svg>
      </div>
      <h3 className="text-lg font-medium text-white mb-2">
        {t("periods.noPeriodsTitle")}
      </h3>
      <p className="text-slate-400 text-sm max-w-sm mb-4">
        {t("periods.noPeriodsDesc")}
      </p>

      {/* Create Period button */}
      <button
        type="button"
        onClick={onCreatePeriod}
        className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500 mb-4"
        aria-label={t("periods.createFirstPeriodLabel")}
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
            d="M12 4v16m8-8H4"
          />
        </svg>
        {t("periods.createFirstPeriod")}
      </button>

      <p className="text-xs text-slate-500">
        {t("periods.needTemplate")}{" "}
        <button
          type="button"
          onClick={() => navigate("/templates")}
          className="text-blue-400 hover:text-blue-300 underline underline-offset-2"
          aria-label={t("periods.goToTemplatesLabel")}
        >
          {t("periods.goToTemplates")}
        </button>
      </p>
    </div>
  );
};

export default PeriodGridEmpty;
