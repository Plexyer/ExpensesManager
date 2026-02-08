# Bugs & Issues Tracker

> All bugs and UX issues reported by the user are documented here with a unique ID.
> Status: `OPEN` | `IN PROGRESS` | `RESOLVED`

---

## BUG-001: Period Selection UX Overhaul

**Status:** RESOLVED
**Reported:** 2026-02-08
**Area:** Periods Tab (`HomePage.tsx`, `BudgetGrid/`)

### Description

The Periods tab currently shows all budget periods at the top at all times.
This is unnecessary when a period is already open. The UX should be reworked:

### Expected Behavior

1. **Hide the periods section** when a period is already open/selected. The user does not need to see all periods while working on one.
2. **Period selection view** should only appear when the user wants to select or switch periods. This view should support two display modes:
   - **Grid-card format** (cards in a grid layout)
   - **List format** (rows in a list)
   - A **toggle control** on the **top-left** of the tab allows switching between grid and list views.
3. **Selection flow:** The user clicks/selects a period from the grid or list, then the budget table opens with that period's data.
4. **Save Period button:** After the user finishes inputting their finances, a **"Save Period" button on the top-right** saves the data to the database.

### Current Behavior

All periods are always visible at the top of the Periods tab regardless of whether one is open. There is no toggle for view mode and no dedicated "Save Period" button.

### Fix Notes

- **Completed:** 2026-02-08
- **Summary:**
  - Added conditional rendering in `PeriodGrid.tsx`: period selector view when no period is selected or the user clicks "All Periods"; detail/table view when a period is selected.
  - Created `PeriodDetailToolbar.tsx` with "All Periods" back button (top-left), current period info (center), and "Save Period" button (top-right) that calls `saveDb()`.
  - Added grid/list view toggle in `PeriodList.tsx` with `ViewToggleButton` component; grid shows `PeriodCard`, list shows new `PeriodListRow`.
  - Updated `CreatePeriodModal.tsx` to signal `created: true` on success, auto-navigating to the table view after period creation.
- **Root cause:** The original design always rendered the period cards above the table with no way to hide them or navigate between views.
- **Files changed:**
  - `src/components/features/BudgetGrid/PeriodGrid.tsx` — conditional selector vs detail view, `showPeriodSelector` state
  - `src/components/features/BudgetGrid/PeriodList.tsx` — grid/list toggle, `viewMode` prop
  - `src/components/features/BudgetGrid/PeriodListRow.tsx` — new list-format row component
  - `src/components/features/BudgetGrid/PeriodDetailToolbar.tsx` — new toolbar with back/info/save
  - `src/components/features/BudgetGrid/CreatePeriodModal.tsx` — `onClose(created?)` signature change
- **Verification:**
  - Open a file with periods. Period selector appears (no table). Toggle between grid/list views. Select a period → table appears, periods hidden, toolbar shows. Click "All Periods" → back to selector. Click "Save Period" → data saved to disk. Create a new period → auto-navigates to table.

---

## BUG-002: Budget Table Does Not Utilize Full Screen Width & Needs Sticky Columns

**Status:** RESOLVED
**Reported:** 2026-02-08
**Area:** Budget Grid / Table (`BudgetGrid/`)

### Description

The budget table is too narrow and does not make good use of the available screen width. Since users will be able to add custom columns later, the table needs to be wider and support horizontal scrolling.

### Expected Behavior

1. **Use more of the screen width** for the budget table so users have room for custom columns.
2. **Horizontal scrolling:** When custom columns cause the table to overflow on the right, the user should be able to scroll horizontally.
3. **Sticky/frozen columns:** The two leftmost columns — **Category Name** and **Category Amount** (or the first identifying columns) — must remain fixed/sticky on the left side at all times during horizontal scrolling. Only the data columns to the right should scroll.

### Current Behavior

The table is narrow and centered, leaving unused space on both sides. No horizontal scroll or sticky column behavior exists.

### Fix Notes

