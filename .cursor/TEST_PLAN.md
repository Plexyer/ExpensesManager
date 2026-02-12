# Manual Test Plan — ExpensesManager MVP

**Last updated:** 2026-02-12
**Scope:** All MVP features through Phase 8

---

## Prerequisites

- Application built and running (`npm run tauri dev`)
- No existing `.emf` file (for fresh-start tests) OR an existing file (for returning-user tests)

---

## 1. Onboarding & File Management

### 1.1 Create New Finance File
- [ ] Launch app with no file — onboarding screen shows "Create New Finance File" and "Open Finance File"
- [ ] Click "Create New Finance File" — file dialog opens
- [ ] Choose a location and file name — password creation modal appears
- [ ] Enter a weak password (< 12 chars) — strength indicator shows "Weak", creation blocked
- [ ] Enter a strong password (≥ 12 chars, mixed case, numbers, special) — strength indicator shows "Good" or "Strong"
- [ ] Confirm password with mismatch — "Passwords do not match" error shown
- [ ] Confirm password correctly — "Create" button enabled
- [ ] Optionally add a password hint — hint accepted (must not contain password)
- [ ] Click "Create" — file created, app navigates to main view

### 1.2 Open Existing Finance File
- [ ] Launch app — onboarding screen appears
- [ ] Click "Open Finance File" — file dialog opens
- [ ] Select a valid `.emf` file — password unlock modal appears
- [ ] Enter wrong password — "Incorrect password" error shown, attempt counter decrements
- [ ] Enter correct password — file unlocks, app navigates to main view
- [ ] If hint was set, click "Show hint" — hint text displayed

### 1.3 Close File
- [ ] From main view, click "Close File" in header — app returns to onboarding screen
- [ ] Re-open the same file — all previous data intact

---

## 2. Navigation

- [ ] Header shows four navigation tabs: Dashboard, Periods, Templates, Settings
- [ ] Clicking each tab navigates to the correct page
- [ ] Active tab is visually highlighted
- [ ] File name displayed in header
- [ ] "Close File" button present and functional

---

## 3. Templates

### 3.1 Create Template
- [ ] Navigate to Templates page
- [ ] Click "New" button — inline form appears
- [ ] Fill in: Name, optional Description, Cadence (Monthly/Bi-Weekly/Weekly/Custom), Currency (CHF/EUR/USD)
- [ ] Click "Create Template" — template appears in list
- [ ] Verify template card shows name, cadence, currency

### 3.2 Edit Template
- [ ] Click "Edit" on a template — edit form appears with pre-filled values
- [ ] Change name and description — click "Save Changes"
- [ ] Verify changes reflected in template list

### 3.3 Delete Template
- [ ] Click "Delete" on a template — confirmation dialog appears
- [ ] Confirm deletion — template removed from list
- [ ] Cancel deletion — template remains

### 3.4 Template Categories
- [ ] Select a template — category management section appears
- [ ] Add a new category via text input — category appears in template's category list
- [ ] Add existing global category — appears linked to template
- [ ] Remove category from template — category removed (not deleted globally)

---

## 4. Budget Periods

### 4.1 Period List View
- [ ] Navigate to Periods tab — "All Periods" view shown by default
- [ ] Toggle between Grid and List views — both display correctly
- [ ] Filter by template — only periods from that template shown
- [ ] Filter by cadence — only matching cadence periods shown
- [ ] Clear filters — all periods shown again
- [ ] Period count displayed correctly

### 4.2 Create Period
- [ ] Click "Create First Period" (empty state) or "+" button — creation modal appears
- [ ] Select a template from dropdown — currency and cadence info displayed
- [ ] Select start date — end date auto-calculated for non-Custom cadences
- [ ] For Custom cadence — end date field appears and is required
- [ ] Click "Create Period" — period appears in list
- [ ] Verify period card shows name, date range, template info

