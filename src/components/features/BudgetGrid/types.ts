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
  /** Pixel offset from the left edge for sticky positioning (only relevant if frozen) */
  stickyLeft: number;
  /** Fixed width in pixels for frozen columns (null = auto-sized) */
  frozenWidth: number | null;
}

/** Column configuration for rendering */
export const COLUMN_CONFIG: readonly GridColumnConfig[] = [
  { id: "category", label: "Category", openable: false, align: "left", frozen: true, stickyLeft: 0, frozenWidth: 200 },
  { id: "received_date", label: "Received Date", openable: false, align: "left", frozen: true, stickyLeft: 200, frozenWidth: 160 },
  { id: "received_amount", label: "Received Amount", openable: true, align: "right", frozen: false, stickyLeft: 0, frozenWidth: null },
  { id: "spent_amount", label: "Spent Amount", openable: true, align: "right", frozen: false, stickyLeft: 0, frozenWidth: null },
  { id: "remaining", label: "Remaining", openable: false, align: "right", frozen: false, stickyLeft: 0, frozenWidth: null },
] as const;

/** Index of the last frozen column (used to apply right-side shadow separator) */
export const LAST_FROZEN_COL_INDEX = COLUMN_CONFIG.reduce<number>(
  (last, col, i) => (col.frozen ? i : last),
  -1,
);
