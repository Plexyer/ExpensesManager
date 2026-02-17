# Repository Map

> **Status**: IMPLEMENTED  
> **Last Updated**: 2026-02-15  
> **Scope**: Complete source file inventory for ExpensesManager (local-first encrypted budgeting app)

---

## Complete File Tree

```
ExpensesManager/
├── .gitignore
├── index.html                              # HTML entry point
├── LICENSE
├── package.json                            # Frontend dependencies & scripts
├── package-lock.json
├── README.md
├── tsconfig.json                           # TypeScript config (strict mode)
├── tsconfig.node.json                      # TypeScript config for Node tooling
├── vite.config.ts                          # Vite + Tailwind CSS v4 + Vitest config
│
├── public/                                 # Static assets
│   ├── tauri.svg
│   └── vite.svg
│
├── prompts/                                # AI agent prompt templates
│   ├── implement-selected-bugfix.md
│   ├── implement-selected-task.md
│   ├── other-prompts.md
│   ├── plan-bugs-next.md
│   ├── plan-mvp-next.md
│   └── resetprompt.md
│
├── src/                                    # Frontend (React 18 + TypeScript)
│   ├── App.tsx                             # Root component — React Router route definitions
│   ├── main.tsx                            # Entry point — StrictMode, ErrorBoundary, Redux Provider, MemoryRouter
│   ├── index.css                           # Tailwind CSS v4 imports
│   ├── vite-env.d.ts                       # Vite type declarations
│   │
│   ├── assets/
│   │   └── react.svg
│   │
│   ├── components/
│   │   ├── common/
│   │   │   ├── AppHeader.tsx               # Top navigation bar with route links
│   │   │   ├── ErrorBoundary.tsx           # React error boundary wrapper
│   │   │   ├── FileSizeWarningDialog.tsx   # Large file upload confirmation dialog (25 MB soft limit)
│   │   │   ├── PasswordInput.tsx           # Password field with show/hide toggle
│   │   │   └── __tests__/
│   │   │       ├── ErrorBoundary.test.tsx
│   │   │       ├── FileSizeWarningDialog.test.tsx
│   │   │       └── PasswordInput.test.tsx
│   │   │
│   │   └── features/
│   │       ├── BudgetGrid/
│   │       │   ├── AttachmentIndicator.tsx      # Paperclip icon with attachment count badge
│   │       │   ├── AttachmentLightbox.tsx       # Full-screen image viewer (yet-another-react-lightbox)
│   │       │   ├── AttachmentPopover.tsx        # Attachment list popover — upload, delete, export
│   │       │   ├── CategoryLedgerModal.tsx      # Line item entry modal (received/spent transactions)
│   │       │   ├── CreatePeriodModal.tsx        # Period creation from template
│   │       │   ├── PeriodCard.tsx               # Period summary card in list view
│   │       │   ├── PeriodDetailToolbar.tsx      # Toolbar above grid — back, title, actions
│   │       │   ├── PeriodGrid.tsx               # Main grid container orchestrator
│   │       │   ├── PeriodGridBody.tsx           # Grid body — scrollable rows area
│   │       │   ├── PeriodGridCell.tsx           # Individual cell renderer with inline edit mode
│   │       │   ├── PeriodGridEmpty.tsx          # Empty state when no categories exist
│   │       │   ├── PeriodGridHeader.tsx         # Column headers with paired resize handles
│   │       │   ├── PeriodGridRow.tsx            # Single row — frozen + scrollable cells
│   │       │   ├── PeriodGridSkeleton.tsx       # Loading skeleton placeholder
│   │       │   ├── PeriodGridTable.tsx          # Table layout wrapper
│   │       │   ├── PeriodList.tsx               # List of period cards for a template
│   │       │   ├── PeriodListRow.tsx            # Row in period list
│   │       │   ├── types.ts                     # Grid types: GridColumnConfig, constants (MIN_COLUMN_WIDTH, etc.)
│   │       │   └── __tests__/
│   │       │       └── AttachmentIndicator.test.tsx
│   │       │
│   │       ├── Onboarding/
│   │       │   ├── Onboarding.tsx               # Create/Open finance file UI
│   │       │   ├── PasswordCreationModal.tsx    # New file password setup with strength meter (zxcvbn)
│   │       │   └── PasswordUnlockModal.tsx      # Existing file password entry
│   │       │
│   │       ├── Settings/
│   │       │   ├── BackupSettings.tsx           # Backup guidance and instructions
│   │       │   ├── ExportSettings.tsx           # CSV export controls
│   │       │   ├── LanguageSettings.tsx         # Language selector (en / de / hu)
│   │       │   ├── PeriodTableSettings.tsx      # Grid display preferences
│   │       │   └── __tests__/
│   │       │       └── LanguageSettings.test.tsx
│   │       │
│   │       └── Templates/
│   │           ├── TemplateCategoryItem.tsx      # Draggable category row in template
│   │           ├── TemplateCategoryList.tsx      # Drag-and-drop list of template categories (@hello-pangea/dnd)
│   │           └── __tests__/
│   │               └── TemplateCategoryList.test.tsx
│   │
│   ├── hooks/
│   │   ├── useAttachmentUpload.ts          # Attachment upload logic with file size validation
│   │   └── __tests__/
│   │       └── useAttachmentUpload.test.ts
│   │
│   ├── i18n/
│   │   ├── index.ts                        # i18next initialization and configuration
│   │   ├── en.json                         # English translations
│   │   ├── de.json                         # German translations
│   │   └── hu.json                         # Hungarian translations
│   │
│   ├── pages/
│   │   ├── DashboardPage.tsx               # Landing page — AppHeader + Onboarding/file-open
│   │   ├── HomePage.tsx                    # Period grid view — template selection + PeriodGrid
│   │   ├── SettingsPage.tsx                # Settings page with tabbed sections
│   │   └── TemplatesPage.tsx               # Template CRUD management
│   │
│   ├── services/
│   │   ├── attachmentService.ts            # Tauri invoke wrappers for attachment commands
│   │   ├── categoryService.ts              # Tauri invoke wrappers for category commands
│   │   ├── exportService.ts                # Tauri invoke wrappers for CSV export commands
│   │   ├── fileService.ts                  # Tauri invoke wrappers for file/DB lifecycle commands
│   │   ├── lineItemService.ts              # Tauri invoke wrappers for line item commands
│   │   ├── periodService.ts                # Tauri invoke wrappers for period commands
│   │   ├── settingsService.ts              # Tauri invoke wrappers for UI settings commands
│   │   ├── templateService.ts              # Tauri invoke wrappers for template commands
│   │   └── __tests__/
│   │       └── attachmentService.test.ts
│   │
│   ├── store/
│   │   ├── hooks.ts                        # Typed useAppDispatch / useAppSelector
│   │   ├── store.ts                        # Redux store configuration (4 combined slices)
│   │   └── slices/
│   │       ├── budgetSlice.ts              # Period grid state, selectedCell, grid data, thunks
│   │       ├── categorySlice.ts            # Global categories list + CRUD async thunks
│   │       ├── fileSlice.ts                # File open/close state, DB info, file path
│   │       └── templateSlice.ts            # Templates list + CRUD async thunks
│   │
│   ├── test/
│   │   ├── renderWithProviders.tsx         # Test helper — wraps components in Redux Provider + MemoryRouter
│   │   └── setup.ts                        # Vitest setup — jsdom + @testing-library/jest-dom matchers
│   │
│   ├── types/
│   │   ├── attachment.types.ts             # Attachment, AttachmentSummary interfaces
│   │   ├── category.types.ts               # GlobalCategory interface
│   │   ├── lineItem.types.ts               # LineItem interface
│   │   ├── period.types.ts                 # PeriodBudgetInstance, GridData interfaces
│   │   └── template.types.ts               # Template, TemplateCategory interfaces
│   │
│   └── utils/
│       ├── currency.ts                     # Locale-aware currency formatting
│       ├── dateFormat.ts                   # Date formatting utilities
│       ├── formatErrorMessage.ts           # Tauri error message extraction
│       ├── formatFileSize.ts               # Human-readable file size (bytes → KB/MB)
│       ├── passwordStrength.ts             # Password strength meter (zxcvbn wrapper)
│       ├── passwordValidation.ts           # Password validation rules
│       └── __tests__/
│           ├── currency.test.ts
│           ├── dateFormat.test.ts
│           ├── formatErrorMessage.test.ts
│           ├── formatFileSize.test.ts
│           ├── passwordStrength.test.ts
│           └── passwordValidation.test.ts
│
└── src-tauri/                              # Backend (Rust + Tauri 2)
    ├── .gitignore
    ├── build.rs                            # Tauri build script
    ├── Cargo.toml                          # Rust dependencies (rusqlite + bundled-sqlcipher, argon2, etc.)
    ├── Cargo.lock
    ├── tauri.conf.json                     # Tauri app config (window, bundle, build)
    ├── capabilities/
    │   └── default.json                    # Tauri permission capabilities (dialog, opener)
    ├── gen/                                # Auto-generated Tauri bindings
    ├── icons/                              # App icons for platform builds
    └── src/
        ├── main.rs                         # Binary entry point → calls lib::run()
        ├── lib.rs                          # Tauri app setup, plugin registration, 38 commands
        ├── encrypted_db.rs                 # All 38 Tauri commands + DbState struct (~5800 lines)
        ├── kdf.rs                          # Argon2id key derivation (~230 lines)
        ├── file_header.rs                  # EFM1 file header read/write (~310 lines)
        └── migrations.rs                   # Schema migrations v1–v5 (~1440 lines)
```