- **Completed:** 2026-02-08
- **Summary:**
  - Removed `max-w-5xl mx-auto` width constraint from `HomePage.tsx` so the table uses full available screen width.
  - Added frozen column metadata (`frozen`, `stickyLeft`, `frozenWidth`) to `GridColumnConfig` in `types.ts`.
  - Made both the first (Category, 200px) and second (Received Date, 160px) columns sticky with proper `left` offsets, opaque backgrounds, and a shadow separator on the last frozen column — in header, data rows, and summary row.
  - Changed table layout from `w-full` to `min-w-full` so the table can grow beyond the viewport and trigger horizontal scrolling when custom columns are added.
- **Root cause:** The `max-w-5xl mx-auto` wrapper in `HomePage.tsx` artificially capped the table width at 1024px, and only the first column had sticky positioning.
- **Files changed:**
  - `src/pages/HomePage.tsx` — removed `max-w-5xl mx-auto` wrapper
  - `src/components/features/BudgetGrid/types.ts` — added `frozen`, `stickyLeft`, `frozenWidth` to `GridColumnConfig`; added `LAST_FROZEN_COL_INDEX`
  - `src/components/features/BudgetGrid/PeriodGridTable.tsx` — changed `w-full` to `min-w-full`
  - `src/components/features/BudgetGrid/PeriodGridHeader.tsx` — frozen column sticky with inline left/width styles and z-30
  - `src/components/features/BudgetGrid/PeriodGridRow.tsx` — passes `columnConfig` + `colIndex` to cells
  - `src/components/features/BudgetGrid/PeriodGridCell.tsx` — frozen column sticky with inline left/width styles and z-10
  - `src/components/features/BudgetGrid/PeriodGridBody.tsx` — summary row frozen columns with same sticky pattern
- **Verification:**
  - TypeScript compiles with zero errors. No linter warnings.
  - Open a file with periods → table fills full screen width. Both left columns stay pinned during horizontal scroll.

---

## BUG-003: Cell Text Wrapping & Column Resizing

**Status:** OPEN
**Reported:** 2026-02-08
**Area:** Budget Grid / Table (`BudgetGrid/`)

### Description

Since users will create custom columns that may contain longer text, cells need to support text wrapping and columns need to be resizable.

### Expected Behavior

1. **Text wrapping in cells:** Cell text should wrap to two or more lines when the content exceeds the column width. The row height should grow dynamically to accommodate the wrapped text.
2. **Manual column resizing (drag):** When the user hovers over the thin border/line between two column headers (in the header row), the cursor should change to a resize cursor. The user can then click-and-hold and drag:
   - **Right** to increase the column width
   - **Left** to decrease the column width
   - This behavior mirrors column resizing in Excel/spreadsheet applications.
3. **Double-click auto-size (FUTURE — document only, implement later):** When the user double-clicks the border between two column headers, the column should automatically resize to fit the widest cell content in that column. This should respect already-wrapped text (i.e., it should find the optimal width without unwrapping text that is currently wrapping). **This feature is deferred for later implementation.**

### Current Behavior

Text in cells does not wrap — it is either truncated or overflows. Columns have a fixed width and cannot be resized by the user.

---

## BUG-004: Data Not Persisted to Database on App Close

**Status:** RESOLVED
**Reported:** 2026-02-08
**Area:** Data Persistence (`fileService.ts`, `encrypted_db.rs`, Tauri backend)

### Description

Budget data entered by the user is lost when the app is closed without pressing the "Close File" button. After reopening the `.financedb` file, the previously entered data is gone.

### Expected Behavior

Data should be persisted to the database either:
- Automatically when changes are made (auto-save), OR
- When the user explicitly saves (e.g., via the "Save Period" button from BUG-001), OR
- On app close / window close — the app should flush any unsaved data to the database before shutting down.

At a minimum, closing the app window should not result in data loss.

### Current Behavior

If the user enters data and closes the app (e.g., clicks the window X button) without first pressing "Close File," all unsaved data is lost. The data is not written to the `.financedb` SQLite/SQLCipher database.

### Possible Root Causes

- Data may only be held in-memory (Redux state) and never written to the database until "Close File" is triggered.
- The Tauri `on_window_close` or equivalent lifecycle hook may not be flushing data.
- The `fileService.ts` save logic may not be called on app shutdown.

