import type { GridColumnConfig, GridColumnId } from "./types";
import { LAST_FROZEN_COL_INDEX } from "./types";
import type { GridCategoryRow } from "../../../services/fileService";

interface PeriodGridCellProps {
  columnConfig: GridColumnConfig;
  colIndex: number;
  row: GridCategoryRow;
}

/** Format a number as currency using the row's default_currency. */
const formatCurrency = (value: number, currencyCode: string): string => {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: currencyCode,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
};

/** Format the received date column (single date, range, or empty). */
const formatReceivedDate = (
  first: string | null,
  last: string | null
): string => {
  if (!first) return "";
  if (first === last) return first;
  return `${first} – ${last}`;
};

/** Get the display value for a cell based on column and row data. */
const getCellDisplayValue = (
  row: GridCategoryRow,
  columnId: GridColumnId
): string => {
  switch (columnId) {
    case "category":
      return row.category_name;
    case "received_date":
      return formatReceivedDate(
        row.first_received_date,
        row.last_received_date
      );
    case "received_amount":
      return formatCurrency(row.received_total, row.default_currency);
    case "spent_amount":
      return formatCurrency(row.spent_total, row.default_currency);
    case "remaining":
      return formatCurrency(row.remaining, row.default_currency);
  }
};

/** Get Tailwind classes for remaining column color coding. */
const getRemainingColorClasses = (remaining: number): string => {
  if (remaining > 0) return "bg-emerald-500/10 text-emerald-300";
  if (remaining < 0) return "bg-red-500/10 text-red-300";
  return "bg-amber-500/10 text-amber-300";
};

const PeriodGridCell = ({
  columnConfig,
  colIndex,
  row,
}: PeriodGridCellProps) => {
  const value = getCellDisplayValue(row, columnConfig.id);
  const isRemaining = columnConfig.id === "remaining";
  const isRightAligned = columnConfig.align === "right";
  const isFrozen = columnConfig.frozen;
  const isLastFrozen = colIndex === LAST_FROZEN_COL_INDEX;

  const colorClasses = isRemaining
    ? getRemainingColorClasses(row.remaining)
    : "";

  const stickyClasses = isFrozen
    ? `sticky z-10 bg-slate-800 ${isLastFrozen ? "shadow-[2px_0_4px_rgba(0,0,0,0.15)]" : ""}`
    : "";

  return (
    <td
      role="gridcell"
      className={`px-4 py-2.5 text-sm whitespace-nowrap border-b border-slate-700/50 ${
        isRightAligned ? "text-right" : "text-left"
      } ${colorClasses} ${stickyClasses}`}
      title={value}
      style={
        isFrozen
          ? {
              left: columnConfig.stickyLeft,
              minWidth: columnConfig.frozenWidth ?? undefined,
              width: columnConfig.frozenWidth ?? undefined,
            }
          : undefined
      }
    >
      {value}
    </td>
  );
};

export default PeriodGridCell;