---

## Routing

Routes defined in `src/App.tsx` via React Router DOM (`MemoryRouter`):

| Path | Page Component | Purpose |
|------|---------------|---------|
| `/` | `DashboardPage` | Landing page with file create/open (Onboarding) |
| `/periods` | `HomePage` | Period grid view — select template, view/manage periods |
| `/templates` | `TemplatesPage` | Template CRUD — create, edit, delete templates |
| `/settings` | `SettingsPage` | App settings — language, grid display, export, backup |

---

## Frontend Structure (`src/`)

### Entry Points

| File | Purpose |
|------|---------|
| `main.tsx` | Renders React app with `StrictMode` → `ErrorBoundary` → Redux `Provider` → `MemoryRouter` → `App` |
| `App.tsx` | Defines 4 routes (see Routing section above) |
| `index.css` | Tailwind CSS v4 imports (`@import "tailwindcss"`) |

### Pages (4)

| Page | Description |
|------|------------|
| `DashboardPage.tsx` | File create/open flow via `Onboarding` component; includes `AppHeader` |
| `HomePage.tsx` | Main budget view — template selection, period list, `PeriodGrid` |
| `TemplatesPage.tsx` | Template management — CRUD operations, category assignment |
| `SettingsPage.tsx` | Tabbed settings — language, grid display, CSV export, backup guidance |