### 4.3 Period Detail View
- [ ] Click on a period card/row — detail grid view opens
- [ ] Toolbar shows period name, date range, "All Periods" back button, "Save Period" button
- [ ] Grid displays categories as rows with: Category name, Budgeted, Spent, Received, Remaining columns
- [ ] "Category" and "Budgeted" columns are frozen (don't scroll horizontally)
- [ ] "Remaining" column is auto-sized and has no resize handle

### 4.4 Inline Cell Editing
- [ ] Click on a "Budgeted" cell — cell becomes editable
- [ ] Type a number — value updates
- [ ] Press Tab/Enter — moves to next cell
- [ ] Press Escape — cancels edit
- [ ] "Remaining" column auto-recalculates (Budgeted - Spent + Received)

### 4.5 Column Resizing
- [ ] Drag column border — column resizes
- [ ] Column widths persist across page navigation
- [ ] Snap mode (magnetic vs. detent) works per Settings selection

### 4.6 Double-Click Ledger Modal
- [ ] Double-click on Spent, Received, or Remaining cell — Category Ledger modal opens
- [ ] Modal shows category name and transaction list

### 4.7 Save Period
- [ ] Make changes to budgeted values — "Save Period" button enabled
- [ ] Click "Save Period" — spinner shows, then "Saved!" feedback
- [ ] Stay on period view after save (no auto-navigation)
- [ ] Click "All Periods" — returns to period list

---

## 5. Transactions (Category Ledger Modal)

### 5.1 Add Transaction
- [ ] Open ledger modal for a category
- [ ] Click "New Transaction" — form appears
- [ ] Fill in: Amount, Type (Spent/Received), Date, optional Description
- [ ] Click "Add" — transaction appears in list
- [ ] Grid cell values update to reflect new transaction

### 5.2 Edit Transaction
- [ ] Click edit icon on a transaction — inline edit form appears
- [ ] Modify amount, description, or date — click "Save"
- [ ] Verify changes reflected in list and grid

### 5.3 Delete Transaction
- [ ] Click delete icon on a transaction — confirmation prompt appears
- [ ] Confirm — transaction removed
- [ ] Grid cell values update

---

## 6. Settings

### 6.1 Language Selection
- [ ] Navigate to Settings — Language section visible
- [ ] English selected by default
- [ ] Select "Deutsch" — entire UI switches to German immediately
- [ ] Reload app — language preference persisted (still German)
- [ ] Switch back to English — UI returns to English

### 6.2 Grid Snap Mode
- [ ] "Magnetic snap" and "Hard detent snap" options visible
- [ ] Select each option — radio button updates
- [ ] Go to period grid and resize columns — snap behavior matches selection

### 6.3 Backup Guidance
- [ ] Backup section shows current file path
- [ ] "Copy path" button copies path to clipboard (shows "Copied!")
- [ ] "Show in Explorer" button opens file explorer to file location
- [ ] Backup steps are clearly listed

### 6.4 CSV Export
- [ ] Export section visible with "Export CSV" button
- [ ] Click "Export CSV" — file save dialog appears
- [ ] Choose location — CSV file exported
- [ ] Open CSV — data matches current budget data
- [ ] Verify CSV includes headers: Category, Budgeted, Spent, Received, Remaining

---

## 7. Error Handling

### 7.1 Error Boundary
- [ ] If a component crashes, fallback UI appears with "Something went wrong"
- [ ] "Dismiss" button attempts recovery
- [ ] "Reload App" button reloads the application
- [ ] Technical details expandable for debugging

### 7.2 Backend Errors
- [ ] Database locked → user-friendly message shown
- [ ] Wrong password → clear error message
- [ ] File not found → clear error message
- [ ] All error messages localized per language setting

---

## 8. Internationalization (i18n)

- [ ] All UI text translated when switching languages
- [ ] Currency formatting matches locale (e.g., CHF 1,234.56 in English, CHF 1'234.56 in German)
- [ ] Date formatting matches locale (e.g., "Jan 15, 2026" vs "15. Jan. 2026")
- [ ] Aria labels translated for screen readers
- [ ] No untranslated strings visible

---

## 9. Performance

- [ ] App launches within 3 seconds
- [ ] File open/unlock completes within 2 seconds
- [ ] Grid renders smoothly with 20+ categories
- [ ] Save operation completes within 1 second
- [ ] No visible jank during column resize
- [ ] CSV export completes within 5 seconds for typical data

---

## 10. Edge Cases

- [ ] Create period with no categories in template — empty state shown with guidance
- [ ] Enter very large budget values (e.g., 999,999.99) — formatting correct
- [ ] Enter zero or negative transaction amounts — handled gracefully
- [ ] Rapid save clicks — no duplicate saves or errors
- [ ] Close and reopen file — all data persisted correctly
- [ ] Switch language mid-workflow — UI updates without data loss

---

## Automated Test Summary

| Layer | Framework | Tests | Status |
|-------|-----------|-------|--------|
| Frontend utilities | Vitest | 57 | ✅ All pass |
| Frontend components | Vitest + RTL | 18 | ✅ All pass |
| Rust backend | cargo test | 63 | ✅ All pass |
| **Total** | | **138** | **✅ All pass** |

### Running Tests
```bash
# Frontend tests
npm test

# Rust tests
cd src-tauri && cargo test
```
