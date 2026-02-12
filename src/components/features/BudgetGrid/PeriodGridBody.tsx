import { useAppSelector } from "../../../store/hooks";
import PeriodGridRow from "./PeriodGridRow";
import { COLUMN_CONFIG, LAST_FROZEN_COL_INDEX, computeStickyLeft } from "./types";
import type { ColumnWidths, SelectedCell, GridColumnId } from "./types";
import type { GridCategoryRow } from "../../../services/fileService";

interface PeriodGridBodyProps {
  rows: GridCategoryRow[];
  columnWidths: ColumnWidths;
  selectedCell: SelectedCell | null;
  onCellSelect: (rowIndex: number, columnId: GridColumnId) => void;
  onCellDoubleClick: (rowIndex: number, columnId: GridColumnId) => void;
}

/** Format a number as currency. */
const formatCurrency = (value: number, currencyCode: string): string => {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: currencyCode,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
};

/** Get Tailwind color classes for the remaining total. */
const getRemainingColorClasses = (remaining: number): string => {
  if (remaining > 0) return "bg-emerald-500/10 text-emerald-300";
  if (remaining < 0) return "bg-red-500/10 text-red-300";
  return "bg-amber-500/10 text-amber-300";
};

const PeriodGridBody = ({ rows, columnWidths, selectedCell, onCellSelect, onCellDoubleClick }: PeriodGridBodyProps) => {
  const showSpentMinus = useAppSelector((state) => state.budget.showSpentMinus);
  // Compute totals for the summary row
  const totals = rows.reduce(
    (acc, row) => ({
      receivedTotal: acc.receivedTotal + row.received_total,
      spentTotal: acc.spentTotal + row.spent_total,
      remaining: acc.remaining + row.remaining,
    }),
    { receivedTotal: 0, spentTotal: 0, remaining: 0 }
  );

  // Use currency from the first row, or default to CHF
  const currency = rows.length > 0 ? rows[0].default_currency : "CHF";

  return (
    <tbody>
      {rows.map((row, rowIndex) => (
        <PeriodGridRow
          key={row.budget_instance_category_id}
          row={row}
          rowIndex={rowIndex}
          columnWidths={columnWidths}
          selectedColumnId={
            selectedCell?.rowIndex === rowIndex ? selectedCell.columnId : null
          }
          onCellSelect={onCellSelect}
          onCellDoubleClick={onCellDoubleClick}
        />
      ))}

      {/* Summary / Totals Row */}
      {rows.length > 0 && (
        <tr
          className="border-t-2 border-slate-600 font-semibold bg-slate-800/80"
          aria-label="Summary totals"
        >
          {COLUMN_CONFIG.map((col, colIndex) => {
            let content = "";
            let colorClasses = "";

            const isFrozen = col.frozen;
            const isLastFrozen = colIndex === LAST_FROZEN_COL_INDEX;
            const isLastColumn = colIndex === COLUMN_CONFIG.length - 1;
            const width = columnWidths[col.id];
            const stickyLeft = isFrozen
              ? computeStickyLeft(colIndex, columnWidths)
              : 0;
            const stickyClasses = isFrozen
              ? `sticky z-10 bg-slate-800 ${isLastFrozen ? "shadow-[2px_0_4px_rgba(0,0,0,0.15)]" : ""}`
              : "";
            const separatorClass = isLastColumn ? "" : "border-r border-slate-600/40";

            switch (col.id) {
              case "category":
                content = "Total";
                break;
              case "received_date":
                content = "";
                break;
              case "received_amount":
                content = formatCurrency(totals.receivedTotal, currency);
                break;
              case "spent_amount":
                content = formatCurrency(
                  showSpentMinus ? -totals.spentTotal : totals.spentTotal,
                  currency
                );
                break;
              case "remaining":
                content = formatCurrency(totals.remaining, currency);
                colorClasses = getRemainingColorClasses(totals.remaining);
                break;
            }

            return (
              <td
                key={col.id}
                className={`px-4 py-2.5 text-sm break-words ${separatorClass} ${
                  col.align === "right" ? "text-right" : "text-left"
                } ${colorClasses} ${stickyClasses}`}
                style={{
                  width,
                  minWidth: width,
                  maxWidth: width,
                  ...(isFrozen ? { left: stickyLeft } : {}),
                }}
              >
                {content}
              </td>
            );
          })}
        </tr>
      )}
    </tbody>
  );
};

export default PeriodGridBody;