### Fix Notes

- **Completed:** 2026-02-08
- **Summary:**
  - Added `save_if_open()` method on `DbState` that safely writes the temp DB back to the original `.financedb` file if a database is currently open (no-op if none open).
  - Changed `lib.rs` from `Builder::run()` to `Builder::build().run()` with a `RunEvent::Exit` handler that calls `save_if_open()` before the process exits.
  - Errors during save-on-exit are logged to stderr with `eprintln!` (not swallowed).
- **Root cause:** No Tauri lifecycle hook existed to flush the temp database to disk on app exit. Data only persisted when the user explicitly clicked "Close File".
- **Files changed:**
  - `src-tauri/src/encrypted_db.rs` — added `save_if_open()` method on `DbState`
  - `src-tauri/src/lib.rs` — added `use tauri::Manager`, changed `.run()` to `.build().run()` with `RunEvent::Exit` handler
- **Verification:**
  - Open a file, create a period, close the window via X button, reopen the file — data persists.
  - "Close File" button still works correctly (double-save scenario is safe).

---

## BUG-005: Re-selecting Same Period After "All Periods" Shows No Table

**Status:** OPEN
**Reported:** 2026-02-08
**Priority:** High
**Area:** Period Selection / Grid (`BudgetGrid/PeriodGrid.tsx`, `budgetSlice.ts`)

### Description

After opening a `.financedb` file and having a period auto-selected (table visible), clicking the "All Periods" button (top-left) navigates to the period selector. If the user then clicks on the **same period** that was previously selected, the table does not appear — the screen is blank below the toolbar.

Workaround: navigating to a different tab (e.g., Templates) and back to Home causes the table to appear.

### Steps to Reproduce

1. Open a `.financedb` file (a period auto-selects and the table loads).
2. Click "All Periods" to go back to the period selector.
3. Click the **same** period that was previously selected.
4. **Result:** No table shown — just the toolbar with "All Periods" / period info / "Save Period".
5. Switch to Templates tab, then switch back to Home tab → table now appears.

### Expected Behavior

Re-selecting the same period should show the budget table immediately, identical to selecting any other period.

### Probable Root Cause

When `setCurrentBudgetInstanceId` dispatches the same value that's already in Redux, it does not trigger a state change, so the `useEffect` that calls `fetchGridData` does not re-fire. The `showPeriodSelector` flips to `false` (showing the detail view) but `gridDataStatus` may still be in a stale state from a previous load.

---

## BUG-006: App Opens on Wrong Page — Dashboard Missing & Home Tab Rename

**Status:** RESOLVED
**Reported:** 2026-02-08
**Priority:** Medium
**Area:** Navigation / Routing (`AppHeader.tsx`, `App.tsx`, `HomePage.tsx`)

### Description

When opening a `.financedb` file, the app currently lands on the Periods view (budget grid). The user expects a **Dashboard page** to be the first thing shown after opening a file, with summarized financial information.

Additionally, the current "Home" tab in the navigation should be renamed to **"Periods"** since it only contains period/budget content — not a general home/dashboard view.

### Expected Behavior

1. After opening a `.financedb` file, the user lands on a **Dashboard** tab/page showing financial summaries.
2. The current "Home" tab is renamed to **"Periods"**.
3. A new **"Dashboard"** tab is the first/leftmost tab in the navigation.
4. For now, the Dashboard can be a **placeholder** (e.g., "Dashboard coming soon" message) — but the routing and tab naming should be correct.

### Current Behavior

- The app opens directly on the Periods view (currently labeled "Home").
- No Dashboard page or tab exists.
- The "Home" tab label is misleading since it only shows budget periods.

### Notes

The full Dashboard feature (financial summaries, charts, etc.) is tracked in `BACKLOG.md` as TASK-9.2. This bug covers the minimal fix: add a placeholder Dashboard page, rename Home → Periods, and set Dashboard as the default landing page after file open.

### Fix Notes