### Components — Common (4)

| Component | Description |
|-----------|------------|
| `AppHeader.tsx` | Top navigation bar with route links between pages |
| `ErrorBoundary.tsx` | React error boundary — catches render errors, shows fallback UI |
| `FileSizeWarningDialog.tsx` | Confirmation dialog for file uploads exceeding 25 MB soft limit |
| `PasswordInput.tsx` | Password input field with show/hide toggle button |

### Components — BudgetGrid (18 + types.ts)

The custom `PeriodGrid` component system (no external grid library):

| Component | Description |
|-----------|------------|
| `PeriodGrid.tsx` | Main grid orchestrator — data loading, keyboard navigation, column state |
| `PeriodGridTable.tsx` | Table layout wrapper with frozen/scrollable column areas |
| `PeriodGridHeader.tsx` | Column headers with paired resize handles and magnetic snap |
| `PeriodGridBody.tsx` | Scrollable body area containing rows |
| `PeriodGridRow.tsx` | Single row — renders frozen cells + scrollable cells |
| `PeriodGridCell.tsx` | Individual cell — display mode + inline edit mode |
| `PeriodGridEmpty.tsx` | Empty state shown when no categories exist |
| `PeriodGridSkeleton.tsx` | Loading skeleton while grid data is being fetched |
| `PeriodList.tsx` | List of period cards for the selected template |
| `PeriodListRow.tsx` | Individual row in the period list |
| `PeriodCard.tsx` | Period summary card (date range, total amounts) |
| `PeriodDetailToolbar.tsx` | Toolbar above grid — back button, period title, action buttons |
| `CreatePeriodModal.tsx` | Modal for creating a new period from a template |
| `CategoryLedgerModal.tsx` | Modal for adding/editing received and spent line items |
| `AttachmentIndicator.tsx` | Paperclip icon with attachment count badge |
| `AttachmentPopover.tsx` | Popover listing attachments — upload, delete, export actions |
| `AttachmentLightbox.tsx` | Full-screen image viewer using `yet-another-react-lightbox` |
| `types.ts` | Grid type definitions: `GridColumnConfig`, `MIN_COLUMN_WIDTH`, `LAST_FROZEN_COL_INDEX`, etc. |

