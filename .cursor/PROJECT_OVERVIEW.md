# Project Overview

> **Last Updated:** 2026-02-15 (Phase 12 — Documentation Update)

## Project Intent (CONFIRMED)

**ExpensesManager** is an Excel-like budgeting grid desktop application built with Tauri, React, and Rust.

### Core Concept
- **Main grid**: Represents exactly **one period budget instance** at a time (e.g., "January 2026" or "Biweekly period #3")
- **Rows**: Global budget categories (unique per finance file/dataset)
- **Columns**: Informational fields for categories *within the current period* — category name, received date, received amount, spent amount, remaining, and one "Account" column
- **Double-click**: Double-click **Received amount** or **Spent amount** to open a modal/table of dated line items; totals roll up into the grid
- **Templates**: Define period cadence/length + a set of global categories with default budgeted amounts for that period; using a template creates a new period budget instance
- **Attachments**: Attach files (images, PDFs, documents) to line items/transactions, with thumbnail generation and popover/lightbox viewing
- **Multi-dataset**: Each "finance" is a separate portable encrypted file (no internal profile system for MVP)
- **Import/Export**: MVP = basic CSV export + backup guidance. More (CSV import, PDF reports) = post-MVP
- **Custom columns**: OUT OF SCOPE for MVP
- **Initial currencies**: CHF + EUR (multi-currency with fixed conversion ratio)
- **Initial languages**: English, German, Hungarian (3 languages via react-i18next)

---

## Tech Stack (CONFIRMED from package.json + Cargo.toml)

### Frontend
- **React 18** with TypeScript
- **Tailwind CSS v4** (`^4.1.18`) for styling
- **Redux Toolkit** (`^2.11.2`) for state management (4 slices)
- **React Router DOM** (`^7.13.0`) for routing (4 routes)
- **react-i18next** (`^16.5.4`) + **i18next** (`^25.8.6`) for internationalization (EN, DE, HU)
- **@hello-pangea/dnd** (`^18.0.1`) for drag-and-drop (template category reordering)
- **yet-another-react-lightbox** (`^3.29.1`) for attachment gallery viewing
- **zxcvbn** (`^4.4.2`) for password strength estimation
- **Vite** (`^6.0.3`) as build tool
- **Vitest** (`^4.0.18`) + **React Testing Library** (`^16.3.2`) for automated tests
- **Lucide React** for icons (imported inline, no package entry — uses SVG components)

### Backend
- **Tauri 2** desktop framework
- **Rust** (edition 2021)
- **rusqlite** (`0.35`) with `bundled-sqlcipher` feature for encrypted SQLite database
- **argon2** (`0.5`) for password hashing (Argon2id KDF — 64 MB memory, 3 iterations, 4 threads)
- **serde** + **serde_json** for serialization
- **image** (`0.25`) for thumbnail generation (attachment system)
- **infer** (`0.16`) for MIME type detection
- **base64** (`0.22`) for binary encoding
- **thiserror** for error types
- **tempfile** for safe file operations

