import { useTranslation } from "react-i18next";
import type { GridColumnConfig, GridColumnId, ColumnWidths } from "./types";
import { COLUMN_CONFIG, LAST_FROZEN_COL_INDEX, computeStickyLeft } from "./types";
import type { GridCategoryRow } from "../../../services/fileService";
import { formatCurrency } from "../../../utils/currency";

interface PeriodGridCellProps {
  columnConfig: GridColumnConfig;
  colIndex: number;
  row: GridCategoryRow;
  columnWidths: ColumnWidths;
  isSelected: boolean;
  onSelect: () => void;
  onDoubleClick?: () => void;
}

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
  columnWidths,
  isSelected,
  onSelect,
  onDoubleClick,
}: PeriodGridCellProps) => {
  const { t } = useTranslation();
  const value = getCellDisplayValue(row, columnConfig.id);
  const isRemaining = columnConfig.id === "remaining";
  const isRightAligned = columnConfig.align === "right";
  const isFrozen = columnConfig.frozen;
  const isLastFrozen = colIndex === LAST_FROZEN_COL_INDEX;
  const width = columnWidths[columnConfig.id];
  const stickyLeft = isFrozen
    ? computeStickyLeft(colIndex, columnWidths)
    : 0;

  const colorClasses = isRemaining
    ? getRemainingColorClasses(row.remaining)
    : "";

  const stickyClasses = isFrozen
    ? `sticky z-10 bg-slate-800 ${isLastFrozen ? "shadow-[2px_0_4px_rgba(0,0,0,0.15)]" : ""}`
    : "";

  const isLastColumn = colIndex === COLUMN_CONFIG.length - 1;
  const separatorClass = isLastColumn ? "" : "border-r border-slate-600/40";

  const selectedClasses = isSelected
    ? "ring-2 ring-inset ring-blue-500 bg-blue-500/10"
    : "";

  const isOpenable = columnConfig.openable;

  const handleClick = () => {
    onSelect();
  };

  const handleDoubleClick = () => {
    if (isOpenable && onDoubleClick) {
      onDoubleClick();
    }
  };

  const openableClasses = isOpenable
    ? "underline decoration-dotted decoration-slate-500 underline-offset-4"
    : "";

  return (
    <td
      role="gridcell"
      tabIndex={isSelected ? 0 : -1}
      aria-selected={isSelected}
      className={`px-4 py-2.5 text-sm break-words border-b border-slate-700/50 cursor-pointer select-none outline-none ${separatorClass} ${
        isRightAligned ? "text-right" : "text-left"
      } ${colorClasses} ${stickyClasses} ${selectedClasses} ${openableClasses}`}
      title={isOpenable ? t("grid.doubleClickToView", { value }) : value}
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
      style={{
        width,
        minWidth: width,
        maxWidth: width,
        ...(isFrozen ? { left: stickyLeft } : {}),
      }}
    >
      {value}
    </td>
  );
};

export default PeriodGridCell;
