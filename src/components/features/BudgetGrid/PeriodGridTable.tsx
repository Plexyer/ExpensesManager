import { useCallback, useEffect, useRef, useState } from "react";
import { useAppSelector, useAppDispatch } from "../../../store/hooks";
import {
  setColumnWidth,
  setColumnWidths,
  saveColumnWidths,
  setOptimalWidths,
  setSelectedCell,
  clearSelectedCell,
} from "../../../store/slices/budgetSlice";
import PeriodGridHeader from "./PeriodGridHeader";
import PeriodGridBody from "./PeriodGridBody";
import CategoryLedgerModal from "./CategoryLedgerModal";
import type { GridCategoryRow } from "../../../services/fileService";
import type { GridColumnId, ColumnWidths, OptimalWidths, LedgerModalState } from "./types";
import {
  MIN_COLUMN_WIDTH,
  COLUMN_CONFIG,
  GRID_COLUMNS,
  GRID_FONT,
  CELL_PADDING,
  MEASURE_BUFFER,
} from "./types";

interface PeriodGridTableProps {
  rows: GridCategoryRow[];
  /** Called when transaction data changes (e.g. after adding a line item) so the grid can refresh. */
  onDataChanged?: () => void;
}

/**
 * Measures the pixel width of a string using an offscreen canvas.
 * Returns the width including cell padding and a small buffer.
 */
const measureTextWidth = (
  ctx: CanvasRenderingContext2D,
  text: string
): number => {
  if (!text) return 0;
  return Math.ceil(ctx.measureText(text).width) + CELL_PADDING + MEASURE_BUFFER;
};

/**
 * Format a number as currency string (mirrors PeriodGridCell logic).
 */
const formatCurrencyForMeasure = (
  value: number,
  currencyCode: string
): string => {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: currencyCode,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
};

/**
 * Format the received date column (mirrors PeriodGridCell logic).
 */
const formatReceivedDateForMeasure = (
  first: string | null,
  last: string | null
): string => {
  if (!first) return "";
  if (first === last) return first;
  return `${first} – ${last}`;
};

/**
 * Gets the raw display string for a cell given its column and row.
 */
const getCellText = (
  row: GridCategoryRow,
  columnId: GridColumnId
): string => {
  switch (columnId) {
    case "category":
      return row.category_name;
    case "received_date":
      return formatReceivedDateForMeasure(
        row.first_received_date,
        row.last_received_date
      );
    case "received_amount":
      return formatCurrencyForMeasure(row.received_total, row.default_currency);
    case "spent_amount":
      return formatCurrencyForMeasure(row.spent_total, row.default_currency);
    case "remaining":
      return formatCurrencyForMeasure(row.remaining, row.default_currency);
  }
};

/**
 * Computes the optimal (content-fit) width for every column by
 * measuring all cell values + header labels + summary values.
 */
const computeAllOptimalWidths = (
  rows: GridCategoryRow[]
): Record<GridColumnId, number> => {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    // Fallback: return default widths
    const fallback = {} as Record<GridColumnId, number>;
    for (const col of COLUMN_CONFIG) {
      fallback[col.id] = col.defaultWidth;
    }
    return fallback;
  }

  ctx.font = GRID_FONT;

  // Use a slightly bolder font for the header measurement (font-semibold / uppercase)
  const headerCtxFont = `600 12px system-ui, -apple-system, "Segoe UI", Roboto, sans-serif`;

  const widths = {} as Record<GridColumnId, number>;

  // Compute totals for summary row measurement
  const currency = rows.length > 0 ? rows[0].default_currency : "CHF";
  const totals = rows.reduce(
    (acc, row) => ({
      receivedTotal: acc.receivedTotal + row.received_total,
      spentTotal: acc.spentTotal + row.spent_total,
      remaining: acc.remaining + row.remaining,
    }),
    { receivedTotal: 0, spentTotal: 0, remaining: 0 }
  );

  for (const col of COLUMN_CONFIG) {
    let maxWidth = MIN_COLUMN_WIDTH;

    // Measure header label (uppercase, slightly smaller font)
    ctx.font = headerCtxFont;
    const headerWidth = measureTextWidth(ctx, col.label.toUpperCase());
    maxWidth = Math.max(maxWidth, headerWidth);

    // Measure all data row values
    ctx.font = GRID_FONT;
    for (const row of rows) {
      const text = getCellText(row, col.id);
      const w = measureTextWidth(ctx, text);
      maxWidth = Math.max(maxWidth, w);
    }

    // Measure summary row value
    let summaryText = "";
    switch (col.id) {
      case "category":
        summaryText = "Total";
        break;
      case "received_amount":
        summaryText = formatCurrencyForMeasure(totals.receivedTotal, currency);
        break;
      case "spent_amount":
        summaryText = formatCurrencyForMeasure(totals.spentTotal, currency);
        break;
      case "remaining":
        summaryText = formatCurrencyForMeasure(totals.remaining, currency);
        break;
    }
    if (summaryText) {
      // Summary row uses semibold font
      ctx.font = `600 14px system-ui, -apple-system, "Segoe UI", Roboto, sans-serif`;
      const summaryWidth = measureTextWidth(ctx, summaryText);
      maxWidth = Math.max(maxWidth, summaryWidth);
      ctx.font = GRID_FONT;
    }

    widths[col.id] = maxWidth;
  }

  return widths;
};

