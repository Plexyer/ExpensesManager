# Current Architecture — IMPLEMENTED

> **Last Updated**: 2026-02-17
> **Status**: All MVP features (Phases 1–11) are implemented. Phase 12 (Documentation Update) is in progress.

---

## MVP Progress

| Phase | Name | Status | Completed |
|-------|------|--------|-----------|
| 1 | Foundation — File System & Encryption | DONE | 2026-02-09 |
| 2 | Data Model — Budget Instances & Categories | DONE | 2026-02-09 |
| 3 | Templates — Cadence & Period Application | DONE | 2026-02-09 |
| 4 | UI — Single-Period Main Grid | DONE | 2026-02-11 |
| 5 | Transactions — Double-Click Modal | DONE | 2026-02-11 |
| 6 | Period Creation Flow | DONE | 2026-02-11 |
| 7 | Export & Backup | DONE | 2026-02-11 |
| 7.5 | Licensing & App Modes | DEFERRED | Safeguards only (#62, #63) |
| 8 | Polish & Testing | DONE | 2026-02-12 |
| 9 | Safeguards & Quick Fixes | DONE | 2026-02-12 |
| 10 | Bug Fixes | DONE | 2026-02-12 |
| 11 | Attachments | DONE | 2026-02-15 |
| 12 | Documentation Update | IN PROGRESS | — |

---

## Architecture Overview

```
+---------------------------------------------+
|         React 18 Frontend (TypeScript)       |
|  - Redux Toolkit (4 slices)                  |
|  - React Router DOM (MemoryRouter)           |
|  - Tailwind CSS v4 (utility classes)         |
|  - Custom PeriodGrid (no AG Grid)            |
|  - react-i18next (EN, DE, HU)               |
+-----------------------+---------------------+
                        | invoke()
                        v
+-----------------------+---------------------+
|            Tauri 2 Bridge (IPC)              |
+-----------------------+---------------------+
                        |
                        v
+-----------------------+---------------------+
|            Rust Backend                      |
|  - encrypted_db.rs (38 Tauri commands)       |
|  - kdf.rs (Argon2id key derivation)          |
|  - file_header.rs (EFM1 file format)         |
|  - migrations.rs (schema v1-v5)              |
+-----------------------+---------------------+
                        |
                        v
+-----------------------+---------------------+
|      SQLCipher-Encrypted SQLite Database     |
|  (portable .financedb file, AES-256)         |
+---------------------------------------------+
```

---

## Frontend Architecture

### Entry Point

`src/main.tsx` initializes the app:

```
React.StrictMode
  -> ErrorBoundary
    -> Provider (Redux store)
      -> MemoryRouter
        -> App (routes)
```

i18n (`src/i18n/index.ts`) is initialized before rendering. Language preference is stored in `localStorage`.

### Routing (`src/App.tsx`)

| Path | Page Component | Purpose |
|------|---------------|---------|
| `/` | `DashboardPage` | Dashboard shell with registry-driven foundation widgets |
| `/periods` | `HomePage` | Main budget grid — period list + PeriodGrid |
| `/templates` | `TemplatesPage` | Template management — CRUD, category assignment, drag-and-drop reorder |
| `/settings` | `SettingsPage` | Language, export, backup, period table settings |

Navigation is via `AppHeader` component (`src/components/common/AppHeader.tsx`) with tab-style links.

### Component Hierarchy

```
AppHeader (navigation tabs)

DashboardPage
  -> Onboarding (when no file open)
  -> DashboardShell (when file open)
     -> DashboardWidgetCard (registry-driven, user-configurable visibility)
     -> CurrentPeriodKpiWidget (received/spent/remaining totals)
     -> RecentPeriodsWidget (recent period quick access with active marker + open action)
     -> OverspentCategoriesWidget (remaining<0 alert list + period details CTA)
     -> InactiveCategoriesWidget (zero-activity categories watchlist + period details CTA)
     -> DashboardStateViews (loading/empty/error)

HomePage
  -> Onboarding (when no file open)
     -> PasswordCreationModal / PasswordUnlockModal
  -> PeriodGrid (when file open)
     -> PeriodList / PeriodCard / PeriodDetailToolbar
     -> PeriodGridTable
        -> PeriodGridHeader (column headers + resize handles)
        -> PeriodGridBody (data rows + summary row)
           -> PeriodGridRow -> PeriodGridCell
     -> PeriodGridSkeleton (loading)
     -> PeriodGridEmpty (empty state)
     -> CreatePeriodModal
     -> CategoryLedgerModal (transactions)
        -> AttachmentIndicator -> AttachmentPopover -> AttachmentLightbox

TemplatesPage
  -> TemplateCategoryList (with @hello-pangea/dnd drag-and-drop)
     -> TemplateCategoryItem

SettingsPage
  -> LanguageSettings
  -> PeriodTableSettings (snap mode, spent minus)
  -> ExportSettings
  -> BackupSettings
```

### Redux Store (`src/store/store.ts`)

4 slices combined:

```typescript
{
  file: FileState,         // filePath, fileName, isFileOpen, isLoading, error, fileInfo
  categories: CategoryState, // globalCategories list, loading status
  templates: TemplateState,  // templates list, loading status
  budget: BudgetState,       // gridData, selectedCell, columnWidths, optimalWidths,
                             //   currentBudgetInstanceId, gridDataStatus, showSpentMinus
}
```

| Slice | File | Key Responsibilities |
|-------|------|---------------------|
| `fileSlice` | `src/store/slices/fileSlice.ts` | File open/close state, file path, DB info |
| `categorySlice` | `src/store/slices/categorySlice.ts` | Global categories CRUD, loading state |
| `templateSlice` | `src/store/slices/templateSlice.ts` | Templates + template categories, loading state |
| `budgetSlice` | `src/store/slices/budgetSlice.ts` | Grid data, cell selection, column widths, period navigation |

Typed hooks in `src/store/hooks.ts`: `useAppDispatch`, `useAppSelector`.

### Services

All services wrap Tauri `invoke()` calls and live in `src/services/`:

| Service | File | Commands Wrapped |
|---------|------|-----------------|
| `fileService` | `fileService.ts` | `create_encrypted_db`, `open_encrypted_db`, `close_db`, `save_db`, `get_db_info`, `diagnose_db_file` |
| `periodService` | `periodService.ts` | `create_period_from_template`, `list_periods`, `get_period`, `delete_period`, `get_grid_data` |
| `categoryService` | `categoryService.ts` | `create_global_category`, `list_global_categories`, `delete_global_category` |
| `templateService` | `templateService.ts` | Template + template category CRUD commands |
| `lineItemService` | `lineItemService.ts` | `list_line_items`, `create_line_item`, `update_line_item`, `delete_line_item` |
| `attachmentService` | `attachmentService.ts` | `add_attachment`, `list_attachments`, `get_attachment_counts`, `delete_attachment`, `export_attachment`, `get_attachment_data` |
| `settingsService` | `settingsService.ts` | `get_ui_setting`, `set_ui_setting` |
| `exportService` | `exportService.ts` | `export_to_csv`, `export_csv_to_file` |

### Types (`src/types/`)

| File | Types Defined |
|------|--------------|
| `period.types.ts` | `Period`, `GridCategoryRow`, `GetGridDataResult` |
| `category.types.ts` | `GlobalCategory` |
| `template.types.ts` | `Template`, `TemplateCategory` |
| `lineItem.types.ts` | `LineItem`, `CreateLineItemArgs`, `UpdateLineItemArgs` |
| `attachment.types.ts` | `Attachment`, `AttachmentSummary`, `AttachmentCounts` |

### Hooks (`src/hooks/`)

| Hook | Purpose |
|------|---------|
| `useAttachmentUpload` | File picker integration, 25 MB size warning, attachment upload flow |

### Utilities (`src/utils/`)

| File | Purpose |
|------|---------|
| `currency.ts` | Locale-aware `formatCurrency` via `Intl.NumberFormat` |
| `dateFormat.ts` | Locale-aware `formatDate`/`formatTime` via `Intl.DateTimeFormat` |
| `formatErrorMessage.ts` | User-friendly error message formatting |
| `formatFileSize.ts` | Human-readable file size (e.g., "2.5 MB") |
| `passwordStrength.ts` | Password strength calculation via `zxcvbn` |
| `passwordValidation.ts` | Password validation rules (min length, match) |

### Internationalization (`src/i18n/`)

- `react-i18next` + `i18next` for translations
- 3 languages: English (`en.json`), German (`de.json`), Hungarian (`hu.json`)
- ~300+ translation keys per language
- Language stored in `localStorage` (not in the finance file)
- Currency and date formatting use `Intl` APIs with the selected locale

### Styling

- **Tailwind CSS v4** via `@tailwindcss/vite` plugin
- All styling via utility classes — no CSS files (except `src/index.css` for Tailwind import)
- No Headless UI, no AG Grid, no component library
- Custom accessible components throughout

---

## Backend Architecture

### Rust Module Structure (`src-tauri/src/`)

| Module | Lines | Purpose |
|--------|-------|---------|
| `lib.rs` | ~82 | App initialization, plugin registration, 38 command registration, exit handler |
| `encrypted_db.rs` | ~5,850 | All Tauri commands: DB lifecycle, CRUD for all entities, export, settings |
| `kdf.rs` | ~231 | Argon2id key derivation (64 MB, 3 iter, 4 threads, 32-byte output) |
| `file_header.rs` | ~312 | EFM1 file format: magic bytes, version, salt, KDF params, password hint |
| `migrations.rs` | ~1,445 | Schema migrations v1-v5, migration runner, 9 database tables |
| `main.rs` | ~6 | Entry point; calls `run()`, sets Windows subsystem attribute |

### App Initialization (`lib.rs`)

```
tauri::Builder::default()
  -> plugin: tauri_plugin_opener
  -> plugin: tauri_plugin_dialog
  -> manage: DbState::new()
  -> invoke_handler: 38 commands from encrypted_db module
  -> run event handler: save_if_open() on Exit (BUG-004 fix)
```

### DbState

```rust
// encrypted_db.rs
pub struct DbState {
    inner: Mutex<Option<OpenFileState>>,
}

struct OpenFileState {
    conn: Connection,         // rusqlite connection to temp SQLite file
    file_info: OpenFileInfo,  // original path, header, temp path
}
```

The app extracts the encrypted SQLite data from the `.financedb` file into a temp file, opens it with SQLCipher, and writes it back on save/close/exit.

### Command Groups (38 total)

| Group | Commands | Count |
|-------|----------|-------|
| DB Lifecycle | `create_encrypted_db`, `open_encrypted_db`, `get_db_info`, `close_db`, `save_db`, `diagnose_db_file` | 6 |
| Categories | `create_global_category`, `list_global_categories`, `delete_global_category` | 3 |
| Templates | `create_template`, `list_templates`, `get_template`, `update_template`, `delete_template` | 5 |
| Template Categories | `get_template_categories`, `add_category_to_template`, `remove_category_from_template`, `update_template_category_amount`, `reorder_template_categories` | 5 |
| Periods | `create_period_from_template`, `list_periods`, `get_period`, `delete_period` | 4 |
| Line Items | `list_line_items`, `create_line_item`, `update_line_item`, `delete_line_item` | 4 |
| Attachments | `add_attachment`, `list_attachments`, `get_attachment_counts`, `get_attachment_summaries`, `delete_attachment`, `export_attachment`, `get_attachment_data` | 7 |
| UI Settings | `get_ui_setting`, `set_ui_setting` | 2 |
| Export | `export_to_csv`, `export_csv_to_file` | 2 |
| Utilities | `get_grid_data`, `get_file_sizes` | 2 |

### Error Handling Pattern

All commands return `Result<T, String>`. Errors are converted to strings for the frontend via `.map_err(|e| e.to_string())`. Internal errors use `EncryptedDbError` enum with `thiserror`.

### Command Invocation Pattern

```
Frontend: invoke('command_name', { arg1, arg2 })
  -> Tauri IPC bridge
    -> #[tauri::command] fn command_name(state: State<DbState>, arg1, arg2) -> Result<T, String>
      -> state.inner.lock() -> get Connection
        -> SQL operations via rusqlite prepared statements
          -> Return Result<T, String> to frontend
```

---

## Database Architecture

### Encryption

- **SQLCipher** via `rusqlite` with `bundled-sqlcipher` feature
- **Argon2id** key derivation (64 MB memory, 3 iterations, 4 threads, 32-byte output key)
- Raw hex key bypass: `PRAGMA key = "x'hex'"` (skips SQLCipher's internal PBKDF2)
- See `ENCRYPTION_SPEC.md` for full details

### File Format

Each `.financedb` file has:
1. **Plaintext header** (EFM1 magic, version, salt, KDF params, optional password hint)
2. **Encrypted SQLite database** (SQLCipher AES-256)

See `ENCRYPTION_SPEC.md` for binary layout details.

### Schema (Migration v5 — 9 tables)

| Table | Purpose | Migration |
|-------|---------|-----------|
| `_meta` | Schema version tracking | v1 |
| `global_categories` | Unique budget categories per file | v1 |
| `templates` | Template definitions (name, cadence, currency) | v1 |
| `template_categories` | Template-to-category mappings with default amounts | v1 |
| `period_budget_instances` | Concrete budget periods (start/end dates, template ref) | v1 |
| `budget_instance_categories` | Categories within a period instance | v2 |
| `category_line_items` | Received/spent transactions with timestamps | v3 |
| `ui_settings` | Key-value store for user preferences | v4 |
| `line_item_attachments` | File attachments (BLOB storage, soft-delete) | v5 |

See `DATA_MODEL.md` for full column definitions and `DOMAIN_MODEL.md` for entity relationships.

### Attachment Storage

Attachments are stored as BLOBs directly in the SQLCipher-encrypted database:
- Full file data in `file_data` column (no size limit enforced; 25 MB soft warning in UI)
- Auto-generated thumbnails for images (Rust `image` crate) in `thumbnail` column
- MIME type detection via `infer` crate
- Soft-delete mechanism (`deleted_at` timestamp)
- Two indexes: `idx_attachments_line_item`, `idx_attachments_deleted`

---

## Data Flows

### Period Creation Flow

```
TemplatesPage: user selects template + date range
  -> periodService.createPeriodFromTemplate(templateId, name, startDate, endDate)
    -> invoke('create_period_from_template', { ... })
      -> Rust: INSERT into period_budget_instances
      -> Rust: Copy template_categories -> budget_instance_categories
      -> Rust: Auto-create first received line item per category (template default amount)
  -> Redux: fetchPeriods() to refresh period list
  -> Navigate to new period in PeriodGrid
```

### Grid Data Loading Flow

```
HomePage: user selects a period
  -> dispatch(setCurrentBudgetInstanceId(id))
  -> dispatch(fetchGridData(id))
    -> invoke('get_grid_data', { budget_instance_id })
      -> Rust: SQL query with rollup aggregations (received_total, spent_total, remaining)
  -> Redux: budgetSlice.gridData updated
  -> PeriodGridTable renders rows from gridData
```

### Transaction Entry Flow

```
User double-clicks "Spent Amount" cell on "Food" row (or presses Enter)
  -> CategoryLedgerModal opens with (budgetInstanceCategoryId, kind="spent")
  -> Modal loads line items: invoke('list_line_items', { ... })
  -> User adds transaction: invoke('create_line_item', { ... })
  -> Modal refreshes line item list
  -> On modal close: dispatch(fetchGridData(currentBudgetInstanceId))
  -> Grid re-renders with updated rollup totals
```

### Attachment Upload Flow

```
User clicks attachment indicator in CategoryLedgerModal
  -> AttachmentPopover opens, shows existing attachments
  -> User clicks "Add" -> file picker (via useAttachmentUpload hook)
  -> If file > 25 MB: FileSizeWarningDialog shown
  -> invoke('add_attachment', { line_item_id, file_name, file_data_base64 })
    -> Rust: detect MIME type (infer), generate thumbnail if image, INSERT BLOB
  -> AttachmentPopover refreshes
  -> User can click thumbnail to open AttachmentLightbox (full-screen view)
```

---

## Security Architecture

### Encryption (Implemented)

| Aspect | Implementation |
|--------|---------------|
| Database encryption | SQLCipher (AES-256) via `rusqlite` `bundled-sqlcipher` feature |
| Key derivation | Argon2id (64 MB memory, 3 iterations, 4 threads) |
| Salt | 32 bytes from OS CSPRNG, stored in file header |
| Key format | Raw hex key (`PRAGMA key = "x'hex'"`) bypasses SQLCipher PBKDF2 |
| Password hint | Optional, plaintext in file header (max 255 bytes) |
| File format | Custom header (EFM1 magic) + encrypted SQLite data |

### Security Practices

- Passwords never logged or stored (only used for key derivation)
- Encryption key held in memory only during active session
- All SQL uses parameterized queries (no injection risk)
- Finance data never exposed in logs
- `PRAGMA foreign_keys = ON` for referential integrity
- Auto-save on app exit (prevents data loss — BUG-004 fix)

See `ENCRYPTION_SPEC.md` for full threat model and implementation details.

---

## Testing

### Automated Tests (224+ total)

| Category | Framework | Count | Location |
|----------|-----------|-------|----------|
| Frontend utilities | Vitest + jsdom | ~57 | `src/utils/__tests__/` |
| Frontend components | Vitest + React Testing Library | ~18 | `src/components/**/__tests__/` |
| Frontend services | Vitest | ~14 | `src/services/__tests__/` |
| Frontend hooks | Vitest | ~9 | `src/hooks/__tests__/` |
| Rust backend | `#[cfg(test)]` inline modules | ~63 | `src-tauri/src/*.rs` |

**Test infrastructure:**
- `src/test/setup.ts` — Vitest setup with jsdom
- `src/test/renderWithProviders.tsx` — Test utility wrapping components with Redux `Provider`
- Run: `npm run test` (once) or `npm run test:watch` (watch mode)

### Manual Test Plan

See `TEST_PLAN.md` for comprehensive manual test plan covering all 10 MVP feature areas.

---

## Performance

### Current Patterns
- Single `Mutex<Option<Connection>>` for database access (single-user desktop app)
- Grid data cached in Redux `budgetSlice`; refetched only on period change or transaction save
- Line items loaded lazily (on modal open, not on grid load)
- Column widths persisted to `ui_settings` table via `settingsService`
- No virtualization needed for MVP (grids have ~10–50 rows)
- `React.memo` on `PeriodGridRow` for efficient re-renders

### Measured Targets
- Grid load: < 100ms target, < 500ms acceptable
- KDF (Argon2id): < 1 second on modern hardware
- Smooth scrolling with up to 50 category rows

---

## Build Pipeline

### Frontend (Vite)
```
npm run build -> tsc && vite build -> dist/
```
- TypeScript compiled, Vite bundles React app
- Tailwind CSS processed via `@tailwindcss/vite` plugin

### Backend (Cargo)
```
cargo build (via Tauri CLI)
```
- Rust compiled with `bundled-sqlcipher` (first build: +5–15 min for SQLCipher compilation)
- Links with Tauri runtime + plugins

### Desktop Bundle
```
npm run tauri build -> Windows MSI installer
```
- Frontend `dist/` embedded in Tauri binary
- Target: Windows 11 (MVP); macOS/Linux deferred to post-MVP

### Dev Server
```
npm run tauri dev -> Vite dev server (port 1420) + Rust backend
```

---

## Dependencies

### Frontend (`package.json`)

| Package | Version | Purpose |
|---------|---------|---------|
| `react` / `react-dom` | ^18.3.1 | UI framework |
| `@reduxjs/toolkit` / `react-redux` | ^2.11.2 / ^9.2.0 | State management |
| `react-router-dom` | ^7.13.0 | Client-side routing (MemoryRouter) |
| `tailwindcss` / `@tailwindcss/vite` | ^4.1.18 | Utility-first CSS |
| `@tauri-apps/api` | ^2 | Tauri IPC bridge |
| `@tauri-apps/plugin-dialog` | ^2.6.0 | Native file dialogs |
| `@tauri-apps/plugin-opener` | ^2 | File/URL opener |
| `i18next` / `react-i18next` | ^25.8.6 / ^16.5.4 | Internationalization |
| `@hello-pangea/dnd` | ^18.0.1 | Drag-and-drop (template category reorder) |
| `yet-another-react-lightbox` | ^3.29.1 | Attachment lightbox viewer |
| `zxcvbn` | ^4.4.2 | Password strength estimation |

### Backend (`src-tauri/Cargo.toml`)

| Crate | Version | Purpose |
|-------|---------|---------|
| `tauri` | ^2 | Desktop framework |
| `tauri-plugin-dialog` | ^2.6.0 | Native file dialogs |
| `tauri-plugin-opener` | ^2 | File/URL opener |
| `rusqlite` | ^0.35 (`bundled-sqlcipher`) | SQLite + SQLCipher encryption |
| `argon2` | ^0.5 | Argon2id key derivation |
| `rand` | ^0.8 | Cryptographic random (salt generation) |
| `hex` | ^0.4 | Hex encoding for raw keys |
| `serde` / `serde_json` | ^1 | Serialization |
| `tempfile` | ^3 | Temporary file handling for DB extraction |
| `thiserror` | ^1 | Error type definitions |
| `image` | ^0.25 | Thumbnail generation for image attachments |
| `infer` | ^0.16 | MIME type detection |
| `base64` | ^0.22 | Base64 encoding for attachment data transfer |

### Dev Dependencies

| Package | Purpose |
|---------|---------|
| `vitest` ^4.0.18 | Test runner |
| `@testing-library/react` ^16.3.2 | Component testing |
| `@testing-library/jest-dom` ^6.9.1 | DOM matchers |
| `@testing-library/user-event` ^14.6.1 | User interaction simulation |
| `typescript` ~5.6.2 | Type checking |
| `vite` ^6.0.3 | Build tool |
| `@tauri-apps/cli` ^2 | Tauri CLI |

---

## Licensing Architecture (DEFERRED)

Full licensing implementation is **deferred** for MVP. Only data-access safeguards are implemented.

### Implemented Safeguards

| Safeguard | GitHub Issue | Status |
|-----------|-------------|--------|
| SAFEGUARD-2: Export Always Available | #62 | CLOSED — implemented |
| SAFEGUARD-3: DB Open/Unlock Never Blocked | #63 | CLOSED — implemented |

### Deferred (Out-of-Scope for MVP)

| Item | GitHub Issue | Status |
|------|-------------|--------|
| App Mode Plumbing (Full vs Read-Only) | #61 | OPEN — `out-of-scope` |
| License file import | — | Depends on #61 |
| Feature gating by build date | — | Depends on #61 |

See `LICENSING.md` for the authoritative licensing spec and `LICENSING_MVP_IMPACTS.md` for the MVP scope breakdown.

---

## References

- `REPO_MAP.md` — Complete file tree with descriptions
- `DATA_MODEL.md` — Database schema details and SQL patterns
- `DOMAIN_MODEL.md` — Entity relationships (implemented)
- `ENCRYPTION_SPEC.md` — Encryption implementation details
- `GRID_ARCHITECTURE.md` — Grid component hierarchy and types
- `COLUMN_RESIZE_SPEC.md` — Column resize behavior
- `UI_FLOWS.md` — User journeys and screen flows
- `UX_INTERACTIONS.md` — Interaction patterns and keyboard shortcuts
- `MVP_PLAN.md` — Phase-by-phase implementation history
- `LICENSING.md` — Licensing specification
- `LICENSING_MVP_IMPACTS.md` — Licensing MVP scope breakdown
- `TEST_PLAN.md` — Manual test plan
- `BUILD_AND_RUN.md` — Build instructions
