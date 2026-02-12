import { useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { save } from "@tauri-apps/plugin-dialog";
import { exportCsvToFile } from "../../../services/exportService";
import { formatErrorMessage } from "../../../utils/formatErrorMessage";

type ExportState = "idle" | "exporting" | "success" | "error";

const CSV_FILTER = {
  name: "CSV Files",
  extensions: ["csv"],
};

const ExportSettings = () => {
  const { t } = useTranslation();
  const [exportState, setExportState] = useState<ExportState>("idle");
  const [errorMessage, setErrorMessage] = useState<string>("");

  const handleExportCsv = useCallback(async () => {
    try {
      // Open save dialog
      const path = await save({
        title: t("export.exportCsv"),
        filters: [CSV_FILTER],
        defaultPath: "finance_export.csv",
      });

      // User cancelled dialog
      if (!path) return;

      // Ensure .csv extension
      const finalPath = path.endsWith(".csv") ? path : `${path}.csv`;

      setExportState("exporting");
      setErrorMessage("");

      await exportCsvToFile(finalPath);

      setExportState("success");
      setTimeout(() => setExportState("idle"), 2500);
    } catch (err) {
      setErrorMessage(formatErrorMessage(err, "Failed to export CSV."));
      setExportState("error");
      setTimeout(() => setExportState("idle"), 4000);
    }
  }, [t]);

  const isExporting = exportState === "exporting";

  return (
    <section
      aria-labelledby="export-settings-heading"
      className="bg-slate-800/50 border border-slate-700 rounded-xl p-6"
    >
      <h2
        id="export-settings-heading"
        className="text-lg font-medium text-white mb-4"
      >
        {t("export.title")}
      </h2>

      <p className="text-sm text-slate-300 mb-4">
        {t("export.description")}
      </p>

      {/* NON-NEGOTIABLE: Export button must NEVER be disabled based on license or app mode.
          The only valid disabled condition is isExporting (during active export). */}
      <button
        type="button"
        onClick={handleExportCsv}
        disabled={isExporting}
        aria-label={t("export.exportCsvLabel")}
        className={`inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
          isExporting
            ? "bg-slate-700 text-slate-400 cursor-not-allowed"
            : "bg-emerald-500 hover:bg-emerald-600 text-white"
        }`}
      >
        {isExporting ? (
          <>
            {/* Spinner icon */}
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
            {t("export.exporting")}
          </>
        ) : (
          <>
            {/* Download icon */}
            <svg
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3"
              />
            </svg>
            {t("export.exportCsv")}
          </>
        )}
      </button>

      {/* Success message */}
      {exportState === "success" && (
        <div
          className="mt-3 flex items-center gap-2 text-sm text-emerald-400"
          role="status"
          aria-live="polite"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M4.5 12.75l6 6 9-13.5"
            />
          </svg>
          {t("export.exportSuccess")}
        </div>
      )}

      {/* Error message */}
      {exportState === "error" && (
        <div
          className="mt-3 flex items-start gap-2 text-sm text-red-400"
          role="alert"
          aria-live="assertive"
        >
          <svg
            className="w-4 h-4 mt-0.5 flex-shrink-0"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"
            />
          </svg>
          <span>{t("errors.exportFailed", { message: errorMessage || t("errors.unknownError") })}</span>
        </div>
      )}
    </section>
  );
};

export default ExportSettings;