const PeriodGridTable = ({ rows, onDataChanged }: PeriodGridTableProps) => {
  const dispatch = useAppDispatch();
  const columnWidths = useAppSelector((state) => state.budget.columnWidths);
  const optimalWidths = useAppSelector((state) => state.budget.optimalWidths);
  const selectedCell = useAppSelector((state) => state.budget.selectedCell);

  /** Ref to the table wrapper for keyboard event handling. */
  const tableWrapperRef = useRef<HTMLDivElement>(null);

  /** Track whether we've already auto-sized for the current data set. */
  const autoSizedRef = useRef(false);

  /**
   * On data load: compute optimal widths for all columns.
   * For non-resizable columns (frozen + fixed-width like "Remaining"),
   * auto-size them to the optimal content width.
   * For resizable columns, store the optimal widths for snap logic.
   */
  useEffect(() => {
    if (rows.length === 0) {
      autoSizedRef.current = false;
      return;
    }

    const allOptimal = computeAllOptimalWidths(rows);

    // Store optimal widths for snap-to-content during resize (resizable columns only)
    const resizableOptimal: OptimalWidths = {};
    for (const col of COLUMN_CONFIG) {
      if (col.resizable) {
        resizableOptimal[col.id] = allOptimal[col.id];
      }
    }
    dispatch(setOptimalWidths(resizableOptimal));

    // Auto-size all non-resizable columns to their content width
    const autoSizeUpdates: Partial<Record<GridColumnId, number>> = {};
    for (const col of COLUMN_CONFIG) {
      if (!col.resizable) {
        autoSizeUpdates[col.id] = allOptimal[col.id];
      }
    }
    dispatch(setColumnWidths(autoSizeUpdates));

    autoSizedRef.current = true;
  }, [rows, dispatch]);

  /** Called on every mousemove during column drag — updates Redux immediately. */
  const handleColumnResize = useCallback(
    (columnId: GridColumnId, width: number) => {
      dispatch(
        setColumnWidth({ columnId, width: Math.max(width, MIN_COLUMN_WIDTH) })
      );
    },
    [dispatch]
  );

  /** Batch-update multiple column widths at once (for paired resize). */
  const handleColumnResizeBatch = useCallback(
    (updates: Partial<Record<GridColumnId, number>>) => {
      dispatch(setColumnWidths(updates));
    },
    [dispatch]
  );

  /** Called on mouseup after column drag ends — persists widths to the database. */
  const handleResizeEnd = useCallback(
    (updatedWidths: ColumnWidths) => {
      dispatch(saveColumnWidths(updatedWidths));
    },
    [dispatch]
  );

  /** Handle clicking a cell to select it (TASK-4.3). */
  const handleCellSelect = useCallback(
    (rowIndex: number, columnId: GridColumnId) => {
      dispatch(setSelectedCell({ rowIndex, columnId }));
    },
    [dispatch]
  );

  // ---- Ledger modal state (TASK-5.1) ----
  const [ledgerModal, setLedgerModal] = useState<{
    state: LedgerModalState;
    categoryName: string;
    currency: string;
  } | null>(null);

  /** Handle double-clicking an openable cell to show the ledger modal. */
  const handleCellDoubleClick = useCallback(
    (rowIndex: number, columnId: GridColumnId) => {
      const colConfig = COLUMN_CONFIG.find((c) => c.id === columnId);
      if (!colConfig?.openable) return;

      const row = rows[rowIndex];
      if (!row) return;

      const kind: "received" | "spent" =
        columnId === "received_amount" ? "received" : "spent";

      setLedgerModal({
        state: {
          budgetInstanceCategoryId: row.budget_instance_category_id,
          kind,
        },
        categoryName: row.category_name,
        currency: row.default_currency,
      });
    },
    [rows]
  );

  const handleCloseLedgerModal = useCallback(() => {
    setLedgerModal(null);
  }, []);

  /** Handle keyboard navigation on the grid (TASK-4.3). */
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (!selectedCell) return;

      const { rowIndex, columnId } = selectedCell;
      const colIndex = GRID_COLUMNS.indexOf(columnId);
      const rowCount = rows.length;
      const colCount = GRID_COLUMNS.length;

      let nextRow = rowIndex;
      let nextCol = colIndex;

      switch (e.key) {
        case "ArrowUp":
          nextRow = Math.max(0, rowIndex - 1);
          break;
        case "ArrowDown":
          nextRow = Math.min(rowCount - 1, rowIndex + 1);
          break;
        case "ArrowLeft":
          nextCol = Math.max(0, colIndex - 1);
          break;
        case "ArrowRight":
          nextCol = Math.min(colCount - 1, colIndex + 1);
          break;
        case "Home":
          nextCol = 0;
          if (e.ctrlKey) nextRow = 0;
          break;
        case "End":
          nextCol = colCount - 1;
          if (e.ctrlKey) nextRow = rowCount - 1;
          break;
        case "Tab":
          if (e.shiftKey) {
            nextCol = colIndex - 1;
            if (nextCol < 0) {
              nextCol = colCount - 1;
              nextRow = rowIndex - 1;
            }
          } else {
            nextCol = colIndex + 1;
            if (nextCol >= colCount) {
              nextCol = 0;
              nextRow = rowIndex + 1;
            }
          }
          // Stop Tab from leaving the grid if we still have cells
          if (nextRow >= 0 && nextRow < rowCount) {
            e.preventDefault();
          } else {
            return; // let default Tab behavior proceed (leave grid)
          }
          break;
        case "Enter": {
          // Open ledger modal on Enter for openable cells (TASK-5.1)
          const colConfig = COLUMN_CONFIG.find(
            (c) => c.id === columnId
          );
          if (colConfig?.openable) {
            handleCellDoubleClick(rowIndex, columnId);
            e.preventDefault();
          }
          return;
        }
        case "Escape":
          dispatch(clearSelectedCell());
          e.preventDefault();
          return;
        default:
          return; // Unhandled key — don't prevent default
      }

      e.preventDefault();

      // Clamp to valid range
      nextRow = Math.max(0, Math.min(rowCount - 1, nextRow));
      nextCol = Math.max(0, Math.min(colCount - 1, nextCol));

      dispatch(setSelectedCell({ rowIndex: nextRow, columnId: GRID_COLUMNS[nextCol] }));
    },
    [selectedCell, rows.length, dispatch]
  );

  return (
    <div
      ref={tableWrapperRef}
      className="overflow-auto max-h-[calc(100vh-14rem)] rounded-lg border border-slate-700 outline-none"
      tabIndex={0}
      role="region"
      aria-label="Budget grid navigation area"
      onKeyDown={handleKeyDown}
    >
      <table
        role="grid"
        aria-label="Budget categories"
        className="min-w-full border-collapse table-fixed text-slate-200"
      >
        <PeriodGridHeader
          columnWidths={columnWidths}
          optimalWidths={optimalWidths}
          onColumnResize={handleColumnResize}
          onColumnResizeBatch={handleColumnResizeBatch}
          onResizeEnd={handleResizeEnd}
        />
        <PeriodGridBody
          rows={rows}
          columnWidths={columnWidths}
          selectedCell={selectedCell}
          onCellSelect={handleCellSelect}
          onCellDoubleClick={handleCellDoubleClick}
        />
      </table>

      {/* Ledger modal (TASK-5.1, TASK-5.2) */}
      {ledgerModal && (
        <CategoryLedgerModal
          ledgerState={ledgerModal.state}
          categoryName={ledgerModal.categoryName}
          currency={ledgerModal.currency}
          onClose={handleCloseLedgerModal}
          onDataChanged={onDataChanged}
        />
      )}
    </div>
  );
};

export default PeriodGridTable;
