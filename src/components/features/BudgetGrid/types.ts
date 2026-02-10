/** Column identifiers for the budget grid */
export type GridColumnId =
  | "category"
  | "received_date"
  | "received_amount"
  | "spent_amount"
  | "remaining";

/** All columns in display order */
export const GRID_COLUMNS: readonly GridColumnId[] = [
  "category",
  "received_date",
  "received_amount",
  "spent_amount",
  "remaining",
] as const;

/** Currently selected cell in the grid (used by TASK-4.3) */
export interface SelectedCell {
  rowIndex: number;
  columnId: GridColumnId;
}

/** Ledger modal state — which category + received/spent (used by TASK-4.5) */
export interface LedgerModalState {
  budgetInstanceCategoryId: number;
  kind: "received" | "spent";
}

/** Column display configuration */
export interface GridColumnConfig {
  id: GridColumnId;
  label: string;
  /** Whether this column can trigger the ledger modal on double-click */
  openable: boolean;
  /** Alignment: "left" for text, "right" for numbers */
  align: "left" | "right";
  /** Whether this column is frozen/sticky during horizontal scroll */
  frozen: boolean;
  /** Whether the column has resize handles and user-adjustable width */
  resizable: boolean;
  /** Default width in pixels */
  defaultWidth: number;
}

/** Minimum column width in pixels (prevents columns from being dragged to zero). */
export const MIN_COLUMN_WIDTH = 60;

/** Column configuration for rendering */
export const COLUMN_CONFIG: readonly GridColumnConfig[] = [
  { id: "category", label: "Category", openable: false, align: "left", frozen: true, resizable: false, defaultWidth: 200 },
  { id: "received_date", label: "Received Date", openable: false, align: "left", frozen: true, resizable: false, defaultWidth: 160 },
  { id: "received_amount", label: "Received Amount", openable: true, align: "right", frozen: false, resizable: true, defaultWidth: 150 },
  { id: "spent_amount", label: "Spent Amount", openable: true, align: "right", frozen: false, resizable: true, defaultWidth: 150 },
  { id: "remaining", label: "Remaining", openable: false, align: "right", frozen: false, resizable: false, defaultWidth: 150 },
] as const;

/** Index of the last frozen column (used to apply right-side shadow separator) */
export const LAST_FROZEN_COL_INDEX = COLUMN_CONFIG.reduce<number>(
  (last, col, i) => (col.frozen ? i : last),
  -1,
);

/** Map of column IDs to their current widths in pixels. */
export type ColumnWidths = Record<GridColumnId, number>;

/** Snap mode for column resize snap-to-content-width behavior. */
export type SnapMode = "magnetic" | "detent";

/** Partial map of column IDs to their optimal (content-fit) widths. */
export type OptimalWidths = Partial<Record<GridColumnId, number>>;

/** Builds the default column widths from COLUMN_CONFIG. */
export const getDefaultColumnWidths = (): ColumnWidths => {
  const widths = {} as ColumnWidths;
  for (const col of COLUMN_CONFIG) {
    widths[col.id] = col.defaultWidth;
  }
  return widths;
};

/**
 * Computes the sticky left offset for a frozen column, based on the
 * cumulative widths of all preceding frozen columns.
 */
export const computeStickyLeft = (
  colIndex: number,
  columnWidths: ColumnWidths
): number => {
  let left = 0;
  for (let i = 0; i < colIndex; i++) {
    if (COLUMN_CONFIG[i].frozen) {
      left += columnWidths[COLUMN_CONFIG[i].id];
    }
  }
  return left;
};

/** The grid font string used for measureText calculations. */
export const GRID_FONT = '14px system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';

/** Horizontal cell padding in pixels (px-4 = 16px each side = 32px total). */
export const CELL_PADDING = 32;

/** Extra buffer in pixels for measureText inaccuracies. */
export const MEASURE_BUFFER = 4;
