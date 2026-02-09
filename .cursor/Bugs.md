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

**Status:** RESOLVED
**Reported:** 2026-02-08
**Priority:** Medium
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

### Fix Notes

- **Completed:** 2026-02-09
- **Summary:**
  - Replaced `whitespace-nowrap` with `break-words` on all grid cells (data cells and summary row) to enable text wrapping with dynamic row height growth.
  - Implemented drag-to-resize on column headers: a 4px-wide invisible handle on the right edge of each `<th>` changes the cursor to `col-resize` on hover and supports click-and-drag to adjust width (clamped to a 60px minimum).
  - Column widths are stored in Redux state (survives tab switches) and persisted to a new `ui_settings` database table (survives app restarts). Widths load from the database on file open and save on every resize mouseup.
  - Added keyboard accessibility on resize handles: left/right arrow keys adjust width by 10px steps. Handles have `role="separator"`, `aria-orientation="vertical"`, and `aria-label`.
  - Replaced static `frozenWidth`/`stickyLeft` with dynamic `computeStickyLeft()` that recalculates offsets from actual column widths, so frozen column positioning stays correct after resize.
  - Added DB migration v4 (`ui_settings` table) and two new Tauri commands (`get_ui_setting`, `set_ui_setting`) for generic key-value UI preference persistence.
- **Root cause:** All cells used `whitespace-nowrap` preventing text wrapping. Column widths were static constants in `COLUMN_CONFIG` with no resize infrastructure, no drag handles, and no persistence mechanism.
- **Files changed:**
  - `src-tauri/src/migrations.rs` — added migration v4 (ui_settings table), bumped CURRENT_SCHEMA_VERSION to 4
  - `src-tauri/src/encrypted_db.rs` — added `get_ui_setting` and `set_ui_setting` Tauri commands
  - `src-tauri/src/lib.rs` — registered new commands
  - `src/services/settingsService.ts` — new frontend service wrapping get/set UI setting commands
  - `src/components/features/BudgetGrid/types.ts` — replaced `frozen`/`stickyLeft`/`frozenWidth` with `defaultWidth`, added `MIN_COLUMN_WIDTH`, `ColumnWidths` type, `getDefaultColumnWidths()`, `computeStickyLeft()` helper
  - `src/store/slices/budgetSlice.ts` — added `columnWidths` state, `setColumnWidth` reducer, `loadColumnWidths`/`saveColumnWidths` async thunks
  - `src/components/features/BudgetGrid/PeriodGrid.tsx` — dispatches `loadColumnWidths()` on mount
  - `src/components/features/BudgetGrid/PeriodGridTable.tsx` — reads `columnWidths` from Redux, passes resize handlers to header and body
  - `src/components/features/BudgetGrid/PeriodGridHeader.tsx` — added resize handle `<div>` per column with mouse drag + keyboard resize support
  - `src/components/features/BudgetGrid/PeriodGridCell.tsx` — replaced `whitespace-nowrap` with `break-words`, accepts `columnWidths` prop, applies dynamic `width`/`minWidth`/`maxWidth` + computed `stickyLeft`
  - `src/components/features/BudgetGrid/PeriodGridRow.tsx` — passes `columnWidths` to each cell
  - `src/components/features/BudgetGrid/PeriodGridBody.tsx` — replaced `whitespace-nowrap` with `break-words` in summary row, accepts `columnWidths`, applies dynamic widths + computed `stickyLeft`
- **Verification:**
  - Open a file with periods. Select a period → table loads. Category names wrap to multiple lines if longer than column width. Row height adjusts dynamically. Hover the right edge of any column header → cursor becomes `col-resize`. Drag right → column widens. Drag left → column shrinks (stops at 60px). Release → width persists. Switch tabs → come back → widths preserved. Close and reopen the app/file → widths loaded from database. Frozen columns stay pinned during horizontal scroll after resize. Summary row columns align with header. Tab to resize handle → press arrow keys → width adjusts. TypeScript compiles with zero errors, no linter warnings.

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

**Status:** RESOLVED
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

### Fix Notes

- **Completed:** 2026-02-09
- **Summary:**
  - Modified `handleSelectPeriod` in `PeriodGrid.tsx` to detect when the user re-selects the same period that is already active in Redux.
  - When `budgetInstanceId === currentBudgetInstanceId` (same period), the handler now explicitly dispatches `fetchGridData(budgetInstanceId)` because the `useEffect` watching `currentBudgetInstanceId` won't re-fire (the value didn't change).
  - For different-period selections, the existing `useEffect` path continues to handle the fetch as before — no double-fetch occurs.
- **Root cause:** The `useEffect` in `PeriodGrid.tsx` that dispatches `fetchGridData` depends on `currentBudgetInstanceId`. When the same value is dispatched via `setCurrentBudgetInstanceId`, Redux does not produce a new state reference for that field, so the `useEffect` never fires. Meanwhile, the reducer still clears `gridData` to `null` and resets `gridDataStatus` to `"idle"`, but no rendering branch in the detail view handles `"idle"` — resulting in a blank screen.
- **Files changed:**
  - `src/components/features/BudgetGrid/PeriodGrid.tsx` — added same-period detection and explicit `fetchGridData` dispatch in `handleSelectPeriod`
- **Verification:**
  - Open a file with periods. Period auto-selects and table shows. Click "All Periods" → selector view. Click the same period → table now loads correctly. Click "All Periods" again → select a different period → table loads. Create a new period → auto-navigates to table. TypeScript compiles with zero errors, no linter warnings.

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

**Status:** RESOLVED
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

### Fix Notes

