# Column Resize Specification

> **GitHub Issues:** #81, #82, #83, #84, #85 — all CLOSED
> **Status:** IMPLEMENTED
> **Created:** 2026-02-09
> **Last Updated:** 2026-02-15

---

## Overview

The budget grid table has five columns. The first two are frozen (pinned left) and the last one ("Remaining") is fixed-width auto-sized. Only the middle two columns ("Received Amount" and "Spent Amount") are resizable. This spec defines the exact visual and interactive behavior for column separators, auto-sizing, paired resize, horizontal scrolling, and snap-to-content-width.

### Column Layout

| # | Column ID        | Label            | Frozen | Resizable | Default Sizing        |
|---|------------------|------------------|--------|-----------|-----------------------|
| 0 | `category`       | Category         | Yes    | No        | Auto (widest content) |
| 1 | `received_date`  | Received Date    | Yes    | No        | Auto (widest content) |
| 2 | `received_amount`| Received Amount  | No     | Yes       | 150px (default)       |
| 3 | `spent_amount`   | Spent Amount     | No     | Yes       | 150px (default)       |
| 4 | `remaining`      | Remaining        | No     | No        | Auto (widest content) |

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
| Right edge of col 0      | Category (frozen, non-resizable)  | Received Date (frozen, non-resizable) | **No handle** |
| Right edge of col 1      | Received Date (frozen, non-resizable) | Received Amount (resizable) | **No handle** (BUG-010 / #83) |
| Right edge of col 2      | Received Amount (resizable)    | Spent Amount (resizable)       | **Paired resize** |
| Right edge of col 3      | Spent Amount (resizable)       | Remaining (non-resizable)      | **No handle** (BUG-012 / #85) |
| Right edge of col 4      | Remaining (non-resizable)      | (none)             | **No handle** (no right neighbor) |

**Result:** Only **one** resize handle remains — between "Received Amount" and "Spent Amount".

### Implementation Approach

In `PeriodGridHeader.tsx`:

```
onMouseDown on handle at col i:
  leftColId = COLUMN_CONFIG[i].id
  rightColId = COLUMN_CONFIG[i + 1]?.id  // may be undefined for last col
  startX = e.clientX
  startLeftWidth = columnWidths[leftColId]
  startRightWidth = rightColId ? columnWidths[rightColId] : 0
  isPaired = COLUMN_CONFIG[i].resizable && rightColId && COLUMN_CONFIG[i+1].resizable

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

## 6. Scale Factor Correction

### Issue
On Windows with display scaling > 100% (e.g., 125%, 150%), `e.clientX` returns CSS pixels but the physical mouse movement is scaled, causing the resize handle to move more than the cursor (amplified resize — #84).

### Fix (Implemented)
The resize delta is divided by `window.devicePixelRatio` to normalize mouse movement:

```typescript
const scaleFactor = window.devicePixelRatio;
const delta = (e.clientX - startX) / scaleFactor;
```

This ensures 1px of mouse movement = 1px of column width change regardless of display scaling.

---

## 7. Keyboard Resize

### Requirement
When the resize handle is focused (via Tab), the user can resize columns with arrow keys:

| Key | Action |
|-----|--------|
| `ArrowLeft` | Shrink left column / grow right column by 10px |
| `ArrowRight` | Grow left column / shrink right column by 10px |

### Implementation
The resize handle is a focusable `<div>` with `tabIndex={0}`, `role="separator"`, and `aria-orientation="vertical"`. The `onKeyDown` handler dispatches paired width adjustments of ±10px, respecting the 60px minimum.

---

## Bug Fix Outcomes

| Issue | Title | Status | Outcome |
|-------|-------|--------|---------|
| #81 | BUG-003: Cell Text Wrapping & Column Resizing | CLOSED | Initial resize implementation; cell text now wraps correctly with `break-words` |
| #82 | BUG-003b: Column Resize Behavior Adjustments | CLOSED | Paired resize, auto-sized frozen columns, snap-to-content |
| #83 | BUG-010: No resize handle between frozen and resizable columns | CLOSED | Handle removed between col 1 (frozen) and col 2 (resizable) |
| #84 | BUG-011: Fixed amplified resize (slider moves more than mouse) | CLOSED | Scale factor correction applied (`devicePixelRatio`) |
| #85 | BUG-012: "Remaining" column fixed-width auto-sized | CLOSED | "Remaining" column marked `resizable: false`, auto-sized to content |

## Summary of Implemented Behavior

| Aspect | Implementation |
|--------|---------------|
| Column separators | Barely visible vertical lines (`border-r border-slate-600/40`) |
| Frozen columns (Category, Received Date) | Not resizable, auto-sized to widest content via `measureText()` |
| Resizable columns (Received Amount, Spent Amount) | Paired zero-sum resize; one resize handle between them |
| "Remaining" column | Not resizable, auto-sized to content |
| Minimum width | 60px (`MIN_COLUMN_WIDTH`) for all columns |
| Snap-to-content | Magnetic snap with 8px threshold (`MAGNETIC_THRESHOLD`) |
| Scale factor | Normalized via `window.devicePixelRatio` |
| Keyboard resize | ±10px steps via ArrowLeft/ArrowRight on focused handle |
| Resize persistence | Widths stored in Redux (`budgetSlice`) and persisted to `ui_settings` DB table via `settingsService` |

---

## References

- **GitHub Issues:** [#81](https://github.com/Plexyer/ExpensesManager/issues/81), [#82](https://github.com/Plexyer/ExpensesManager/issues/82), [#83](https://github.com/Plexyer/ExpensesManager/issues/83), [#84](https://github.com/Plexyer/ExpensesManager/issues/84), [#85](https://github.com/Plexyer/ExpensesManager/issues/85) — all closed
- **GRID_ARCHITECTURE.md** — Grid component hierarchy and types
- **Grid Types:** `src/components/features/BudgetGrid/types.ts` — `GridColumnConfig`, `MIN_COLUMN_WIDTH`, `COLUMN_CONFIG`, `ColumnWidths`, `OptimalWidths`
- **Grid Header:** `src/components/features/BudgetGrid/PeriodGridHeader.tsx` — resize handle rendering, drag logic, `MAGNETIC_THRESHOLD`
- **Budget Slice:** `src/store/slices/budgetSlice.ts` — `columnWidths`, `optimalWidths` state
- **Settings Service:** `src/services/settingsService.ts` — width persistence
- **UI Settings DB:** `ui_settings` table (migration v4 in `src-tauri/src/migrations.rs`)
