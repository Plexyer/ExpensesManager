import { useTranslation } from "react-i18next";
import { useAppSelector, useAppDispatch } from "../../../store/hooks";
import {
  setShowSpentMinus,
  saveShowSpentMinus,
} from "../../../store/slices/budgetSlice";

const PeriodTableSettings = () => {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const showSpentMinus = useAppSelector((state) => state.budget.showSpentMinus);

  const handleToggle = () => {
    const newValue = !showSpentMinus;
    dispatch(setShowSpentMinus(newValue));
    dispatch(saveShowSpentMinus(newValue));
  };

  return (
    <section
      aria-labelledby="period-table-settings-heading"
      className="bg-slate-800/50 border border-slate-700 rounded-xl p-6"
    >
      <h2
        id="period-table-settings-heading"
        className="text-lg font-medium text-white mb-4"
      >
        {t("settings.periodTable")}
      </h2>

      {/* Show spent minus toggle */}
      <div className="flex items-start gap-4">
        <div className="flex-1 min-w-0">
          <label
            htmlFor="show-spent-minus"
            className="text-sm font-medium text-white cursor-pointer"
          >
            {t("settings.showSpentMinus")}
          </label>
          <p className="text-xs text-slate-400 mt-0.5">
            {t("settings.showSpentMinusDesc")}
          </p>

          {/* Preview */}
          <div className="mt-3 flex items-center gap-3">
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">
              {t("settings.preview")}
            </span>
            <div
              className={`px-3 py-1.5 rounded-lg border text-sm font-mono tabular-nums transition-colors ${
                showSpentMinus
                  ? "border-blue-500/40 bg-blue-500/10 text-blue-300"
                  : "border-slate-600/50 bg-slate-700/30 text-slate-300"
              }`}
              aria-live="polite"
            >
              {showSpentMinus
                ? t("settings.previewOn")
                : t("settings.previewOff")}
            </div>
          </div>
        </div>

        {/* Toggle switch */}
        <button
          id="show-spent-minus"
          type="button"
          role="switch"
          aria-checked={showSpentMinus}
          aria-label={t("settings.showSpentMinus")}
          onClick={handleToggle}
          className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-slate-900 ${
            showSpentMinus ? "bg-blue-600" : "bg-slate-600"
          }`}
        >
          <span
            aria-hidden="true"
            className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-lg ring-0 transition-transform ${
              showSpentMinus ? "translate-x-5" : "translate-x-0"
            }`}
          />
        </button>
      </div>
    </section>
  );
};

export default PeriodTableSettings;