- **Completed:** 2026-02-09
- **Summary:**
  - Lifted `showPeriodSelector` and `periodViewMode` from React local state (`useState`) in `PeriodGrid.tsx` to Redux state in `budgetSlice.ts`.
  - Added `PeriodViewMode` exported type, two new state fields (`showPeriodSelector: boolean`, `periodViewMode: PeriodViewMode`), and two new reducers (`setShowPeriodSelector`, `setPeriodViewMode`) to the budget slice.
  - Updated `PeriodGrid.tsx` to read both values from `useAppSelector` and set them via `dispatch(...)` instead of direct `useState` setters.
  - `isCreateModalOpen` remains as local `useState` (modals are transient UI that should not persist across route changes).
  - `clearBudgetState` (file close) already returns `initialState`, so both new fields reset automatically.
- **Root cause:** `showPeriodSelector` and `periodViewMode` were stored in `useState`, which is destroyed when React Router unmounts the component on tab navigation. Redux state persists across route changes.
- **Files changed:**
  - `src/store/slices/budgetSlice.ts` — added `PeriodViewMode` type, `showPeriodSelector` and `periodViewMode` to state/initialState, two new reducers, updated exports
  - `src/components/features/BudgetGrid/PeriodGrid.tsx` — removed local `useState` for both values, imported new actions and type from budgetSlice, replaced all setter calls with dispatches
- **Verification:**
  - Open a file with periods. Click "All Periods" → switch to Templates → switch back to Periods → still on "All Periods" selector. Toggle to list view → switch to Settings → switch back → still in list view. Select a period → switch tabs → switch back → same period table shown. Close file → reopen → defaults restored. TypeScript compiles with zero errors, no linter warnings.

---

## BUG-009: Add Category Button Disabled After All Existing Categories Assigned

**Status:** RESOLVED
**Reported:** 2026-02-09
**Priority:** High
**Area:** Templates Page (`TemplatesPage.tsx`)

### Description

After adding one category to a template, the "Add Category" button becomes unresponsive (disabled) if all existing global categories have been assigned to the template. This prevents the user from opening the add-category form, which contains an inline "Create new category" option that would allow creating and adding new categories.

### Steps to Reproduce

1. Open a `.financedb` file.
2. Go to the **Templates** tab.
3. Create a template (e.g., "Monthly Budget").
4. Create one global category (e.g., "Food") and add it to the template with an amount.
5. The category is added successfully and the form closes.
6. Click **"Add Category"** again.
7. **Result:** The button does nothing — it is disabled (greyed out or unresponsive).

### Expected Behavior

The "Add Category" button should always be clickable when a template is selected, regardless of how many global categories have already been assigned. The add-category form contains an inline "Create new category" flow that allows the user to create new global categories on the spot — the button must remain accessible so the user can reach that flow.

### Current Behavior

The button is disabled when `availableCategories.length === 0 && categories.length > 0`. Once all existing global categories are assigned to the template, `availableCategories` becomes empty, and the button is disabled. The user cannot open the form and therefore cannot use the inline "Create new category" option.

### Root Cause

In `src/pages/TemplatesPage.tsx`:

- **Line 207-209:** `availableCategories` filters out categories already in the template:
  ```
  const availableCategories = categories.filter(
    (cat) => !templateCategories.some((tc) => tc.global_category_id === cat.global_category_id)
  );
  ```
- **Line 516:** The button's `disabled` prop:
  ```
  disabled={availableCategories.length === 0 && categories.length > 0}
  ```
  This condition disables the button when all global categories are already assigned, but it fails to account for the inline "Create new category" form (lines 565-611) inside the add-category panel.

### Possible Fix

Remove or relax the `disabled` condition on the "Add Category" button (line 516). The button should always be enabled when a template is selected, since the form provides an inline path to create new global categories. Alternatively, only disable the "Add to Template" submit button (line 617) when no category is selected, which is already implemented.

### Fix Notes

- **Completed:** 2026-02-09
- **Summary:**
  - Removed the `disabled` prop (`disabled={availableCategories.length === 0 && categories.length > 0}`) from the "Add Category" button in `TemplatesPage.tsx`.
  - The button is now always clickable when a template is selected, allowing the user to open the add-category form and access the inline "Create new category" flow regardless of how many global categories are already assigned.
  - The "Add to Template" submit button inside the form retains its own guard (`disabled={selectedCategoryId === "" || !categoryAmount}`), which is sufficient to prevent invalid submissions.
- **Root cause:** The `disabled` condition on the "Add Category" button did not account for the inline "Create new category" form inside the add-category panel, blocking users from creating new global categories when all existing ones were assigned.
- **Files changed:**
  - `src/pages/TemplatesPage.tsx` — removed `disabled` prop from "Add Category" button
- **Verification:**
  - Open a file, go to Templates, create a template with one category. Click "Add Category" again — form opens. Use "+ Create new category" to create and add a second category. TypeScript compiles with zero errors, no linter warnings.

---

## Summary Table

| ID       | Title                                        | Status | Priority |
|----------|----------------------------------------------|--------|----------|
| BUG-001  | Period Selection UX Overhaul                 | RESOLVED | High     |
| BUG-002  | Table Width & Sticky Columns                 | RESOLVED | High     |
| BUG-003  | Cell Text Wrapping & Column Resizing         | RESOLVED | Medium   |
| BUG-004  | Data Not Persisted on App Close              | RESOLVED | Critical |
| BUG-005  | Re-selecting Same Period Shows No Table       | RESOLVED | High     |
| BUG-006  | App Opens on Wrong Page — Dashboard Missing  | RESOLVED | Medium   |
| BUG-007  | Save Period Post-Save Navigation              | BLOCKED (UXQ1) | Low |
| BUG-008  | Period View State Lost on Tab Switch          | RESOLVED | High     |
| BUG-009  | Add Category Button Disabled After All Existing Categories Assigned | RESOLVED | High |