### Components — Onboarding (3)

| Component | Description |
|-----------|------------|
| `Onboarding.tsx` | Create new / open existing finance file UI |
| `PasswordCreationModal.tsx` | New file password setup with `zxcvbn` strength meter |
| `PasswordUnlockModal.tsx` | Existing file password entry and unlock |

### Components — Settings (4)

| Component | Description |
|-----------|------------|
| `LanguageSettings.tsx` | Language selector dropdown (English, German, Hungarian) |
| `PeriodTableSettings.tsx` | Grid display preferences (persisted via `settingsService`) |
| `ExportSettings.tsx` | CSV export controls |
| `BackupSettings.tsx` | Backup guidance and instructions |

### Components — Templates (2)

| Component | Description |
|-----------|------------|
| `TemplateCategoryList.tsx` | Drag-and-drop category list using `@hello-pangea/dnd` |
| `TemplateCategoryItem.tsx` | Individual draggable category row in a template |

### Services (8)

Each service wraps Tauri `invoke()` calls for a specific command group:

| Service | Commands Wrapped |
|---------|-----------------|
| `fileService.ts` | `create_encrypted_db`, `open_encrypted_db`, `get_db_info`, `close_db`, `save_db`, `diagnose_db_file`, `get_file_sizes` |
| `periodService.ts` | `create_period_from_template`, `list_periods`, `get_period`, `delete_period`, `get_grid_data` |
| `categoryService.ts` | `create_global_category`, `list_global_categories`, `delete_global_category` |
| `templateService.ts` | `create_template`, `list_templates`, `get_template`, `update_template`, `delete_template`, `get_template_categories`, `add_category_to_template`, `remove_category_from_template`, `update_template_category_amount`, `reorder_template_categories` |
| `lineItemService.ts` | `list_line_items`, `create_line_item`, `update_line_item`, `delete_line_item` |
| `attachmentService.ts` | `add_attachment`, `list_attachments`, `get_attachment_counts`, `get_attachment_summaries`, `delete_attachment`, `export_attachment`, `get_attachment_data` |
| `settingsService.ts` | `get_ui_setting`, `set_ui_setting` |
| `exportService.ts` | `export_to_csv`, `export_csv_to_file` |

### Store (Redux Toolkit — 4 slices)

Store configured in `store/store.ts` with typed hooks in `store/hooks.ts`:

| Slice | Key State | Purpose |
|-------|----------|---------|
| `fileSlice.ts` | `filePath`, `dbInfo`, `isOpen` | File lifecycle — open, close, DB metadata |
| `budgetSlice.ts` | `gridData`, `selectedCell`, `periods` | Period grid data, cell selection, loading states |
| `categorySlice.ts` | `categories`, `loading` | Global categories list + CRUD async thunks |
| `templateSlice.ts` | `templates`, `loading` | Templates list + CRUD async thunks |

### Types (5)

| File | Key Interfaces |
|------|---------------|
| `period.types.ts` | `PeriodBudgetInstance`, `GridData`, `GridRow` |
| `category.types.ts` | `GlobalCategory` |
| `template.types.ts` | `Template`, `TemplateCategory` |
| `lineItem.types.ts` | `LineItem` |
| `attachment.types.ts` | `Attachment`, `AttachmentSummary`, `AttachmentCounts` |

### Hooks (1)

| Hook | Purpose |
|------|---------|
| `useAttachmentUpload.ts` | Manages file selection, size validation (25 MB soft limit), and upload via `attachmentService` |

### Utils (6)

