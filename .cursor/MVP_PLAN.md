# MVP Implementation Plan

## Overview

This document outlines the step-by-step implementation plan for the ExpensesManager MVP. Each step includes checkpoints and acceptance criteria.

> **Last Updated:** 2026-02-15 (Phase 12 — Documentation Update in progress)

## Key Confirmed Decisions

| Decision | Status | Details |
|----------|--------|---------|
| Target Platform | CONFIRMED | Windows 11 only for MVP |
| Encryption | IMPLEMENTED | SQLCipher via rusqlite (bundled-sqlcipher) |
| Password Hashing | IMPLEMENTED | Argon2id (64 MB memory, 3 iterations, 4 threads) |
| Grid Editing | IMPLEMENTED | Modal-only (no inline editing) — custom PeriodGrid |
| Performance | CONFIRMED | <100ms target, <500ms acceptable, loading screens required |
| Testing | IMPLEMENTED | Vitest + React Testing Library (frontend), inline #[cfg(test)] (Rust) |
| Multi-currency | IMPLEMENTED | Fixed conversion ratio, multi-currency columns (CHF/EUR) |
| Virtualization | CONFIRMED | Use for large lists |
| **Licensing** | DEFERRED | Safeguards #62/#63 implemented; App Mode Plumbing #61 out-of-scope for MVP |
| **No Lock-In** | IMPLEMENTED | Users can ALWAYS access data + export (Safeguards #62, #63) |
| **Attachments** | IMPLEMENTED | BLOB storage in SQLCipher DB, thumbnails, popover/lightbox viewing |
| **i18n** | IMPLEMENTED | 3 languages: English, German, Hungarian |

---

## Phase 1: Foundation — File System & Encryption

### Step 1.1: File Picker Integration ✅ COMPLETED (2026-02-06)
**Goal**: Add file picker to create/open finance files  
**Scope**: 
- Integrate Tauri file dialog API
- Create "Create File" and "Open File" flows
- Store file path in app state

**Acceptance Criteria**:
- ✅ User can click "Create New Finance File" → file picker opens
- ✅ User can select save location and filename
- ✅ User can click "Open Finance File" → file picker opens
- ✅ Selected file path stored in app state

**Implemented Files**:
- `src/components/features/Onboarding/Onboarding.tsx` — Onboarding UI
- `src/services/fileService.ts` — Tauri dialog wrapper
- `src/store/slices/fileSlice.ts` — Redux file state
- `src/pages/HomePage.tsx`, `src/pages/SettingsPage.tsx` — Pages
- `src-tauri/src/lib.rs` — Dialog plugin registration

**Complexity**: S (Small) | **GitHub Issue**: #20

---

### Step 1.2: Master Password Flow ✅ COMPLETED (2026-02-09)
**Goal**: Implement password creation and unlock  
**Scope**:
- Password creation modal (with confirmation)
- Password unlock modal
- Password validation (strength, match)
- Password hint (optional)

**Acceptance Criteria**:
- ✅ User can create master password when creating file
- ✅ User can unlock file with master password
- ✅ Wrong password shows error
- ✅ Password hint stored and displayed

**Implemented Files**:
- `src/components/features/Onboarding/PasswordCreationModal.tsx` — Password creation UI
- `src/components/features/Onboarding/PasswordUnlockModal.tsx` — Password unlock UI
- `src/components/common/PasswordInput.tsx` — Reusable password input component
- `src/utils/passwordValidation.ts` — Password validation rules
- `src/utils/passwordStrength.ts` — Password strength meter

**Complexity**: M (Medium) | **GitHub Issues**: #21, #22

---

### Step 1.2b: Temporary Stub File Format ✅ COMPLETED (2026-02-09) — OBSOLETE
**Goal**: Create a temporary plaintext file format to test create/open/unlock flows  

**⚠️ OBSOLETE**: This was a temporary format with plaintext passwords, replaced by SQLCipher encryption in Step 1.3. The stub file code (`stub_file.rs`) has been removed.

**Complexity**: S (Small) | **GitHub Issue**: #23

---

### Step 1.3: Encryption Integration ✅ COMPLETED (2026-02-09)
**Goal**: Integrate SQLCipher encryption with Argon2id key derivation  
**Scope**:
- SQLCipher via `rusqlite` with `bundled-sqlcipher` feature
- Argon2id key derivation (64 MB memory, 3 iterations, 4 threads)
- Custom file header format (magic bytes, salt, KDF params, hint)
- Replace stub file format with real encrypted SQLite

**Acceptance Criteria**:
- ✅ Database file is encrypted (SQLCipher)
- ✅ File can be unlocked with correct password
- ✅ Wrong password fails to unlock
- ✅ File can be moved/copied (portable `.financedb` files)
- ✅ Stub format replaced with real encrypted DB

**Implemented Files**:
- `src-tauri/src/encrypted_db.rs` — All Tauri commands (create, open, close, CRUD)
- `src-tauri/src/kdf.rs` — Argon2id key derivation
- `src-tauri/src/file_header.rs` — Custom file header (magic bytes, salt, KDF params, hint)
- `src-tauri/src/migrations.rs` — Database schema migrations (v1–v5)
- `src-tauri/Cargo.toml` — Dependencies: rusqlite (bundled-sqlcipher), argon2, rand

**Complexity**: L (Large) | **GitHub Issues**: #24, #25, #26

**Checkpoint**: ✅ File system working, encryption integrated, password flow complete

---

## Phase 2: Data Model — Budget Instances & Categories

### Step 2.1: Period Budget Instance Schema ✅ COMPLETED (2026-02-09)
**Goal**: Model a single budget instance per period  

**Implemented Files**:
- `src-tauri/src/migrations.rs` — Migration v1: `period_budget_instances` table
- `src-tauri/src/encrypted_db.rs` — `create_period`, `get_periods` commands

**Complexity**: M (Medium) | **GitHub Issue**: #27

---

### Step 2.2: Budget Category Rows ✅ COMPLETED (2026-02-09)
**Goal**: Store category rows linking budget instance to global categories  

**Implemented Files**:
- `src-tauri/src/migrations.rs` — Migration v1: `global_categories`, `budget_instance_categories` tables
- `src-tauri/src/encrypted_db.rs` — Category CRUD commands

**Complexity**: M (Medium) | **GitHub Issue**: #28

---

### Step 2.3: Add Cadence to Templates ✅ COMPLETED (2026-02-09)
**Goal**: Ensure templates define cadence/period length  

**Implemented Files**:
- `src-tauri/src/migrations.rs` — Migration v1: `templates`, `template_categories` tables with cadence
- `src/types/template.types.ts` — Template TypeScript types

**Complexity**: S (Small) | **GitHub Issue**: #29

---

### Step 2.4: Received/Spent Line Items Schema ✅ COMPLETED (2026-02-09)
**Goal**: Store received and spent line items per category  

**Implemented Files**:
- `src-tauri/src/migrations.rs` — Migration v1: `category_line_items` table
- `src/types/lineItem.types.ts` — Line item TypeScript types

**Complexity**: M (Medium) | **GitHub Issue**: #30

---

### Step 2.5: Implement Rollup Queries ✅ COMPLETED (2026-02-09)
**Goal**: Rollup queries for received/spent totals  

**Implemented Files**:
- `src-tauri/src/encrypted_db.rs` — `get_budget_grid_data` command with rollup aggregation
- `src/services/periodService.ts` — Grid data service

**Complexity**: M (Medium) | **GitHub Issue**: #31

**Checkpoint**: ✅ Database schema supports budget instances, global categories, and received/spent line items

---

## Phase 3: Templates — Cadence & Period Application

### Step 3.1: Template UI — Cadence ✅ COMPLETED (2026-02-09)
**Goal**: Template creation/editing with cadence selection  

**Implemented Files**:
- `src/pages/TemplatesPage.tsx` — Template management page
- `src/components/features/Templates/TemplateCategoryList.tsx` — Category list with drag-and-drop
- `src/components/features/Templates/TemplateCategoryItem.tsx` — Individual category item
- `src/services/templateService.ts` — Template Tauri command wrapper
- `src/store/slices/templateSlice.ts` — Redux template state

**Complexity**: S (Small) | **GitHub Issues**: #32, #33

---

### Step 3.2: Template → Period Application ✅ COMPLETED (2026-02-09)
**Goal**: Apply template to create period with envelopes  

**Implemented Files**:
- `src-tauri/src/encrypted_db.rs` — `apply_template` command
- `src/services/periodService.ts` — `applyTemplate()` function

**Complexity**: M (Medium) | **GitHub Issue**: #34

**Checkpoint**: ✅ Templates include cadence + defaults and can create period budget instances

---

## Phase 4: UI — Single-Period Main Grid

### Step 4.1: Grid Component Architecture ✅ COMPLETED (2026-02-09)
**Goal**: Design and implement grid component hierarchy  

**Implemented Files**:
- `src/components/features/BudgetGrid/PeriodGrid.tsx` — Grid orchestrator
- `src/components/features/BudgetGrid/types.ts` — Grid column config and types

**Complexity**: S (Small) | **GitHub Issue**: #35

---

### Step 4.2: Grid Data Loading ✅ COMPLETED (2026-02-09)
**Goal**: Load and display one budget instance category grid data  

**Implemented Files**:
- `src/components/features/BudgetGrid/PeriodGridTable.tsx` — Table container with auto-sizing
- `src/components/features/BudgetGrid/PeriodGridHeader.tsx` — Column headers with resize handles
- `src/components/features/BudgetGrid/PeriodGridBody.tsx` — Data rows + summary row
- `src/components/features/BudgetGrid/PeriodGridRow.tsx` — Individual row
- `src/components/features/BudgetGrid/PeriodGridCell.tsx` — Individual cell
- `src/components/features/BudgetGrid/PeriodGridEmpty.tsx` — Empty state
- `src/components/features/BudgetGrid/PeriodGridSkeleton.tsx` — Loading skeleton
- `src/store/slices/budgetSlice.ts` — Redux budget state

**Complexity**: L (Large) | **GitHub Issue**: #36

---

### Step 4.3: Grid Cell Selection ✅ COMPLETED (2026-02-10)
**Goal**: Excel-like cell selection with mouse and keyboard  

**Complexity**: M (Medium) | **GitHub Issue**: #37

---

### Step 4.4: Frozen Columns/Rows ✅ COMPLETED (2026-02-11)
**Goal**: Sticky column headers and frozen left columns  

**Complexity**: M (Medium) | **GitHub Issue**: #38

---

### Step 4.5: Double-Click to Open Modal ✅ COMPLETED (2026-02-11)
**Goal**: Double-click on received/spent cells opens transaction modal  

**Implemented Files**:
- `src/components/features/BudgetGrid/CategoryLedgerModal.tsx` — Transaction modal

**Complexity**: M (Medium) | **GitHub Issue**: #39

---

### Step 4.6: Period Filtering ✅ COMPLETED (2026-02-11)
**Goal**: Filter/navigate between period budget instances  

**Implemented Files**:
- `src/components/features/BudgetGrid/PeriodList.tsx` — Period list view
- `src/components/features/BudgetGrid/PeriodListRow.tsx` — Period list row
- `src/components/features/BudgetGrid/PeriodCard.tsx` — Period card display
- `src/components/features/BudgetGrid/PeriodDetailToolbar.tsx` — Period detail toolbar

**Complexity**: M (Medium) | **GitHub Issue**: #40

**Checkpoint**: ✅ Grid displays one period budget instance, all interactions work

---

## Phase 5: Transactions — Double-Click Modal

### Step 5.1: Transaction Modal Integration ✅ COMPLETED (2026-02-11)
**Goal**: Open transaction modal on double-click with correct context  

**Complexity**: M (Medium) | **GitHub Issue**: #41

---

### Step 5.2: Transaction Entry ✅ COMPLETED (2026-02-11)
**Goal**: Add transactions via modal form  

**Implemented Files**:
- `src/services/lineItemService.ts` — Line item CRUD service

**Complexity**: M (Medium) | **GitHub Issue**: #42

---

### Step 5.3: Transaction Edit/Delete ✅ COMPLETED (2026-02-11)
**Goal**: Edit and delete transactions, grid updates automatically  

**Complexity**: M (Medium) | **GitHub Issue**: #43

**Checkpoint**: ✅ Double-click opens modal, transactions save, grid updates with rollups

---

## Phase 6: Period Creation Flow

### Step 6.1: Period Creation UI ✅ COMPLETED (2026-02-11)
**Goal**: Period creation modal with template and date selection  

**Implemented Files**:
- `src/components/features/BudgetGrid/CreatePeriodModal.tsx` — Period creation form

**Complexity**: M (Medium) | **GitHub Issue**: #44

---

### Step 6.2: Period Creation Backend ✅ COMPLETED (2026-02-11)
**Goal**: Create period with envelopes from template  

**Complexity**: M (Medium) | **GitHub Issue**: #45

---

### Step 6.3: Period Display ✅ COMPLETED (2026-02-11)
**Goal**: Navigate to the new period grid view  

**Complexity**: S (Small) | **GitHub Issue**: #46

**Checkpoint**: ✅ User can create periods from templates, periods display in grid

---

## Phase 7: Export & Backup

### Step 7.1: CSV Export Backend ✅ COMPLETED (2026-02-11)
**Goal**: Export data to CSV  

**Implemented Files**:
- `src-tauri/src/encrypted_db.rs` — `export_csv` command
- `src/services/exportService.ts` — Export service wrapper

**Complexity**: M (Medium) | **GitHub Issue**: #47

---

### Step 7.2: CSV Export UI ✅ COMPLETED (2026-02-11)
**Goal**: Export CSV via UI with file picker  

**Implemented Files**:
- `src/components/features/Settings/ExportSettings.tsx` — Export section in Settings

**Complexity**: S (Small) | **GitHub Issue**: #48

---

### Step 7.3: Backup Guidance ✅ COMPLETED (2026-02-11)
**Goal**: Show backup instructions in Settings  

**Implemented Files**:
- `src/components/features/Settings/BackupSettings.tsx` — Backup guidance section

**Complexity**: S (Small) | **GitHub Issue**: #49

**Checkpoint**: ✅ CSV export works, backup guidance displayed

---

## Phase 7.5: Licensing & App Modes — DEFERRED

> **Status Note**: Licensing safeguards for data access are IMPLEMENTED (#62, #63). Full app mode plumbing (#61) has been moved to `out-of-scope` for MVP. See `.cursor/LICENSING_MVP_IMPACTS.md` for details.

### Implemented Safeguards

| Safeguard | GitHub Issue | Status |
|-----------|-------------|--------|
| SAFEGUARD-2: Export Always Available | #62 | ✅ CLOSED — completed (2026-02-12) |
| SAFEGUARD-3: DB Open/Unlock Never Blocked | #63 | ✅ CLOSED — completed (2026-02-12) |

### Deferred (Out-of-Scope for MVP)

| Item | GitHub Issue | Status |
|------|-------------|--------|
| SAFEGUARD-1: App Mode Plumbing (Full vs Read-Only) | #61 | OPEN — `out-of-scope` |
| License file import | — | Depends on #61 |
| License state in Redux | — | Depends on #61 |
| License status display in Settings | — | Depends on #61 |
| Feature gating by build date | — | Depends on #61 |

See `.cursor/LICENSING_MVP_IMPACTS.md` for complete breakdown. All open licensing questions (LQ1–LQ5) remain deferred.

---

## Phase 8: Polish & Testing

### Step 8.1: Error Handling ✅ COMPLETED (2026-02-12)
**Goal**: Comprehensive error handling across the application  

**Implemented Files**:
- `src/components/common/ErrorBoundary.tsx` — React error boundary
- `src/utils/formatErrorMessage.ts` — User-friendly error formatting
- All components — Error states and recovery actions

**Complexity**: M (Medium) | **GitHub Issue**: #50

---

### Step 8.2: Internationalization (i18n) ✅ COMPLETED (2026-02-12)
**Goal**: Support English, German, and Hungarian  

**Implemented Files**:
- `src/i18n/index.ts` — i18next config + localStorage persistence
- `src/i18n/en.json` — English translations (~300+ keys)
- `src/i18n/de.json` — German translations (~300+ keys)
- `src/i18n/hu.json` — Hungarian translations (~300+ keys)
- `src/utils/currency.ts` — Locale-aware `formatCurrency` via `Intl.NumberFormat`
- `src/utils/dateFormat.ts` — Locale-aware `formatDate`/`formatTime` via `Intl.DateTimeFormat`
- `src/components/features/Settings/LanguageSettings.tsx` — Language selection UI
- All 20+ component files translated

**Complexity**: M (Medium) | **GitHub Issue**: #51

---

### Step 8.3: Automated Testing ✅ COMPLETED (2026-02-12)
**Goal**: Write automated tests for frontend and backend  

**Implemented Files**:
- `src/test/setup.ts` — Vitest test setup (jsdom)
- `src/test/renderWithProviders.tsx` — Test utility with Redux store
- `src/utils/__tests__/*.test.ts` — 57 utility tests (formatErrorMessage, passwordValidation, passwordStrength, currency, dateFormat, formatFileSize)
- `src/components/common/__tests__/*.test.tsx` — 18 component tests (ErrorBoundary, PasswordInput, FileSizeWarningDialog)
- `src/components/features/Settings/__tests__/LanguageSettings.test.tsx` — Language settings tests
- `src-tauri/src/*.rs` — 63 Rust backend tests (inline `#[cfg(test)]` modules)
- `.cursor/TEST_PLAN.md` — Manual test plan covering all 10 MVP feature areas

**Implementation Notes**:
- Total automated tests: 138+ (75 frontend + 63 Rust)
- BUG-007 (#15) closed: "stay on period after save" accepted as correct UX

**Complexity**: L (Large) | **GitHub Issue**: #52

**Checkpoint**: ✅ MVP base features complete, tested, ready for additional phases

---

## Phase 9: Safeguards & Quick Fixes ✅ COMPLETED (2026-02-09 to 2026-02-12)

### Overview
This phase covered licensing safeguards (non-negotiable data access principles) and quick UI/UX fixes discovered during implementation.

### Tasks

| Task | GitHub Issue | Closed | Description |
|------|-------------|--------|-------------|
| TASK-SAFEGUARD-2: Export Always Available | #62 | 2026-02-12 | Export command/UI never gated by license status |
| TASK-SAFEGUARD-3: DB Open/Unlock Never Blocked | #63 | 2026-02-12 | File/DB operations are license-independent |
| TASK-9.1: Dashboard Page Placeholder | #64 | 2026-02-09 | Dashboard tab with placeholder content |
| TASK-FIX-1: Password Modal Responsive Height | #66 | 2026-02-09 | Fixed modal height on small screens |
| TASK-FIX-2: Close File Backend Connection | #67 | 2026-02-09 | Close backend DB connection when closing file |

**Note**: TASK-SAFEGUARD-1 (#61, App Mode Plumbing) was moved to `out-of-scope` — see Phase 7.5.

**Implemented Files**:
- `src/pages/DashboardPage.tsx` — Dashboard page placeholder
- `src/components/features/Onboarding/PasswordCreationModal.tsx` — Responsive height fix
- `src-tauri/src/encrypted_db.rs` — `close_file` command fix

---

## Phase 10: Bug Fixes ✅ COMPLETED (2026-02-09 to 2026-02-12)

### Overview
This phase addressed grid-related bugs discovered during testing, primarily around column resizing behavior and cell rendering.

### Tasks

| Task | GitHub Issue | Closed | Description |
|------|-------------|--------|-------------|
| BUG-003: Cell Text Wrapping & Column Resizing | #81 | 2026-02-09 | Added text wrapping and basic column resize |
| BUG-003b: Column Resize Behavior Adjustments | #82 | 2026-02-09 | Paired resize, snap-to-content, frozen column rules |
| BUG-010: No Resize Handle at Frozen Boundary | #83 | 2026-02-10 | Removed unwanted handle between frozen and resizable columns |
| BUG-011: Amplified Column Resize | #84 | 2026-02-10 | Fixed 1:1 mouse-to-slider with `table-layout: fixed` |
| BUG-012: Remaining Column Fixed Width | #85 | 2026-02-10 | "Remaining" column auto-sized, non-resizable, added `resizable` property |
| BUG-007: Save Period Navigation | #15 | 2026-02-12 | Confirmed "stay on period after save" as correct UX |

**Implemented Files**:
- `src/components/features/BudgetGrid/PeriodGridHeader.tsx` — Resize handles, paired resize logic
- `src/components/features/BudgetGrid/PeriodGridTable.tsx` — `table-layout: fixed`, auto-sizing
- `src/components/features/BudgetGrid/PeriodGridCell.tsx` — Text wrapping, maxWidth
- `src/components/features/BudgetGrid/PeriodGridBody.tsx` — Summary row column consistency
- `src/components/features/BudgetGrid/types.ts` — Added `resizable` property to `GridColumnConfig`
- `src/components/features/Settings/PeriodTableSettings.tsx` — Snap mode setting (magnetic/detent)
- `src/services/settingsService.ts` — UI settings persistence service
- `.cursor/COLUMN_RESIZE_SPEC.md` — Updated spec

---

## Phase 11: Attachments ✅ COMPLETED (2026-02-13 to 2026-02-15)

### Overview
This phase added a complete file attachment system allowing users to attach files (images, PDFs, documents) to line items/transactions, with thumbnail generation, popover/lightbox viewing, and export capabilities.

### Tasks

| Task | GitHub Issue | Closed | Description |
|------|-------------|--------|-------------|
| TASK-11.1: DB Migration v5 — Attachments Table | #86 | 2026-02-13 | `line_item_attachments` table with BLOB storage |
| TASK-11.2: Rust Backend — Attachment CRUD Commands | #87 | 2026-02-13 | Add/get/delete/export attachment commands |
| TASK-11.3: Rust Backend — Thumbnail + MIME Detection | #88 | 2026-02-13 | Image thumbnail generation, MIME type detection |
| TASK-11.4: Frontend — Attachment Types + Service | #89 | 2026-02-13 | TypeScript types and service layer |
| TASK-11.5: Frontend — AttachmentIndicator Component | #90 | 2026-02-13 | Compact indicator showing attachment count |
| TASK-11.6: Frontend — AttachmentPopover Component | #91 | 2026-02-13 | Thumbnail grid popover for quick viewing |
| TASK-11.7: Frontend — AttachmentLightbox View | #92 | 2026-02-13 | Full-screen gallery with navigation |
| TASK-11.8: Frontend — Integration into CategoryLedgerModal | #93 | 2026-02-13 | Attachment indicator in transaction rows |
| TASK-11.9: Frontend — File Size Warning Dialog | #94 | 2026-02-13 | Warning for files >25MB |
| TASK-11.10: Frontend — Settings Toggle (Attachment View Mode) | #95 | 2026-02-15 | Removed (unified popover→lightbox flow) |
| TASK-11.11: Internationalization — Attachment Keys | #96 | 2026-02-13 | Translation keys in EN, DE, HU |
| TASK-11.12: Testing — Attachment Tests | #97 | 2026-02-13 | Unit + integration tests for attachments |

**Implemented Files**:
- `src-tauri/src/migrations.rs` — Migration v5: `line_item_attachments` table + indexes
- `src-tauri/src/encrypted_db.rs` — `add_attachment`, `get_attachments`, `delete_attachment`, `export_attachment` commands
- `src/types/attachment.types.ts` — Attachment TypeScript types
- `src/services/attachmentService.ts` — Attachment service layer
- `src/hooks/useAttachmentUpload.ts` — Upload hook with file picker + size warning
- `src/components/features/BudgetGrid/AttachmentIndicator.tsx` — Compact indicator with count badge
- `src/components/features/BudgetGrid/AttachmentPopover.tsx` — Thumbnail grid popover
- `src/components/features/BudgetGrid/AttachmentLightbox.tsx` — Full-screen gallery (export only)
- `src/components/features/BudgetGrid/CategoryLedgerModal.tsx` — Integration point
- `src/components/common/FileSizeWarningDialog.tsx` — File size warning dialog
- `src/utils/formatFileSize.ts` — Human-readable file size formatting
- `src/i18n/en.json`, `src/i18n/de.json`, `src/i18n/hu.json` — Attachment translation keys
- Test files: `src/services/__tests__/attachmentService.test.ts`, `src/hooks/__tests__/useAttachmentUpload.test.ts`, `src/components/features/BudgetGrid/__tests__/AttachmentIndicator.test.tsx`, `src/components/common/__tests__/FileSizeWarningDialog.test.tsx`

---

## Phase 12: Documentation Update 📋 CURRENT (2026-02-15 — in progress)

### Overview
This phase updates all `.cursor/` documentation files to accurately reflect the codebase after completing Phases 1–11. Documentation had fallen severely behind during rapid feature development.

### Completed Tasks

| Task | GitHub Issue | Closed | Description |
|------|-------------|--------|-------------|
| TASK-12.1: Delete Obsolete Files + Create Archive | #98 | 2026-02-15 | Removed `START_HERE.md`, `FINANCEDB_STUB_SPEC.md`; archived `QUESTIONS_FOR_USER.md`, `RESEARCH_BINARY_STORAGE.md`, `TASK-1.4_SQLCIPHER_RESEARCH.md`; updated 17 cross-references |
| TASK-12.5: Update MVP_PLAN.md | #102 | — | This task (current) |
| TASK-12.12: Update BUILD_AND_RUN.md + RULES.md | #109 | 2026-02-15 | Updated testing, prerequisites, database, Rust backend sections |
| TASK-12.13: Update MCP_RECOMMENDATIONS.md + LICENSING Docs | #110 | 2026-02-15 | Rewrote MCP docs; updated licensing safeguard statuses |

### Remaining Tasks

| Task | GitHub Issue | Complexity | Dependencies |
|------|-------------|-----------|-------------|
| TASK-12.2: Rewrite ARCHITECTURE_CURRENT.md | #99 | L | None |
| TASK-12.3: Rewrite REPO_MAP.md | #100 | L | None |
| TASK-12.4: Rewrite DATA_MODEL.md | #101 | L | None |
| TASK-12.6: Update PROJECT_OVERVIEW.md | #103 | M | None |
| TASK-12.7: Update TEST_PLAN.md | #104 | M | None |
| TASK-12.8: Update PRODUCT_REQUIREMENTS.md | #105 | M | None |
| TASK-12.9: Update UI_FLOWS.md | #106 | M | None |
| TASK-12.10: Update UX_INTERACTIONS.md | #107 | M | None |
| TASK-12.11: Update Spec Documents (4 files) | #108 | M | None |
| TASK-12.14: Update Agents Directory | #111 | M | #99, #100, #101 |
| TASK-12.15: Update Skills Directory | #112 | M | #99, #100 |
| TASK-12.16: Update Commands Directory | #113 | M | #99, #100, #101 |

---

## Phase 13: Dashboard Widgets & Customization 🚧 IN PROGRESS (2026-02-26 — present)

### Overview
This phase expands the dashboard from a shell into a configurable, insight-oriented surface with widget selection, ordering, and chart-based views.

### Recently Completed

| Task | GitHub Issue | Closed | Description |
|------|-------------|--------|-------------|
| TASK-13.2: Dashboard shell + widget architecture | #117 | 2026-02-26 | Introduced dashboard module structure, widget registry, card/state abstractions, and initial widget contract |
| TASK-13.3: Default dashboard setup + add/remove/reset widgets | #119 | 2026-02-27 | Added persisted widget visibility selection and default/reset controls |
| TASK-13.4: Drag-and-drop widget reordering | #122 | 2026-02-27 | Added DnD ordering with persisted order and keyboard reorder fallback |
| TASK-13.5: Dashboard chart library selection spike | #123 | 2026-02-27 | Compared `recharts` vs `@nivo/*`; selected `recharts` for upcoming chart widgets with bundle/performance guardrails |
| TASK-13.8: Category breakdown widget (current period) | #124 | 2026-02-27 | Added current-period spending distribution widget with top-category readability strategy and period drill-through |
| TASK-13.10: Cross-period trend widget (recent N periods) | #127 | 2026-02-27 | Added configurable multi-period trend visualization for received/spent/net totals using existing period and grid rollups |
| TASK-13.11: Allocation vs actual widget | #125 | 2026-02-27 | Added current-period allocation-versus-actual variance widget with clear over/under/on-target states and category drill-through |
| TASK-13.12: Largest changes vs previous period widget | #131 | 2026-02-27 | Added current-vs-previous category delta widget with selectable metric modes and mismatch-safe comparisons |

### Chart Library Decision (TASK-13.5)
- **Selected:** `recharts`
- **Reasoning:** Strong fit for current MVP dashboard needs (simple React + TypeScript ergonomics, clear composition model, built-in accessibility layer with keyboard navigation support).
- **Trade-off:** Known bundle-size overhead; follow-up chart tasks must keep chart scope focused and include performance checks.
- **Follow-up tasks using this decision:** #135

---

## Implementation Order

1. **Phase 1** (Foundation) — ✅ COMPLETED (2026-02-06 to 2026-02-09)
2. **Phase 2** (Data Model) — ✅ COMPLETED (2026-02-09)
3. **Phase 3** (Templates) — ✅ COMPLETED (2026-02-09)
4. **Phase 4** (Grid UI) — ✅ COMPLETED (2026-02-09 to 2026-02-11)
5. **Phase 5** (Transactions) — ✅ COMPLETED (2026-02-11)
6. **Phase 6** (Period Creation) — ✅ COMPLETED (2026-02-11)
7. **Phase 7** (Export & Backup) — ✅ COMPLETED (2026-02-11)
8. **Phase 7.5** (Licensing) — ❌ DEFERRED (safeguards #62/#63 done; app modes #61 out-of-scope)
9. **Phase 8** (Polish & Testing) — ✅ COMPLETED (2026-02-11 to 2026-02-12)
10. **Phase 9** (Safeguards & Fixes) — ✅ COMPLETED (2026-02-09 to 2026-02-12)
11. **Phase 10** (Bug Fixes) — ✅ COMPLETED (2026-02-09 to 2026-02-12)
12. **Phase 11** (Attachments) — ✅ COMPLETED (2026-02-13 to 2026-02-15)
13. **Phase 12** (Documentation) — 📋 CURRENT (2026-02-15 — in progress)
14. **Phase 13** (Dashboard Widgets & Customization) — 🚧 IN PROGRESS (2026-02-26 — present)

---

## Success Criteria (MVP Complete)

✅ User can create/open encrypted finance file  
✅ User can create templates referencing global categories + cadence + default amounts  
✅ User can create periods from templates  
✅ User can view one period budget instance grid (rows = categories; columns = received/spent fields)  
✅ User can add transactions via double-click modal  
✅ User can see rollups (received/spent totals) in grid  
✅ User can export to CSV  
✅ User sees backup guidance  
✅ User can attach files to transactions and view/export them  
✅ App supports 3 languages (EN, DE, HU)  
✅ **Export is ALWAYS available** (safeguard #62)  
✅ **DB Open/Unlock is NEVER blocked** (safeguard #63)  
❌ ~~App runs in Read-Only mode by default~~ — DEFERRED (#61 out-of-scope)  
❌ ~~User can import perpetual license file~~ — DEFERRED (depends on #61)  
❌ ~~Feature gating uses build date~~ — DEFERRED (depends on #61)  

---

## References

- See **GitHub Issues** for detailed task breakdown
- See **PRODUCT_REQUIREMENTS.md** for requirements
- See **DATA_MODEL.md** for schema details
- See **LICENSING.md** for authoritative licensing spec
- See **LICENSING_MVP_IMPACTS.md** for MVP licensing breakdown