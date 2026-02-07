# Grid Component Architecture

> **Task**: TASK-4.1: Design Grid Component  
> **Created**: 2026-02-07  
> **Status**: CONFIRMED

---

## Table of Contents

1. [Overview](#overview)
2. [Library Decision](#library-decision)
3. [Component Hierarchy](#component-hierarchy)
4. [State Management](#state-management)
5. [Column Definitions](#column-definitions)
6. [Cell Rendering Strategy](#cell-rendering-strategy)
7. [Keyboard Navigation](#keyboard-navigation)
8. [Frozen Headers & Columns](#frozen-headers--columns)
9. [Loading & Empty States](#loading--empty-states)
10. [Accessibility](#accessibility)
11. [Performance](#performance)
12. [Data Flow](#data-flow)
13. [Future Considerations](#future-considerations)

---

## Overview

The main grid displays **one period budget instance at a time**. Each row represents a budget category (envelope). Users interact with the grid in an Excel-like manner: click to select cells, arrow keys to navigate, double-click or F2 to open a line-item modal.

**Key Constraints**:
- Modal-only editing (no inline editing for MVP)
- Tailwind CSS v4 for ALL styling (no CSS files, no inline styles)
- No new dependencies without explicit approval
- Desktop-first (Windows 11 MVP target)

---

## Library Decision

### Options Evaluated

| Criteria | Custom `<table>` + CSS Sticky | TanStack Table v8 | AG Grid Community |
|----------|-------------------------------|--------------------|--------------------|
| **Bundle size** | 0 KB (no dependency) | ~15 KB | ~200 KB+ |
| **Excel-like features** | Build selection/nav manually | Build selection/nav manually | Built-in |
| **Tailwind integration** | Full control | Full control (headless) | Possible but heavy theming |
| **Setup complexity** | Low (plain HTML table) | Medium (column defs + hooks) | Medium-High (config + theme) |
| **Virtualization** | Manual (react-window) | Via @tanstack/react-virtual | Built-in |
| **Future extensibility** | Full control, more code | Add sorting/filtering later | Many features built-in |

### Decision: Custom HTML Table + CSS Sticky

**Chosen**: **(b) Custom `<table>` + CSS sticky** for the following reasons:

1. **No new dependencies** — avoids the approval step and keeps the bundle lean.
2. **MVP grid is simple** — 5 columns, ~10–50 rows. No virtualization needed. No sorting/filtering for MVP.
3. **Full Tailwind control** — all styling via utility classes, matching project conventions.
4. **Sticky header/column** is straightforward with Tailwind (`sticky top-0`, `sticky left-0`).
5. **Selection + keyboard nav** — a small amount of local state + one `useEffect` keydown handler. TanStack Table doesn't provide these either (headless); both approaches require the same manual implementation.
6. **Migration path** — can swap to TanStack Table v8 later if sorting, filtering, or column reordering are needed. The component hierarchy is designed to make this swap easy.

**Alternative (if approved later)**: TanStack Table v8 — headless, small bundle, good for "simple grid now, add features later" without AG Grid weight. Would require new dependency approval.

---

## Component Hierarchy

### File Structure

```
src/components/features/BudgetGrid/
├── PeriodGrid.tsx              # Top-level container: data loading, selection, keyboard, modal trigger
├── PeriodGridTable.tsx         # Semantic <table> with role="grid", scroll wrapper
├── PeriodGridHeader.tsx        # <thead>: column headers with sticky positioning
├── PeriodGridBody.tsx          # <tbody>: maps rows, renders PeriodGridRow + totals row
├── PeriodGridRow.tsx           # <tr>: one cell per column, click/dblclick handlers
├── PeriodGridCell.tsx          # <td>: role="gridcell", formatted value, color, tooltip
├── PeriodGridSkeleton.tsx      # Loading skeleton (same table layout, placeholder cells)
├── PeriodGridEmpty.tsx         # Empty state when no periods/categories exist
└── types.ts                    # GridColumnId, SelectedCell, column config types
```

### Component Responsibilities

#### `PeriodGrid` (Container)
- Fetches grid data via `getGridData(budgetInstanceId)` from `fileService.ts`
- Dispatches Redux actions to store/update grid data
- Owns local state: `selectedCell`, `ledgerModal`
- Registers keyboard handler (`useEffect` on `keydown`)
- Renders: `PeriodGridSkeleton` when loading, `PeriodGridEmpty` when no data, `PeriodGridTable` with data
- Passes `selectedCell`, `onSelectCell`, `onOpenLedger` down to children

#### `PeriodGridTable` (Layout)
- Renders a scrollable wrapper `<div>` with `overflow-auto` and constrained height
- Renders a single `<table>` with `role="grid"`, `aria-label`, and `tabIndex={0}`
- Composes `PeriodGridHeader` and `PeriodGridBody`

#### `PeriodGridHeader` (Column Headers)
- Renders `<thead>` with one `<tr>` containing `<th>` for each column
- First `<th>` gets `sticky left-0` + `sticky top-0` (corner cell)
- All `<th>` get `sticky top-0` for frozen header row
- Displays column names: Category | Received Date | Received Amount | Spent Amount | Remaining

#### `PeriodGridBody` (Rows)
- Maps `rows[]` to `<PeriodGridRow>` components
- Renders a **summary/totals row** as the last `<tr>` with aggregated values

#### `PeriodGridRow` (Single Row)
- Renders `<tr>` with one `<PeriodGridCell>` per column
- Props: `row`, `rowIndex`, `isSelected`, `selectedColumnId`, `onSelectCell`, `onOpenLedger`
- First `<td>` (Category) gets `sticky left-0` for frozen first column
- `onClick` → `onSelectCell(rowIndex, columnId)`
- `onDoubleClick` → `onOpenLedger(budgetInstanceCategoryId, kind)` (only for received_amount / spent_amount columns)

#### `PeriodGridCell` (Single Cell)
- Props: `columnId`, `value`, `row`, `isSelected`, `onSelect`, `onDoubleClick`
- Renders formatted value (currency, date, or text depending on column)
- Applies color-coding classes for "remaining" column
- Sets `role="gridcell"`, `aria-selected`, `tabIndex` based on selection
- Shows tooltip on hover (`title` attribute) with additional context

#### `PeriodGridSkeleton` (Loading)
- Same column structure as the real table
- Cells are animated pulse blocks (`animate-pulse bg-slate-700/50 rounded`)
- Shows 5–8 skeleton rows to approximate expected content

#### `PeriodGridEmpty` (Empty State)
- Message: "No periods yet. Create your first period to get started."
- "Create Period" call-to-action button
- If periods exist but no categories: "No categories in this period."

#### `types.ts` (Grid Types)

```typescript
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

/** Currently selected cell in the grid */
export interface SelectedCell {
  rowIndex: number;
  columnId: GridColumnId;
}

/** Ledger modal state (which category + received/spent) */
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
}

/** Column configuration for rendering */
export const COLUMN_CONFIG: readonly GridColumnConfig[] = [
  { id: "category", label: "Category", openable: false, align: "left" },
  { id: "received_date", label: "Received Date", openable: false, align: "left" },
  { id: "received_amount", label: "Received Amount", openable: true, align: "right" },
  { id: "spent_amount", label: "Spent Amount", openable: true, align: "right" },
  { id: "remaining", label: "Remaining", openable: false, align: "right" },
] as const;
```

---

## State Management

### Redux (Global State)

A new **`budgetSlice`** will be added to the Redux store:

```typescript
// src/store/slices/budgetSlice.ts
interface BudgetState {
  /** Currently viewed period's budget instance ID */
  currentBudgetInstanceId: number | null;
  /** Grid data for the current period */
  gridData: GetGridDataResult | null;
  /** Loading status for grid data */
  gridDataStatus: "idle" | "loading" | "succeeded" | "failed";
  /** Error message if grid data load failed */
  gridDataError: string | null;
}
```

**Redux owns**:
- `currentBudgetInstanceId` — which period is currently displayed
- `gridData` — the category rows with rollup totals from `getGridData()`
- `gridDataStatus` — loading state for skeleton/error rendering
- `gridDataError` — error message for user feedback

**Async thunk**: `fetchGridData(budgetInstanceId)` — calls `getGridData()`, stores result in `gridData`

**Refetch triggers**:
- Period changes (user navigates to different period)
- Modal saves/deletes line items (modal close → dispatch `fetchGridData`)

### Local React State (UI-Only)

These stay in `PeriodGrid` component, NOT in Redux:

```typescript
// In PeriodGrid.tsx
const [selectedCell, setSelectedCell] = useState<SelectedCell | null>(null);
const [ledgerModal, setLedgerModal] = useState<LedgerModalState | null>(null);
```

**Why local**: Selection and modal state are transient UI concerns. They don't need to persist across navigation or be shared with other components. Keeping them local simplifies the store and avoids unnecessary re-renders.

---

## Column Definitions

### MVP Columns

| # | Column ID | Header Label | Source Field | Editable | Format |
|---|-----------|-------------|-------------|----------|--------|
| 1 | `category` | Category | `category_name` | No | Plain text |
| 2 | `received_date` | Received Date | `first_received_date` / `last_received_date` | No | Date or date range |
| 3 | `received_amount` | Received Amount | `received_total` | Via modal | Currency |
| 4 | `spent_amount` | Spent Amount | `spent_total` | Via modal | Currency |
| 5 | `remaining` | Remaining | `remaining` (computed) | No | Currency + color |

### Data Requirements

The current `GridCategoryRow` interface needs **two additional fields** for the "Received Date" column:

```typescript
// Fields to add to GridCategoryRow (backend + frontend)
first_received_date: string | null;  // MIN(DATE(occurred_at)) from received line items
last_received_date: string | null;   // MAX(DATE(occurred_at)) from received line items
```

**Action required**: Update the Rust `get_grid_data` query to include these derived date fields, and update the TypeScript `GridCategoryRow` interface. This is part of TASK-4.2 (grid data loading).

### Received Date Display Logic

```
If first_received_date == null          → "" (empty)
If first_received_date == last_received_date → "2026-03-01" (single date)
If first_received_date != last_received_date → "2026-03-01 – 2026-03-15" (range)
```

Format dates using `Intl.DateTimeFormat` based on user locale (EN/DE).

---

## Cell Rendering Strategy

### Value Extraction

Each cell extracts its value from the `GridCategoryRow` based on `columnId`:

```typescript
const getCellValue = (row: GridCategoryRow, columnId: GridColumnId): string | number => {
  switch (columnId) {
    case "category":
      return row.category_name;
    case "received_date":
      return formatReceivedDate(row.first_received_date, row.last_received_date);
    case "received_amount":
      return row.received_total;
    case "spent_amount":
      return row.spent_total;
    case "remaining":
      return row.remaining;
  }
};
```

### Currency Formatting

```typescript
const formatCurrency = (value: number, currencyCode: string): string => {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: currencyCode,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
};
```

### Color Coding (Remaining Column Only)

| Condition | Tailwind Classes | Meaning |
|-----------|-----------------|---------|
| `remaining > 0` | `bg-emerald-500/10 text-emerald-300` | Under budget |
| `remaining === 0` | `bg-amber-500/10 text-amber-300` | At budget |
| `remaining < 0` | `bg-red-500/10 text-red-300` | Over budget |

These classes apply to the `<td>` cell in the "remaining" column.

### Selected Cell Styling

```
Selected:     ring-2 ring-blue-500 ring-inset bg-slate-700/50
Not selected: hover:bg-slate-700/30 (subtle hover)
```

### Summary/Totals Row

The last row in the grid aggregates across all categories:

| Column | Value |
|--------|-------|
| Category | "**Total**" (bold) |
| Received Date | "" (empty) |
| Received Amount | `sum(received_total)` |
| Spent Amount | `sum(spent_total)` |
| Remaining | `sum(remaining)` with color coding |

Style: `border-t-2 border-slate-600 font-semibold bg-slate-800/80`

---

## Keyboard Navigation

### Handler Location

Single `useEffect` in `PeriodGrid` that registers a `keydown` listener on the grid container (or `window` when grid is focused).

### Key Mappings

| Key | Action | Condition |
|-----|--------|-----------|
| `ArrowRight` | Move selection to next column | Grid focused, no modal |
| `ArrowLeft` | Move selection to previous column | Grid focused, no modal |
| `ArrowDown` | Move selection to next row | Grid focused, no modal |
| `ArrowUp` | Move selection to previous row | Grid focused, no modal |
| `Tab` | Next cell (right, wrap to next row) | Grid focused, no modal |
| `Shift+Tab` | Previous cell (left, wrap to previous row) | Grid focused, no modal |
| `Enter` | Move down (same as ArrowDown) | Grid focused, no modal |
| `F2` | Open ledger modal for current cell | Cell is received_amount or spent_amount |
| `Escape` | Close modal (if open) OR deselect cell | Always |
| `Ctrl+Home` | Select first cell (row 0, category column) | Grid focused |
| `Ctrl+End` | Select last cell (last row, remaining column) | Grid focused |
| `PageUp` | Move selection up by ~10 rows | Grid focused |
| `PageDown` | Move selection down by ~10 rows | Grid focused |

### Navigation Logic (Pseudocode)

```typescript
const handleKeyDown = (e: KeyboardEvent) => {
  // If modal is open, only handle Escape
  if (ledgerModal) {
    if (e.key === "Escape") {
      setLedgerModal(null);
      e.preventDefault();
    }
    return;
  }

  if (!selectedCell) {
    // First key press selects first cell
    if (["ArrowDown", "ArrowRight", "Tab", "Enter"].includes(e.key)) {
      setSelectedCell({ rowIndex: 0, columnId: GRID_COLUMNS[0] });
      e.preventDefault();
    }
    return;
  }

  const colIdx = GRID_COLUMNS.indexOf(selectedCell.columnId);
  const rowIdx = selectedCell.rowIndex;
  const maxRow = rows.length - 1;
  const maxCol = GRID_COLUMNS.length - 1;

  switch (e.key) {
    case "ArrowRight":
      setSelectedCell({ rowIndex: rowIdx, columnId: GRID_COLUMNS[Math.min(colIdx + 1, maxCol)] });
      break;
    case "ArrowLeft":
      setSelectedCell({ rowIndex: rowIdx, columnId: GRID_COLUMNS[Math.max(colIdx - 1, 0)] });
      break;
    case "ArrowDown":
    case "Enter":
      setSelectedCell({ rowIndex: Math.min(rowIdx + 1, maxRow), columnId: selectedCell.columnId });
      break;
    case "ArrowUp":
      setSelectedCell({ rowIndex: Math.max(rowIdx - 1, 0), columnId: selectedCell.columnId });
      break;
    case "Tab":
      // Next cell, wrap to next row
      if (e.shiftKey) {
        // Previous cell
      } else {
        // Next cell
      }
      break;
    case "F2": {
      const config = COLUMN_CONFIG.find((c) => c.id === selectedCell.columnId);
      if (config?.openable) {
        const row = rows[rowIdx];
        const kind = selectedCell.columnId === "received_amount" ? "received" : "spent";
        setLedgerModal({ budgetInstanceCategoryId: row.budget_instance_category_id, kind });
      }
      break;
    }
    case "Escape":
      setSelectedCell(null);
      break;
    case "Home":
      if (e.ctrlKey) setSelectedCell({ rowIndex: 0, columnId: GRID_COLUMNS[0] });
      break;
    case "End":
      if (e.ctrlKey) setSelectedCell({ rowIndex: maxRow, columnId: GRID_COLUMNS[maxCol] });
      break;
    case "PageUp":
      setSelectedCell({ rowIndex: Math.max(rowIdx - 10, 0), columnId: selectedCell.columnId });
      break;
    case "PageDown":
      setSelectedCell({ rowIndex: Math.min(rowIdx + 10, maxRow), columnId: selectedCell.columnId });
      break;
    default:
      return; // Don't preventDefault for unhandled keys
  }
  e.preventDefault();
};
```

### Double-Click Handler

```typescript
const handleCellDoubleClick = (rowIndex: number, columnId: GridColumnId) => {
  const config = COLUMN_CONFIG.find((c) => c.id === columnId);
  if (!config?.openable) return;

  const row = rows[rowIndex];
  const kind = columnId === "received_amount" ? "received" : "spent";
  setLedgerModal({ budgetInstanceCategoryId: row.budget_instance_category_id, kind });
};
```

---

## Frozen Headers & Columns

### Implementation with Tailwind CSS Sticky

```
Scroll container: <div className="overflow-auto max-h-[calc(100vh-12rem)]">
  <table className="w-full border-collapse" role="grid">
    <thead>
      <tr>
        <th className="sticky top-0 left-0 z-20 bg-slate-800 ...">Category</th>
        <th className="sticky top-0 z-10 bg-slate-800 ...">Received Date</th>
        <th className="sticky top-0 z-10 bg-slate-800 ...">Received Amount</th>
        <th className="sticky top-0 z-10 bg-slate-800 ...">Spent Amount</th>
        <th className="sticky top-0 z-10 bg-slate-800 ...">Remaining</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td className="sticky left-0 z-[5] bg-slate-800/95 ...">Food</td>
        <td>...</td>
        ...
      </tr>
    </tbody>
  </table>
</div>
```

### Z-Index Strategy

| Element | Position | Z-Index | Reason |
|---------|----------|---------|--------|
| Corner cell (Category header) | `sticky top-0 left-0` | `z-20` | Above both frozen row and column |
| Header cells | `sticky top-0` | `z-10` | Above body rows when scrolling vertically |
| First column body cells | `sticky left-0` | `z-[5]` | Above body cells when scrolling horizontally |
| Body cells | Static | `z-0` (default) | Normal flow |

### Visual Separator

Add a subtle shadow on the frozen first column to indicate scroll boundary:

```
First column cells: shadow-[2px_0_4px_rgba(0,0,0,0.15)]
```

---

## Loading & Empty States

### Loading Skeleton (`PeriodGridSkeleton`)

- Same 5-column table structure as the real grid
- 6 skeleton rows with animated pulse blocks
- Skeleton cell: `<div className="h-4 w-3/4 animate-pulse bg-slate-700/50 rounded" />`
- Header row rendered with real column names (not skeleton)

### Empty States

| Scenario | Message | Action |
|----------|---------|--------|
| No file open | (Handled by Onboarding component) | — |
| File open, no periods | "No budget periods yet. Create your first period to get started." | "Create Period" button |
| Period selected, no categories | "This period has no categories. Was the template empty?" | Link to template management |

### Error State

- Show error message with retry button: "Failed to load grid data. [Retry]"
- Preserve last known grid data if possible (stale-while-revalidate pattern)

---

## Accessibility

### ARIA Roles

```html
<div role="grid" aria-label="Budget categories for [Period Name]" tabindex="0">
  <div role="row">
    <div role="columnheader">Category</div>
    <div role="columnheader">Received Date</div>
    ...
  </div>
  <div role="row" aria-rowindex="1">
    <div role="gridcell" aria-colindex="1" aria-selected="true">Food</div>
    <div role="gridcell" aria-colindex="2">2026-03-01</div>
    ...
  </div>
</div>
```

> **Note**: Using semantic `<table>`, `<thead>`, `<tr>`, `<th>`, `<td>` elements provides implicit ARIA roles. Explicit `role` attributes added for clarity and screen reader support.

### Keyboard Accessibility

- Grid container is focusable (`tabIndex={0}`)
- All cells reachable via arrow keys and Tab
- Focus indicator: `ring-2 ring-blue-500` on selected cell
- F2 and Enter provide alternative access to double-click functionality
- Escape provides clear exit from selection and modal

### Screen Reader Announcements

- Selected cell announced via `aria-selected="true"`
- Column headers associated via semantic `<th>` elements
- Totals row distinguished with `aria-label="Summary totals"`

---

## Performance

### MVP Targets (CONFIRMED)

- Grid load: < 100ms target, < 500ms acceptable
- Smooth scrolling with up to 50 rows
- No virtualization needed for MVP

### Optimization Strategy

| Row Count | Strategy |
|-----------|----------|
| 1–50 | Plain `<tbody>` rendering, no optimization needed |
| 50–100 | Add `React.memo` on `PeriodGridRow` with shallow compare |
| 100+ | Introduce row virtualization (`@tanstack/react-virtual` or similar) |

### Memoization

```typescript
const PeriodGridRow = React.memo(({ row, rowIndex, isSelected, selectedColumnId, ... }) => {
  // Render row
}, (prev, next) => {
  return prev.row === next.row
    && prev.isSelected === next.isSelected
    && prev.selectedColumnId === next.selectedColumnId;
});
```

### Lazy Loading

- Grid data loaded once per period (stored in Redux)
- Line item data (transaction list) loaded on-demand when modal opens
- Grid refetched only on: period change, modal save/delete

---

## Data Flow

### Grid Data Loading Sequence

```
User navigates to period
  → PeriodGrid mounts
  → dispatch(fetchGridData(budgetInstanceId))
  → Rust: get_grid_data(budget_instance_id) executes SQL with rollups
  → Redux: gridData updated, gridDataStatus = "succeeded"
  → PeriodGridTable renders with rows
```

### Modal Edit Sequence

```
User double-clicks "Spent Amount" cell on "Food" row
  → setLedgerModal({ budgetInstanceCategoryId: 5, kind: "spent" })
  → CategoryLedgerModal mounts, loads line items from backend
  → User adds/edits/deletes line items, clicks Save
  → Modal dispatches save to backend
  → Modal closes: setLedgerModal(null)
  → dispatch(fetchGridData(currentBudgetInstanceId)) to refresh rollups
  → Grid re-renders with updated totals
```

### Period Navigation Sequence

```
User selects different period (via period selector/tab bar)
  → dispatch(setCurrentBudgetInstanceId(newId))
  → dispatch(fetchGridData(newId))
  → setSelectedCell(null) (clear selection)
  → Grid re-renders with new period data
```

---

## Future Considerations

### Post-MVP Enhancements (Do NOT implement now)

| Feature | When | Notes |
|---------|------|-------|
| Sorting by column | Post-MVP | Click column header to sort rows |
| Filtering/search | Post-MVP | Filter categories by name |
| Multi-currency columns | Post-MVP | "Received (CHF)", "Received (EUR)" |
| Account column | Post-MVP | Requires schema support |
| Row virtualization | When 100+ rows | `@tanstack/react-virtual` |
| Copy/paste | Post-MVP | Copy cell values |
| Drag & drop reorder | Post-MVP | Reorder categories within period |
| Inline editing | Post-MVP | Direct cell editing without modal |
| TanStack Table migration | If sorting/filtering needed | Swap custom table for headless library |

### Migration Path to TanStack Table

If sorting, filtering, or column visibility features are needed:

1. Install `@tanstack/react-table` (requires dependency approval)
2. Replace `PeriodGridTable` internals with TanStack's `useReactTable` hook
3. Keep same component hierarchy (`PeriodGrid` → `PeriodGridTable` → rows/cells)
4. Column definitions migrate from `COLUMN_CONFIG` to TanStack's `createColumnHelper`
5. Selection and keyboard navigation remain manual (TanStack is headless)

---

## References

- **UX_INTERACTIONS.md** — Excel-like interaction patterns
- **UI_FLOWS.md** — Flow 5 (Main Grid Interactions), Flow 6 (Transaction Entry Modal)
- **PRODUCT_REQUIREMENTS.md** — MVP columns, rollup requirements
- **DATA_MODEL.md** — `GridCategoryRow` schema, rollup SQL queries
- **RULES.md** — Coding standards, state management conventions
- **skills/ui-grid-patterns/SKILL.md** — Grid UI patterns reference