- **Completed:** 2026-02-08
- **Summary:**
  - Created `DashboardPage.tsx` placeholder page matching the SettingsPage pattern (icon + title + description text).
  - Updated `App.tsx` routing: `/` → DashboardPage, `/periods` → HomePage (Periods content).
  - Updated `AppHeader.tsx` navigation: tabs are now Dashboard (`/`), Periods (`/periods`), Templates (`/templates`), Settings (`/settings`).
- **Root cause:** No Dashboard page existed; the periods view was served at `/` under the misleading "Home" label.
- **Files changed:**
  - `src/pages/DashboardPage.tsx` — new placeholder page
  - `src/App.tsx` — added Dashboard route at `/`, moved Periods to `/periods`
  - `src/components/common/AppHeader.tsx` — renamed "Home" to "Periods", added "Dashboard" tab
- **Verification:**
  - Open a `.financedb` file → lands on Dashboard placeholder. Navigation shows: Dashboard | Periods | Templates | Settings. Clicking "Periods" tab shows the budget grid. TypeScript compiles with zero errors.

---

## BUG-007: Save Period Button — Post-Save Navigation Behavior

**Status:** BLOCKED — Awaiting answer to UXQ1 in QUESTIONS_FOR_USER.md
**Reported:** 2026-02-08
**Priority:** Low
**Area:** Period Detail Toolbar (`BudgetGrid/PeriodDetailToolbar.tsx`, `PeriodGrid.tsx`)

### Description

After the user presses the "Save Period" button (top-right), it is unclear whether the user should:
- **(A)** Stay on the current period's table view, or
- **(B)** Be automatically navigated back to the "All Periods" selection view.

The current implementation keeps the user on the period table after saving.

### Expected Behavior

To be determined after UXQ1 in `QUESTIONS_FOR_USER.md` is answered.

### Acceptance Criteria

- Implement whichever navigation behavior the user chooses in UXQ1.
- Ensure the save feedback (spinner → "Saved!" / error) still displays correctly regardless of navigation choice.

---

## BUG-008: Period View State Lost When Switching Tabs

**Status:** OPEN
**Reported:** 2026-02-08
**Priority:** High
**Area:** Navigation / State Persistence (`PeriodGrid.tsx`, `App.tsx`)

### Description

When the user has a period open (table visible) and switches to a different tab (e.g., Templates or Settings), then switches back to the Periods tab (currently "Home"), the previous view state is lost. The component remounts and the user may see the period selector instead of the previously open period table.

Similarly, if the user is on the "All Periods" selection view and switches tabs, coming back should still show the "All Periods" view — not jump to a table or reset.

### Expected Behavior

1. If a period table is open and the user switches to another tab and returns, the **same period table** should be displayed.
2. If the "All Periods" selector is visible and the user switches tabs and returns, the **selector view** should still be displayed.
3. The view mode toggle (grid/list) selection should also be preserved across tab switches.

### Current Behavior

The `PeriodGrid` component uses `useState` for `showPeriodSelector` and `periodViewMode`. When the user navigates away (React Router unmounts the component), these local state values are lost. On return, the component reinitializes with default values.

### Probable Root Cause

`showPeriodSelector` and `periodViewMode` are stored in React local state (`useState`), which is destroyed when the component unmounts during tab navigation. These values should either be:
- Lifted to Redux (persisted across route changes), or
- Persisted via a ref/context that survives remounting.

---

## Summary Table

| ID       | Title                                        | Status | Priority |
|----------|----------------------------------------------|--------|----------|
| BUG-001  | Period Selection UX Overhaul                 | RESOLVED | High     |
| BUG-002  | Table Width & Sticky Columns                 | RESOLVED | High     |
| BUG-003  | Cell Text Wrapping & Column Resizing         | OPEN   | Medium   |
| BUG-004  | Data Not Persisted on App Close              | RESOLVED | Critical |
| BUG-005  | Re-selecting Same Period Shows No Table       | OPEN   | High     |
| BUG-006  | App Opens on Wrong Page — Dashboard Missing  | RESOLVED | Medium   |
| BUG-007  | Save Period Post-Save Navigation              | BLOCKED (UXQ1) | Low |
| BUG-008  | Period View State Lost on Tab Switch          | OPEN   | High     |
