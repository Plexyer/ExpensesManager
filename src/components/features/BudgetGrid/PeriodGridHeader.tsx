import { COLUMN_CONFIG, LAST_FROZEN_COL_INDEX } from "./types";

const PeriodGridHeader = () => {
  return (
    <thead>
      <tr>
        {COLUMN_CONFIG.map((col, colIndex) => {
          const isFrozen = col.frozen;
          const isLastFrozen = colIndex === LAST_FROZEN_COL_INDEX;

          // Frozen header cells stick both vertically (top) and horizontally (left).
          // Non-frozen header cells only stick vertically.
          const zClass = isFrozen ? "z-30" : "z-20";
          const shadowClass = isLastFrozen
            ? "shadow-[2px_0_4px_rgba(0,0,0,0.15)]"
            : "";

          return (
            <th
              key={col.id}
              scope="col"
              className={`sticky top-0 ${zClass} ${shadowClass} bg-slate-800 px-4 py-3 text-xs font-semibold uppercase tracking-wider border-b-2 border-slate-600 ${
                col.align === "right" ? "text-right" : "text-left"
              } text-slate-400`}
              style={
                isFrozen
                  ? {
                      left: col.stickyLeft,
                      minWidth: col.frozenWidth ?? undefined,
                      width: col.frozenWidth ?? undefined,
                    }
                  : undefined
              }
            >
              {col.label}
            </th>
          );
        })}
      </tr>
    </thead>
  );
};

export default PeriodGridHeader;
