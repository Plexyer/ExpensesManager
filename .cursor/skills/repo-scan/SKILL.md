---
name: repo-scan
description: Systematic repository scanning to map structure, entry points, and implementation state.
---

# Skill: Repository Scanning

## Purpose
How to systematically scan and map the repository to understand its structure, entry points, and current implementation.

## When to Use
- Starting work on a new feature
- Understanding existing codebase
- Finding where to make changes
- Documenting current state

## Process

### Step 1: Read Configuration Files
1. Read `package.json` — frontend dependencies and scripts
2. Read `src-tauri/Cargo.toml` — Rust dependencies
3. Read `tsconfig.json` — TypeScript config
4. Read `vite.config.ts` — build config (Tailwind v4 via `@tailwindcss/vite`, Vitest)
5. Read `src-tauri/tauri.conf.json` — Tauri config

### Step 2: Map Entry Points
1. Find React entry: `src/main.tsx` → `src/App.tsx`
2. Find Rust entry: `src-tauri/src/main.rs` → `src-tauri/src/lib.rs`
3. Find routing: Check `App.tsx` for routes (4 routes: `/`, `/periods`, `/templates`, `/settings`)
4. Find command handlers: Check `lib.rs` for `invoke_handler![]` (38 commands from `encrypted_db`)

### Step 3: Understand Structure
1. **Frontend**: Map `src/` structure
   - `src/components/common/` — shared UI components
   - `src/components/features/BudgetGrid/` — PeriodGrid, CategoryLedgerModal, Attachments
   - `src/components/features/Settings/` — settings components
   - `src/pages/` — DashboardPage, HomePage, TemplatesPage, SettingsPage
   - `src/store/slices/` — Redux slices (fileSlice, budgetSlice, categorySlice, templateSlice)
   - `src/services/` — Tauri invoke wrappers
   - `src/hooks/` — custom React hooks
   - `src/i18n/` — translations (en.json, de.json, hu.json)
2. **Backend**: Map `src-tauri/src/` structure (flat — NO `modules/` subdirectory)
   - `encrypted_db.rs` — all 38 Tauri commands + DbState helpers
   - `kdf.rs` — Argon2id key derivation
   - `file_header.rs` — EFM1 file header read/write
   - `migrations.rs` — schema v1–v5 (9 tables, 16 indexes)
   - `lib.rs` — DbState definition, plugin registration, command registration
   - `main.rs` — Tauri app entry point
3. **Database**: Schema defined in `src-tauri/src/migrations.rs` (single file, not a directory)
   - 9 tables: `_meta`, `global_categories`, `templates`, `template_categories`, `period_budget_instances`, `budget_instance_categories`, `category_line_items`, `line_item_attachments`, `ui_settings`
   - 16 indexes across migrations v1–v5

### Step 4: Trace Data Flow
1. Pick a user action (e.g., "create period from template")
2. Trace from UI → service (Tauri invoke) → command (`encrypted_db.rs`) → database (rusqlite)
3. Document the flow
4. Identify where changes would be needed

### Step 5: Document Findings
Use this format:
- **CONFIRMED**: Facts verified from code
- **INFERRED**: Assumptions based on code patterns
- **OPEN QUESTIONS**: Unknowns that need clarification

## Output Format

```markdown
## Repository Scan Results

### Entry Points (CONFIRMED)
- React: `src/main.tsx` → `src/App.tsx`
- Rust: `src-tauri/src/main.rs` → `src-tauri/src/lib.rs`
- Routes: `/` (Dashboard), `/periods` (Home), `/templates`, `/settings`

### Key Components (CONFIRMED)
- `PeriodGrid.tsx` — main budget grid (custom HTML table)
- `PeriodGridTable.tsx` — table body with category rows
- `PeriodGridCell.tsx` — individual cell rendering
- `CategoryLedgerModal.tsx` — transaction editing modal
- `AttachmentIndicator.tsx` — attachment icon in cells

### Tauri Commands (CONFIRMED — 38 total in encrypted_db.rs)
- `create_encrypted_db` — create new encrypted finance file
- `open_encrypted_db` — open existing file with password
- `get_grid_data` — load grid data for a period instance
- `create_period_from_template` — create period budget instance
- `list_line_items` — get transactions for a category
- `export_to_csv` — generate CSV export string
- (... see lib.rs invoke_handler for full list)

### Database Schema (CONFIRMED — v5, 9 tables)
- `period_budget_instances` — budget periods
- `budget_instance_categories` — categories within a period
- `category_line_items` — transactions (received/spent)
- `line_item_attachments` — attachment BLOBs
- `global_categories` — global category definitions
- `templates` — budget templates with cadence
- `template_categories` — template → category mappings
- `ui_settings` — key/value UI preferences
- `_meta` — schema version and metadata

### Open Questions
- (any unknowns discovered during scan)
```

## Tools to Use
- `Read` — read source files
- `Glob` — find files by pattern
- `Grep` — search for patterns (e.g., `pub fn`, `invoke(`)
- `SemanticSearch` — find code by meaning

## References
- See **REPO_MAP.md** for current repository map
- See **ARCHITECTURE_CURRENT.md** for architecture details
