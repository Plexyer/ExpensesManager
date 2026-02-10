# Column Resize Specification

> **GitHub Issue:** [#82 — BUG-003b: Column Resize Behavior Adjustments](https://github.com/Plexyer/ExpensesManager/issues/82)
> **Predecessor:** [#81 — BUG-003: Cell Text Wrapping & Column Resizing](https://github.com/Plexyer/ExpensesManager/issues/81) (closed)
> **Status:** Open
> **Created:** 2026-02-09

---

## Overview

The budget grid table has five columns. The first two are frozen (pinned left), and the remaining three are resizable. This spec defines the exact visual and interactive behavior for column separators, auto-sizing, paired resize, horizontal scrolling, and snap-to-content-width.

### Column Layout

| # | Column ID        | Label            | Frozen | Resizable | Default Sizing        |
|---|------------------|------------------|--------|-----------|-----------------------|
| 0 | `category`       | Category         | Yes    | No        | Auto (widest content) |
| 1 | `received_date`  | Received Date    | Yes    | No        | Auto (widest content) |
| 2 | `received_amount`| Received Amount  | No     | Yes       | 150px (default)       |
| 3 | `spent_amount`   | Spent Amount     | No     | Yes       | 150px (default)       |
| 4 | `remaining`      | Remaining        | No     | Yes       | 150px (default)       |

---

## 1. Visible Column Separators

### Requirement

Every pair of adjacent columns must have a barely visible vertical separator line. The line must appear consistently across:

- Header row (`<th>` elements)
- Data rows (`<td>` elements)
- Summary/totals row (`<td>` elements)

### Design

- **Style:** `border-right: 1px solid` in a muted color, e.g., Tailwind `border-r border-slate-600/40`.
- **Position:** Right edge of every column except the last.
- **Visibility:** Subtle enough to not distract, but visible enough to clearly delineate column boundaries.
- The separator doubles as a visual cue for where the resize handle is.

### Files Likely Affected

- `src/components/features/BudgetGrid/PeriodGridHeader.tsx`
- `src/components/features/BudgetGrid/PeriodGridCell.tsx`
- `src/components/features/BudgetGrid/PeriodGridBody.tsx` (summary row)

---

## 2. Frozen Columns: Not Resizable, Auto-Sized

### Requirement

The two frozen columns (**Category** and **Received Date**) must:

1. **Not** have resize handles. The user cannot drag to resize them.
2. **Auto-size** to fit the widest cell content in their respective column.
3. Remain sticky/pinned on the left during horizontal scroll (existing behavior).

### Auto-Sizing Logic

On data load (when `gridData` arrives in Redux), measure or compute the width needed for the widest cell in each frozen column:

- **Category column:** The widest `category_name` across all rows, or the header label "CATEGORY" — whichever is wider. Add padding (e.g., `px-4` = 32px total).
- **Received Date column:** The widest formatted date string (e.g., `"2026-02-08 – 2026-02-15"` for a range), or the header label "RECEIVED DATE" — whichever is wider. Add padding.

Approach options:
- **Option A (measure via canvas):** Use `CanvasRenderingContext2D.measureText()` to compute pixel widths of strings in the grid's font. This avoids DOM measurement and is synchronous.
- **Option B (CSS `width: fit-content`):** Let the browser auto-size via CSS. Simpler but less controllable.
- **Recommended:** Option A for precise control, matching the font used in the grid (`text-sm` / 14px, system font stack).

### Files Likely Affected

- `src/components/features/BudgetGrid/types.ts` — remove resize capability for frozen columns
- `src/components/features/BudgetGrid/PeriodGridHeader.tsx` — skip resize handle for frozen columns
- `src/components/features/BudgetGrid/PeriodGridTable.tsx` — compute auto-widths on data load
- `src/store/slices/budgetSlice.ts` — frozen column widths are computed, not stored/persisted

---

## 3. Paired Column Resize (Excel-style)

### Requirement

When the user drags the resize border between two **resizable** columns, both columns adjust simultaneously:

```
Before drag:
  | Received Amount (200px) | Spent Amount (150px) |

User drags border 30px to the LEFT:
  | Received Amount (170px) | Spent Amount (180px) |
  (left shrinks by 30, right grows by 30 — total stays at 350px)

User drags border 30px to the RIGHT:
  | Received Amount (230px) | Spent Amount (120px) |
  (left grows by 30, right shrinks by 30 — total stays at 350px)
```

### Rules

1. **Drag LEFT** = left column **shrinks**, right column **grows**.
2. **Drag RIGHT** = left column **grows**, right column **shrinks**.
3. **Zero-sum:** The combined width of the two columns remains constant during the drag.
4. **Minimum width: 60px.** Neither column can go below this. If one column hits 60px, the drag stops for that direction.
5. **Boundary between frozen and resizable:** The border between Received Date (frozen, col index 1) and Received Amount (resizable, col index 2) has **no resize handle** (BUG-010 / #83). Frozen columns are non-resizable on both sides. "Received Amount" can only be resized via the paired-resize handle on its right edge (between cols 2 and 3).

### Resize Handle Identification

Each resize handle sits on the right edge of a column. The handle controls the border between column `i` (left) and column `i+1` (right):

| Handle Position          | Left Column       | Right Column       | Behavior           |
|--------------------------|--------------------|--------------------|---------------------|
| Right edge of col 0      | Category (frozen)  | Received Date (frozen) | **No handle** (both frozen) |
| Right edge of col 1      | Received Date (frozen) | Received Amount (resizable) | **No handle** (frozen boundary — BUG-010 / #83) |
| Right edge of col 2      | Received Amount    | Spent Amount       | Paired resize       |
| Right edge of col 3      | Spent Amount       | Remaining          | Paired resize       |
| Right edge of col 4      | Remaining          | (none)             | **No handle** (no right neighbor) |

### Implementation Approach

In `PeriodGridHeader.tsx`:

```
onMouseDown on handle at col i:
  leftColId = COLUMN_CONFIG[i].id
  rightColId = COLUMN_CONFIG[i + 1]?.id  // may be undefined for last col
  startX = e.clientX
  startLeftWidth = columnWidths[leftColId]
  startRightWidth = rightColId ? columnWidths[rightColId] : 0
  isPaired = !COLUMN_CONFIG[i].frozen && rightColId && !COLUMN_CONFIG[i+1].frozen

onMouseMove:
  delta = e.clientX - startX
  if isPaired:
    newLeftWidth  = clamp(startLeftWidth + delta,  60, startLeftWidth + startRightWidth - 60)
    newRightWidth = (startLeftWidth + startRightWidth) - newLeftWidth
    dispatch(setColumnWidth(leftColId, newLeftWidth))
    dispatch(setColumnWidth(rightColId, newRightWidth))
  // NOTE: frozen-to-resizable boundary returns "none" (no handle) — BUG-010 / #83
```

### Files Likely Affected

- `src/components/features/BudgetGrid/PeriodGridHeader.tsx` — rewrite resize logic
- `src/store/slices/budgetSlice.ts` — may need batch update for two columns at once

---

## 4. Horizontal Scrolling

### Requirement

- If the total width of all columns exceeds the table container's available width, the table must be horizontally scrollable.
- The two frozen columns remain pinned on the left during scroll (existing behavior via `position: sticky`).

### Current State

This already works. The table wrapper has `overflow-auto` and frozen columns have `sticky` positioning. No changes needed unless auto-sized frozen columns affect layout.

### Edge Case

If the auto-sized frozen columns are very wide (e.g., very long category names), the available space for resizable columns shrinks. Ensure resizable columns still have at least 60px each.

---

## 5. Snap-to-Content-Width

### Requirement

When the user is dragging a column resize handle and the column width passes through the "optimal width" (the width of the widest cell content), the resize should snap.

### Snap Modes

| Mode            | Behavior |
|-----------------|----------|
| **Magnetic snap** (default) | When the column width is within a threshold (e.g., +/- 8px) of the optimal width, apply a pull toward it. The column width gravitates to the optimal width but the user can drag past with continued movement. |
| **Hard detent snap** | When the column width crosses the optimal width, it locks there. The user must drag an additional threshold distance (e.g., 12px past) to break free and continue resizing. |

### Computing Optimal Width

For each resizable column, compute the width that would fit the widest cell content without wrapping:

1. Iterate all data rows + the header label + the summary row value.
2. For each value, measure its rendered width using `CanvasRenderingContext2D.measureText()` with the grid's font.
3. Add cell padding (e.g., 32px for `px-4`).
4. The maximum of all measured widths is the "optimal width" for that column.

This computation should happen once when grid data loads and be stored (e.g., as `optimalWidths: Record<GridColumnId, number>` in Redux or as a derived value).

### Settings Toggle

- **Setting key:** `"grid_snap_mode"`
- **Possible values:** `"magnetic"` (default) | `"detent"`
- **Stored in:** `ui_settings` database table (via `get_ui_setting` / `set_ui_setting`)
- **UI location:** Settings page — first item in a new "Grid" or "Table" settings section.
- **UI control:** A labeled toggle/radio group:
  - "Column snap: Magnetic" / "Column snap: Hard detent"

### Files Likely Affected

- `src/components/features/BudgetGrid/PeriodGridHeader.tsx` — apply snap logic during drag
- `src/components/features/BudgetGrid/PeriodGridTable.tsx` — compute optimal widths from row data
- `src/store/slices/budgetSlice.ts` — store `optimalWidths` and `snapMode`
- `src/pages/SettingsPage.tsx` — add snap mode toggle
- `src/services/settingsService.ts` — already exists, reuse for snap mode

---

## Edge Cases

| Scenario | Expected Behavior |
|----------|-------------------|
| Category name is 500+ characters | Frozen column grows to fit; resizable columns may be pushed off-screen; table scrolls horizontally |
| All resizable columns at 60px minimum | Paired resize stops; user cannot shrink further |
| Grid has 0 data rows | Frozen columns size to header label width; no snap points (no cell content) |
| Grid has 1 data row | Snap points computed from that single row + header + summary |
| Window is resized smaller | Table container shrinks; horizontal scroll activates if needed; column widths unchanged |
| User drags very fast past snap point | Snap threshold must be checked on every mousemove; fast drags should still snap (use delta-based check, not absolute position) |

---

## Summary of Changes from BUG-003

| Aspect | BUG-003 (current) | BUG-003b (target) |
|--------|-------------------|-------------------|
| Column separators | None | Barely visible vertical lines |
| Frozen columns | Resizable (same as others) | Not resizable, auto-sized to content |
| Resize behavior | Single-column (only dragged column changes) | Paired (both adjacent columns change, zero-sum) |
| Resize persistence | Redux + database | Same (no change) |
| Snap-to-content | None | Magnetic or hard detent (user setting) |
| Settings page | Empty placeholder | First item: snap mode toggle |

---

## References

- **GitHub Issue:** [#82](https://github.com/Plexyer/ExpensesManager/issues/82)
- **Predecessor:** [#81](https://github.com/Plexyer/ExpensesManager/issues/81) (BUG-003, closed)
- **Grid Types:** `src/components/features/BudgetGrid/types.ts`
- **Grid Header:** `src/components/features/BudgetGrid/PeriodGridHeader.tsx`
- **Grid Cell:** `src/components/features/BudgetGrid/PeriodGridCell.tsx`
- **Grid Body:** `src/components/features/BudgetGrid/PeriodGridBody.tsx`
- **Grid Table:** `src/components/features/BudgetGrid/PeriodGridTable.tsx`
- **Budget Slice:** `src/store/slices/budgetSlice.ts`
- **Settings Service:** `src/services/settingsService.ts`
- **Settings Page:** `src/pages/SettingsPage.tsx`
- **UI Settings DB:** `ui_settings` table (migration v4 in `src-tauri/src/migrations.rs`)