| Utility | Purpose |
|---------|---------|
| `currency.ts` | Locale-aware currency formatting (respects i18n locale) |
| `dateFormat.ts` | Date formatting utilities for display |
| `formatErrorMessage.ts` | Extracts user-friendly messages from Tauri invoke errors |
| `formatFileSize.ts` | Converts bytes to human-readable sizes (KB, MB, etc.) |
| `passwordStrength.ts` | Wraps `zxcvbn` library for password strength scoring |
| `passwordValidation.ts` | Password validation rules (minimum length, etc.) |

### Internationalization (i18n)

| File | Purpose |
|------|---------|
| `i18n/index.ts` | Initializes `i18next` + `react-i18next` with language detection from `localStorage` |
| `i18n/en.json` | English translations |
| `i18n/de.json` | German translations |
| `i18n/hu.json` | Hungarian translations |

### Test Infrastructure

| File | Purpose |
|------|---------|
| `test/setup.ts` | Vitest setup — configures `jsdom` environment and `@testing-library/jest-dom` matchers |
| `test/renderWithProviders.tsx` | Test helper — wraps components in Redux `Provider` + `MemoryRouter` with optional preloaded state |

---

## Backend Structure (`src-tauri/`)

### Rust Source Files (6)

| File | Lines | Purpose |
|------|-------|---------|
| `main.rs` | ~6 | Binary entry point — calls `expenses_manager_lib::run()` |
| `lib.rs` | ~81 | Tauri app builder — registers plugins (dialog, opener), manages `DbState`, registers 38 commands, handles graceful save on exit |
| `encrypted_db.rs` | ~5800 | All 38 Tauri commands organized in 10 groups: DB lifecycle, categories, templates, template categories, periods, line items, attachments, file metadata, UI settings, CSV export. Contains `DbState` struct with `Mutex<Option<Connection>>`. |
| `kdf.rs` | ~230 | Argon2id key derivation — 64 MB memory, 3 iterations, 4 threads, 32-byte output key. Includes salt generation. |
| `file_header.rs` | ~310 | `EFM1` file header format — reads/writes plaintext header (magic bytes, version, salt, KDF params, optional hint) prepended to encrypted SQLCipher database. |
| `migrations.rs` | ~1440 | Schema migrations v1 through v5. Uses `_meta` table for version tracking. Each migration runs in a transaction. Includes `#[cfg(test)]` inline test module. |

### Tauri Commands (38 total, registered in `lib.rs`)

| Group | Commands |
|-------|---------|
| DB Lifecycle (6) | `create_encrypted_db`, `open_encrypted_db`, `get_db_info`, `close_db`, `save_db`, `diagnose_db_file` |
| Grid Data (1) | `get_grid_data` |
| Categories (3) | `create_global_category`, `list_global_categories`, `delete_global_category` |
| Templates (5) | `create_template`, `list_templates`, `get_template`, `update_template`, `delete_template` |
| Template Categories (5) | `get_template_categories`, `add_category_to_template`, `remove_category_from_template`, `update_template_category_amount`, `reorder_template_categories` |
| Periods (4) | `create_period_from_template`, `list_periods`, `get_period`, `delete_period` |
| Line Items (4) | `list_line_items`, `create_line_item`, `update_line_item`, `delete_line_item` |
| Attachments (7) | `add_attachment`, `list_attachments`, `get_attachment_counts`, `get_attachment_summaries`, `delete_attachment`, `export_attachment`, `get_attachment_data` |
| File Metadata (1) | `get_file_sizes` |
| UI Settings (2) | `get_ui_setting`, `set_ui_setting` |
| Export (2) | `export_to_csv`, `export_csv_to_file` |

### Configuration

| File | Purpose |
|------|---------|
| `Cargo.toml` | Rust dependencies — `rusqlite` (bundled-sqlcipher), `argon2`, `rand`, `image`, `infer`, `serde`, `tauri`, etc. |
| `tauri.conf.json` | Tauri app configuration — window size/title, build paths, bundle settings |
| `capabilities/default.json` | Tauri v2 permission capabilities — dialog and opener access |
| `build.rs` | Tauri build script (auto-generated) |

---

## Test File Locations

All frontend tests use **Vitest** + **React Testing Library** + **jsdom**.

