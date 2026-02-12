import { useTranslation } from "react-i18next";
import { COLUMN_CONFIG } from "./types";

const SKELETON_ROW_COUNT = 6;

const PeriodGridSkeleton = () => {
  const { t } = useTranslation();

  return (
    <div className="overflow-hidden rounded-lg border border-slate-700">
      <table
        role="grid"
        aria-label={t("grid.loadingBudgetCategories")}
        aria-busy="true"
        className="w-full border-collapse"
      >
        <thead>
          <tr>
            {COLUMN_CONFIG.map((col) => (
              <th
                key={col.id}
                scope="col"
                className={`bg-slate-800 px-4 py-3 text-xs font-semibold uppercase tracking-wider border-b-2 border-slate-600 ${
                  col.align === "right" ? "text-right" : "text-left"
                } text-slate-400`}
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: SKELETON_ROW_COUNT }).map((_, rowIndex) => (
            <tr key={rowIndex}>
              {COLUMN_CONFIG.map((col) => (
                <td
                  key={col.id}
                  className="px-4 py-2.5 border-b border-slate-700/50"
                >
                  <div
                    className={`h-4 animate-pulse bg-slate-700/50 rounded ${
                      col.id === "category" ? "w-28" : "w-20"
                    } ${col.align === "right" ? "ml-auto" : ""}`}
                  />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default PeriodGridSkeleton;