### Storage
- **SQLite** database with **SQLCipher encryption** (IMPLEMENTED)
- **File format**: Custom `.financedb` file with plaintext header (magic bytes `EFM1`, salt, KDF params, password hint) + encrypted SQLite body
- **Location**: User-selected portable file location (via file picker)
- **Encryption**: SQLCipher via rusqlite `bundled-sqlcipher` feature (IMPLEMENTED)
- **Key derivation**: Argon2id → raw hex key via `PRAGMA key = "x'hex'"` (bypasses SQLCipher's internal PBKDF2)
- **Target Platform**: Windows 11 only for MVP (MacOS/Linux post-MVP)

---

## Current State (CONFIRMED from repo — Phases 1–11 complete)

### Database Schema (migration v1–v5)

9 tables in the encrypted SQLite database:

| Table | Purpose | Migration |
|-------|---------|-----------|
| `_meta` | Schema version tracking | v1 |
| `global_categories` | Reusable category definitions (unique per dataset) | v1 |
| `templates` | Template definitions with cadence and default currency | v1 |
| `template_categories` | Template → global category mappings with default amounts and sort order | v1 |
| `period_budget_instances` | Budget periods (one per grid view) with cadence, start/end dates | v1 |
| `budget_instance_categories` | Category envelopes per period (rows in the grid) | v2 |
| `category_line_items` | Received/spent transactions with soft delete | v3 |
| `ui_settings` | Key-value store for persistent UI preferences | v4 |
| `line_item_attachments` | File attachments with BLOB storage and thumbnails | v5 |

Schema managed by `src-tauri/src/migrations.rs` (CURRENT_SCHEMA_VERSION = 5).

### Frontend Architecture

#### Pages (4 routes in `src/App.tsx`)
| Route | Page | Description |
|-------|------|-------------|
| `/` | `DashboardPage.tsx` | Dashboard with onboarding (file create/open) |
| `/periods` | `HomePage.tsx` | Main budget grid (PeriodGrid component) |
| `/templates` | `TemplatesPage.tsx` | Template management with category drag-and-drop |
| `/settings` | `SettingsPage.tsx` | Language, display, export, and backup settings |

#### Components (`src/components/`)

**BudgetGrid** (`features/BudgetGrid/` — 15+ components):
- `PeriodGrid.tsx` — Main container (period list + grid table)
- `PeriodGridTable.tsx` — Budget grid table with `table-layout: fixed`, auto-sizing
- `PeriodGridHeader.tsx` — Column headers with resize handles
- `PeriodGridBody.tsx` — Data rows + summary row
- `PeriodGridRow.tsx` — Individual category row
- `PeriodGridCell.tsx` — Individual cell with text wrapping
- `PeriodList.tsx` — Period selection list
- `PeriodListRow.tsx` — Period list row item
- `PeriodCard.tsx` — Period card display
- `PeriodDetailToolbar.tsx` — Toolbar for period detail view
- `CreatePeriodModal.tsx` — Period creation form (template + date selection)
- `CategoryLedgerModal.tsx` — Transaction entry/edit modal (double-click trigger)
- `AttachmentIndicator.tsx` — Compact badge showing attachment count per line item
- `AttachmentPopover.tsx` — Thumbnail grid popover for quick attachment viewing
- `AttachmentLightbox.tsx` — Full-screen gallery with navigation and export
- `PeriodGridSkeleton.tsx` — Loading skeleton
- `PeriodGridEmpty.tsx` — Empty state

**Onboarding** (`features/Onboarding/`):
- `Onboarding.tsx` — File creation/opening flow
- `PasswordCreationModal.tsx` — Master password creation with strength meter
- `PasswordUnlockModal.tsx` — Password unlock with hint display

**Templates** (`features/Templates/`):
- `TemplateCategoryList.tsx` — Category list with @hello-pangea/dnd drag-and-drop
- `TemplateCategoryItem.tsx` — Individual template category item

**Settings** (`features/Settings/`):
- `LanguageSettings.tsx` — Language selector (EN/DE/HU)
- `PeriodTableSettings.tsx` — Grid display preferences (snap mode, column sizing)
- `ExportSettings.tsx` — CSV export UI
- `BackupSettings.tsx` — Backup guidance

**Common** (`common/`):
- `AppHeader.tsx` — App navigation header
- `ErrorBoundary.tsx` — React error boundary with recovery
- `PasswordInput.tsx` — Reusable password input with show/hide toggle
- `FileSizeWarningDialog.tsx` — Warning dialog for files >25 MB

#### State Management (Redux Toolkit — 4 slices)
| Slice | Key State | Location |
|-------|-----------|----------|
| `fileSlice` | `filePath`, `fileName`, `isFileOpen`, `onboardingStep`, `passwordHint` | `src/store/slices/fileSlice.ts` |
| `budgetSlice` | `periods[]`, `currentBudgetInstanceId`, `gridData`, `selectedCell`, `columnWidths`, `showSpentMinus` | `src/store/slices/budgetSlice.ts` |
| `categorySlice` | `categories[]`, `isLoading`, `error` | `src/store/slices/categorySlice.ts` |
| `templateSlice` | `templates[]`, `selectedTemplate`, `templateCategories[]` | `src/store/slices/templateSlice.ts` |

Typed hooks: `useAppSelector`, `useAppDispatch` in `src/store/hooks.ts`.

#### Services (8 service modules in `src/services/`)
| Service | Purpose |
|---------|---------|
| `fileService.ts` | File operations — DB create/open/close, grid data loading |
| `periodService.ts` | Period CRUD (create from template, list, get, delete) |
| `categoryService.ts` | Global category CRUD |
| `templateService.ts` | Template CRUD + template category management |
| `lineItemService.ts` | Line item CRUD (received/spent transactions) |
| `attachmentService.ts` | Attachment CRUD + file pickers + export |
| `settingsService.ts` | UI settings persistence (key-value via `ui_settings` table) |
| `exportService.ts` | CSV export (UTF-8 BOM for Excel compatibility) |

#### Hooks
- `useAttachmentUpload.ts` — Upload hook with file picker + size warning integration

#### Types (`src/types/`)
- `category.types.ts`, `template.types.ts`, `period.types.ts`, `lineItem.types.ts`, `attachment.types.ts`

#### Utilities (`src/utils/`)
- `currency.ts` — Locale-aware `formatCurrency` via `Intl.NumberFormat` (CHF/EUR)
- `dateFormat.ts` — Locale-aware `formatDate`/`formatTime` via `Intl.DateTimeFormat`
- `formatFileSize.ts` — Human-readable file size formatting
- `formatErrorMessage.ts` — User-friendly error message formatting
- `passwordValidation.ts` — Password validation rules
- `passwordStrength.ts` — Password strength meter (via zxcvbn)

#### i18n (`src/i18n/`)
- `index.ts` — i18next configuration + localStorage persistence
- `en.json` — English translations (300+ keys)
- `de.json` — German translations (300+ keys)
- `hu.json` — Hungarian translations (300+ keys)

### Backend Architecture (Rust — `src-tauri/src/`)

| Module | Purpose |
|--------|---------|
| `lib.rs` | Tauri app builder, plugin registration, 38 command registrations |
| `encrypted_db.rs` | All Tauri commands — DB lifecycle, CRUD for categories/templates/periods/line items/attachments, export, UI settings |
| `kdf.rs` | Argon2id key derivation (64 MB memory, 3 iterations, 4 threads) |
| `file_header.rs` | Custom file header format — magic bytes `EFM1`, salt, KDF params, password hint |
| `migrations.rs` | Database schema migrations v1–v5, version tracking via `_meta` table |

**38 Tauri commands** grouped by domain:
- **DB lifecycle** (6): `create_encrypted_db`, `open_encrypted_db`, `get_db_info`, `close_db`, `save_db`, `diagnose_db_file`
- **Grid data** (1): `get_grid_data`
- **Global categories** (3): `create_global_category`, `list_global_categories`, `delete_global_category`
- **Templates** (5): `create_template`, `list_templates`, `get_template`, `update_template`, `delete_template`
- **Template categories** (5): `get_template_categories`, `add_category_to_template`, `remove_category_from_template`, `update_template_category_amount`, `reorder_template_categories`
- **Periods** (4): `create_period_from_template`, `list_periods`, `get_period`, `delete_period`
- **Line items** (4): `list_line_items`, `create_line_item`, `update_line_item`, `delete_line_item`
- **Attachments** (7): `add_attachment`, `list_attachments`, `get_attachment_counts`, `get_attachment_summaries`, `delete_attachment`, `export_attachment`, `get_attachment_data`
- **File metadata** (1): `get_file_sizes`
- **UI settings** (2): `get_ui_setting`, `set_ui_setting`
- **Export** (2): `export_to_csv`, `export_csv_to_file`

### Testing
- **Frontend**: Vitest + React Testing Library + jsdom
  - Test setup: `src/test/setup.ts`
  - Test helper: `src/test/renderWithProviders.tsx` (Redux store provider)
  - Utility tests: `src/utils/__tests__/*.test.ts`
  - Component tests: `src/components/**/__tests__/*.test.tsx`
  - Service tests: `src/services/__tests__/*.test.ts`
  - Hook tests: `src/hooks/__tests__/*.test.ts`
- **Backend**: Inline `#[cfg(test)]` modules in Rust source files
- **Total**: 138+ automated tests (75+ frontend, 63 Rust)
- **Run**: `npm run test` (once) or `npm run test:watch` (watch mode)

---

## MVP Requirements

### 1. Create/Open Encrypted Finance File
**Status**: ✅ IMPLEMENTED (Phase 1, completed 2026-02-09)
- ✅ File picker to create/open portable `.financedb` files
- ✅ Master password creation with strength meter and confirmation
- ✅ Password unlock with hint display and rate limiting (5 attempts)
- ✅ SQLCipher encryption via rusqlite `bundled-sqlcipher` feature
- ✅ Argon2id key derivation (replaced SHA256)
- ✅ Custom file header (magic bytes, salt, KDF params, password hint)

### 2. Create Templates (Global Categories + Default Amounts + Cadence)
**Status**: ✅ IMPLEMENTED (Phase 3, completed 2026-02-09)
- ✅ Template CRUD with cadence selection (monthly, biweekly, weekly, daily, yearly, custom)
- ✅ Global categories with unique names per dataset
- ✅ Template → category mappings with default amounts and sort order
- ✅ Drag-and-drop category reordering via @hello-pangea/dnd
- ✅ Default currency per template (CHF/EUR)

### 3. Create Period from Template
**Status**: ✅ IMPLEMENTED (Phase 6, completed 2026-02-11)
- ✅ Period creation modal with template and date selection
- ✅ `create_period_from_template` backend command
- ✅ Auto-creates envelopes (budget_instance_categories) from template
- ✅ Auto-creates first received line item from template default amount

### 4. Log Transactions via Double-Click Modal
**Status**: ✅ IMPLEMENTED (Phase 5, completed 2026-02-11)
- ✅ Double-click on Received/Spent cells opens `CategoryLedgerModal`
- ✅ Create/edit/delete transactions (soft delete)
- ✅ Each line item has date, amount, currency, description, notes
- ✅ Grid auto-updates with rollup totals after changes

### 5. Rollups in Main Grid (Spent/Remaining Totals)
**Status**: ✅ IMPLEMENTED (Phase 4, completed 2026-02-11)
- ✅ Single-period category grid (PeriodGrid component)
- ✅ Per-category received/spent/remaining rollup calculations
- ✅ Derived received date from line items (first/last date range)
- ✅ Summary row with period totals
- ✅ Column resizing with persistence

### 6. Basic Export (CSV) + Backup Guidance
**Status**: ✅ IMPLEMENTED (Phase 7, completed 2026-02-11)
- ✅ CSV export with file picker (UTF-8 BOM for Excel compatibility)
- ✅ Export settings UI in Settings page
- ✅ Backup guidance section in Settings page
- ✅ Export always available regardless of license status (safeguard #62)

### 7. Attachments (added in Phase 11)
**Status**: ✅ IMPLEMENTED (Phase 11, completed 2026-02-15)
- ✅ Attach files (images, PDFs, documents) to line items
- ✅ BLOB storage in SQLCipher-encrypted database
- ✅ Thumbnail generation for images (Rust backend)
- ✅ MIME type detection
- ✅ AttachmentIndicator with count badge
- ✅ AttachmentPopover for thumbnail grid viewing
- ✅ AttachmentLightbox for full-screen gallery with navigation
- ✅ Export attachments back to file system
- ✅ File size warning dialog (>25 MB)

### 8. Internationalization (i18n)
**Status**: ✅ IMPLEMENTED (Phase 8, completed 2026-02-12)
- ✅ 3 languages: English (EN), German (DE), Hungarian (HU)
- ✅ 300+ translation keys per language
- ✅ Language selection in Settings (persisted to localStorage)
- ✅ Locale-aware currency formatting (CHF/EUR via `Intl.NumberFormat`)
- ✅ Locale-aware date/time formatting (via `Intl.DateTimeFormat`)

### 9. Error Handling & Testing
**Status**: ✅ IMPLEMENTED (Phase 8, completed 2026-02-12)
- ✅ React ErrorBoundary with recovery actions
- ✅ User-friendly error message formatting
- ✅ 138+ automated tests (Vitest + Rust inline tests)
- ✅ Rate-limited password attempts (max 5, then lockout)

---

## Implementation Status Summary

| Feature | Status | Phase |
|---------|--------|-------|
| Encrypted finance files | ✅ IMPLEMENTED | 1 |
| Data model (periods, categories, line items) | ✅ IMPLEMENTED | 2 |
| Templates with cadence | ✅ IMPLEMENTED | 3 |
| PeriodGrid UI (single-period view) | ✅ IMPLEMENTED | 4 |
| Transaction modal (double-click) | ✅ IMPLEMENTED | 5 |
| Period creation flow | ✅ IMPLEMENTED | 6 |
| CSV export + backup guidance | ✅ IMPLEMENTED | 7 |
| Error handling + i18n + testing | ✅ IMPLEMENTED | 8 |
| Licensing safeguards (#62, #63) | ✅ IMPLEMENTED | 9 |
| Grid bug fixes (#81–#85) | ✅ IMPLEMENTED | 10 |
| Attachment system (BLOB storage) | ✅ IMPLEMENTED | 11 |
| Documentation update | 📋 IN PROGRESS | 12 |
| Licensing app mode plumbing (#61) | ❌ DEFERRED | — |

---

## Architecture Patterns (CONFIRMED)

### Frontend → Backend Communication
- Tauri `invoke()` API for all backend calls
- Commands defined in `src-tauri/src/lib.rs` → `generate_handler![]`
- All 38 command implementations in `src-tauri/src/encrypted_db.rs`
- Commands return `Result<T, String>` for error handling
- Frontend invokes via `@tauri-apps/api` `invoke()` function

### Database Access
- All DB operations in Rust backend (no direct frontend DB access)
- `DbState` (`Mutex<Option<OpenFileState>>`) manages the open database connection
- `OpenFileState` holds the rusqlite `Connection` + file path + header info
- Migrations run automatically on `open_encrypted_db` and `create_encrypted_db`
- Schema version tracked in `_meta` table (CURRENT_SCHEMA_VERSION = 5)
- Foreign keys enabled: `PRAGMA foreign_keys = ON`
- Prepared statements for all queries (prevents SQL injection)

### State Management
- **Redux Toolkit** for global state: 4 slices (`file`, `budget`, `category`, `template`)
- **Async thunks** for all backend communication
- **`settingsService`** for persistent UI preferences (stored in `ui_settings` table)
- **Component-local state** for UI-only concerns (modals, forms, selections)
- **Typed hooks**: `useAppSelector`, `useAppDispatch`

### UI Patterns
- **Tailwind CSS v4** utility classes (no inline styles)
- **Custom accessible components** (no Headless UI dependency)
- **Custom PeriodGrid** for main budget view (not AG Grid)
- **React Router** for page navigation (4 routes)
- **Keyboard navigation** throughout (tab order, escape closes modals, arrow keys in grid)
- **ARIA labels** and semantic HTML for accessibility

---

## Build & Development (CONFIRMED)

### Prerequisites
- Node.js (v18+)
- Rust (latest stable, edition 2021)
- Tauri CLI (`@tauri-apps/cli` v2)

### Commands
```bash
npm install          # Install frontend dependencies
npm run tauri dev    # Start dev server (Vite on :1420, Tauri window)
npm run tauri build  # Build production app
npm run test         # Run frontend tests (Vitest, once)
npm run test:watch   # Run frontend tests (Vitest, watch mode)
```

### Database Location
- **User-selected**: Users choose file location via file picker when creating/opening a `.financedb` file
- **No fixed location**: Files are portable and can be stored anywhere

---

## Security Status (CONFIRMED — IMPLEMENTED)

### Implemented Security Features
- ✅ **Database encryption**: SQLCipher via rusqlite `bundled-sqlcipher` feature
- ✅ **Key derivation**: Argon2id (64 MB memory, 3 iterations, 4 threads) — replaces SHA256 completely
- ✅ **File header**: Custom plaintext header with magic bytes (`EFM1`), salt, KDF params, optional password hint
- ✅ **Password flow**: Master password creation (with strength meter) + unlock flow
- ✅ **Rate limiting**: Max 5 password attempts, then lockout
- ✅ **Parameterized queries**: All SQL uses prepared statements (prevents SQL injection)
- ✅ **Foreign keys**: `PRAGMA foreign_keys = ON` for data integrity
- ✅ **Soft delete**: Transactions use `deleted_at` timestamps (reversible)

### Security Architecture
- Encryption key derived externally via Argon2id (bypasses SQLCipher's internal PBKDF2)
- Key passed as raw hex: `PRAGMA key = "x'hex'"`
- Salt stored in plaintext file header (safe — salt is not secret)
- Password never logged or persisted to disk
- No network access required (offline-first)

### MVP Security Decisions
- **Target Platform**: Windows 11 only for MVP
- **Password recovery**: Not available (by design — no cloud, no recovery secret for MVP)
- **"Remember password"**: Via OS secure storage (optional, post-MVP)

---

## Licensing Model (CONFIRMED)

See `.cursor/LICENSING.md` for authoritative source and `.cursor/LICENSING_SUMMARY.md` for structured summary.

### Plans Overview
| Plan | Cost | License Type | Capabilities |
|------|------|--------------|--------------|
| **Free Read-Only Viewer** | Free | None | View, search, filter, print, export (no edits) |
| **Perpetual Base** | ~20 CHF | Signed license file | Full base features, offline forever, 5yr feature updates |
| **Extend Feature Updates** | +10 CHF | Reissued license | +5 years feature updates |
| **Basic Paid (Rental)** | ~5 CHF/yr | Lease token + account | Base features, 30-day offline window |
| **Premium** | ~5-10 CHF/mo | Requires base access | Cloud sync, bank sync, receipt AI/OCR |

### App Modes
- **Full Mode**: Read + Write enabled
- **Read-Only Mode**: Read + Export only (on expiry or no license)

### Key Licensing Rules (CONFIRMED)
- **No lock-in**: Users can ALWAYS Open Database + Export, even in Read-Only (NON-NEGOTIABLE)
- **Offline-first**: Perpetual plan works fully offline forever
- **Privacy-first**: No email/account required for perpetual licenses
- **Feature gating**: Based on `build_release_date <= feature_updates_until` (NOT system clock)
- **Old generation handling**: Valid signature → Full Mode; show banner to update, don't disrupt (post-MVP)

### MVP Licensing Status

**Implemented safeguards:**
- ✅ SAFEGUARD-2: Export Always Available (#62 — closed, completed 2026-02-12)
- ✅ SAFEGUARD-3: DB Open/Unlock Never Blocked (#63 — closed, completed 2026-02-12)

**Deferred (out-of-scope for MVP):**
- ❌ SAFEGUARD-1: App Mode Plumbing (#61 — `out-of-scope`)
- ❌ License file import (depends on #61)
- ❌ Feature gating by build date (depends on #61)
- ❌ Payment/purchase flow
- ❌ Subscription system (Basic Paid, Premium)
- ❌ Server infrastructure
- ❌ Recovery secret flow

See `.cursor/LICENSING_MVP_IMPACTS.md` for complete breakdown.

---

## References

### Key Source Files
- `src-tauri/src/encrypted_db.rs` — All Tauri commands (DB lifecycle, CRUD, export)
- `src-tauri/src/kdf.rs` — Argon2id key derivation
- `src-tauri/src/file_header.rs` — Custom file header format (EFM1 magic, salt, KDF params)
- `src-tauri/src/migrations.rs` — Database schema migrations v1–v5
- `src-tauri/src/lib.rs` — Tauri app builder, 38 command registrations
- `src/components/features/BudgetGrid/PeriodGrid.tsx` — Main budget grid
- `src/components/features/BudgetGrid/CategoryLedgerModal.tsx` — Transaction modal
- `src/store/slices/budgetSlice.ts` — Budget state management
- `src/store/slices/fileSlice.ts` — File state management

### Documentation
- `.cursor/ARCHITECTURE_CURRENT.md` — Architecture details
- `.cursor/DATA_MODEL.md` — Database schema specification
- `.cursor/MVP_PLAN.md` — Implementation roadmap (Phases 1–12)
- `.cursor/RULES.md` — Coding standards and project rules
- `.cursor/LICENSING.md` — Authoritative licensing specification
- `.cursor/LICENSING_SUMMARY.md` — Structured licensing summary
- `.cursor/LICENSING_MVP_IMPACTS.md` — MVP licensing breakdown

---

## Next Steps

1. Complete **Phase 12** documentation tasks (see GitHub issues #99–#113)
2. Read **ARCHITECTURE_CURRENT.md** for detailed architecture
3. Read **DATA_MODEL.md** for schema details
4. Read **MVP_PLAN.md** for full implementation history
5. Ask questions directly in chat if anything is unclear