| Directory | Test Files |
|-----------|-----------|
| `src/components/common/__tests__/` | `ErrorBoundary.test.tsx`, `FileSizeWarningDialog.test.tsx`, `PasswordInput.test.tsx` |
| `src/components/features/BudgetGrid/__tests__/` | `AttachmentIndicator.test.tsx` |
| `src/components/features/Settings/__tests__/` | `LanguageSettings.test.tsx` |
| `src/components/features/Templates/__tests__/` | `TemplateCategoryList.test.tsx` |
| `src/hooks/__tests__/` | `useAttachmentUpload.test.ts` |
| `src/services/__tests__/` | `attachmentService.test.ts` |
| `src/utils/__tests__/` | `currency.test.ts`, `dateFormat.test.ts`, `formatErrorMessage.test.ts`, `formatFileSize.test.ts`, `passwordStrength.test.ts`, `passwordValidation.test.ts` |

Backend tests: inline `#[cfg(test)]` modules within Rust source files (primarily in `migrations.rs` and `kdf.rs`).

---

## Configuration Files

### Root Level

| File | Purpose |
|------|---------|
| `package.json` | NPM dependencies and scripts (`dev`, `build`, `test`, `test:watch`, `tauri`) |
| `vite.config.ts` | Vite configuration — React plugin, Tailwind CSS v4 plugin (`@tailwindcss/vite`), Vitest config, dev server port 1420 |
| `tsconfig.json` | TypeScript config — strict mode enabled |
| `tsconfig.node.json` | TypeScript config for Node tooling (Vite config) |
| `index.html` | HTML entry point — loads `src/main.tsx` |
| `.gitignore` | Git ignore rules |
| `LICENSE` | Project license file |
| `README.md` | Project readme |

**Note**: Tailwind CSS v4 uses the `@tailwindcss/vite` plugin in `vite.config.ts`. There are no separate `tailwind.config.js` or `postcss.config.js` files.

---

## File Naming Conventions

| Category | Convention | Example |
|----------|-----------|---------|
| React components | PascalCase `.tsx` | `PeriodGrid.tsx`, `AppHeader.tsx` |
| React pages | PascalCase + `Page` suffix | `DashboardPage.tsx`, `SettingsPage.tsx` |
| Services | camelCase + `Service` suffix | `fileService.ts`, `attachmentService.ts` |
| Redux slices | camelCase + `Slice` suffix | `budgetSlice.ts`, `fileSlice.ts` |
| Type files | camelCase + `.types.ts` | `period.types.ts`, `attachment.types.ts` |
| Hooks | camelCase + `use` prefix | `useAttachmentUpload.ts` |
| Utilities | camelCase | `currency.ts`, `formatFileSize.ts` |
| Test files | Mirror source name + `.test.ts(x)` | `currency.test.ts`, `ErrorBoundary.test.tsx` |
| Rust modules | snake_case `.rs` | `encrypted_db.rs`, `file_header.rs` |
| Tauri commands | snake_case | `create_encrypted_db`, `list_line_items` |
| i18n files | language code `.json` | `en.json`, `de.json`, `hu.json` |

---

## Build & Development

### Development
1. Run `npm run tauri dev`
2. Vite dev server starts on `http://localhost:1420`
3. Tauri window opens, loads frontend
4. Hot module replacement (HMR) enabled for frontend changes

### Production Build
1. Run `npm run tauri build`
2. Frontend builds via `tsc && vite build` to `dist/`
3. Rust compiles to binary with SQLCipher statically linked
4. Tauri bundles everything into platform installer

### Testing
- `npm test` — runs Vitest in single-run mode
- `npm run test:watch` — runs Vitest in watch mode

---

## Build Artifacts (gitignored)

| Directory | Contents |
|-----------|---------|
| `target/` | Rust compilation output |
| `node_modules/` | NPM dependencies |
| `dist/` | Frontend build output |
| `src-tauri/gen/` | Auto-generated Tauri bindings (partially gitignored) |

---

## References

- See **ARCHITECTURE_CURRENT.md** for detailed architecture documentation
- See **BUILD_AND_RUN.md** for build/run instructions
- See **DATA_MODEL.md** for database schema details
- See **ENCRYPTION_SPEC.md** for encryption implementation details
- See **GRID_ARCHITECTURE.md** for PeriodGrid component architecture
- See **DOMAIN_MODEL.md** for entity relationships
