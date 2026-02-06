# Project Overview

## Project Intent (CONFIRMED)

**ExpensesManager** is an Excel-like budgeting grid desktop application built with Tauri, React, and Rust.

### Core Concept
- **Main grid**: Represents exactly **one period budget instance** at a time (e.g., “January 2026” or “Biweekly period #3”)
- **Rows**: Global budget categories (unique per finance file/dataset)
- **Columns**: Informational fields for categories *within the current period* (MVP includes: category name, received date, received amount, spent amount)
- **Double-click**: Double-click **Received amount** or **Spent amount** to open a small modal/table of dated line items; totals roll up into the grid
- **Templates**: Define period cadence/length + a set of global categories with default budgeted amounts for that period; using a template creates a new period budget instance
- **Multi-dataset**: Each "finance" is a separate portable encrypted file (no internal profile system for MVP)
- **Import/Export**: MVP = basic CSV export + backup guidance. More (CSV import, PDF reports) = "Next"
- **Custom columns**: OUT OF SCOPE for MVP
- **Initial currencies**: CHF + EUR
- **Initial languages**: English + German (architecture allows adding more later)

---

## Tech Stack (CONFIRMED)

### Frontend
- **React 18** with TypeScript
- **Tailwind CSS 4.1.11** for styling
- **Redux Toolkit** for state management
- **React Router DOM** for routing
- **AG Grid Community** (v32.3.3) - currently used in some components
- **Vite** as build tool
- **Lucide React** for icons

### Backend
- **Tauri 2** desktop framework
- **Rust** (edition 2021)
- **rusqlite 0.31** with SQLCipher feature flag for encrypted SQLite database (CONFIRMED)
- **serde + serde_json** for serialization
- **argon2** for password hashing (Argon2id) - CONFIRMED (replacing SHA256)

### Storage
- **SQLite** database with SQLCipher encryption (CONFIRMED)
- **Location**: User-selected portable file location (file picker)
- **Encryption**: SQLCipher via rusqlite feature flag (CONFIRMED)
- **Target Platform**: Windows 11 only for MVP (CONFIRMED - MacOS/Linux post-MVP)

---

## Current State (CONFIRMED from repo scan)

### ✅ What Exists

#### Database Schema
- `MonthlyBudgets` - Budgets with month/year, income, finished_at, name
- `budget_categories` - Categories linked to budgets with allocated amounts
- `budget_templates` - Template definitions
- `template_categories` - Template → global category mappings with amounts
- `global_categories` - Reusable category definitions
- `expenses` - Transaction entries (expense/income/adjustment) with entry_type, date, amount, description, place, notes
- `BudgetChangeHistory` - Audit trail for budget modifications
- Migrations system exists (`src-tauri/migrations/`)

#### Frontend Components
- `BudgetGrid.tsx` - Main budget list/detail view
- `CategoryGrid.tsx` - Category grid with stats (uses AG Grid)
- `CategoryLedgerModal.tsx` - Transaction entry modal
- `TemplatesPage.tsx` - Template management UI
- `CreateBudgetForm.tsx` - Budget creation form
- `Dashboard.tsx` - Dashboard view
- `Settings.tsx` - Settings page (timezone support exists)

#### Backend Commands (Tauri)
- Budget CRUD: `create_monthly_budget`, `list_monthly_budgets`, `get_monthly_budget`, `delete_monthly_budget`, `finish_monthly_budget`, `unfinish_monthly_budget`, `update_budget_title`
- Categories: `get_budget_categories_with_stats`, `add_budget_category`, `set_category_allocated_amount`
- Templates: `get_budget_templates`, `create_budget_template`, `update_budget_template`, `delete_budget_template`, `apply_template_to_budget`
- Expenses: `add_category_entry`, `update_category_entry`, `soft_delete_category_entry`, `get_category_ledger`
- Security: `verify_master_password` (SHA256 hashing exists, but no encryption yet)
- Database: `init_database`, `run_migration`

#### State Management
- Redux store with slices: `authSlice`, `budgetSlice`, `expenseSlice`
- Timezone context (`TimezoneContext.tsx`) for timezone-aware date display

#### Build & Run
- `npm run tauri dev` - Development mode
- `npm run tauri build` - Production build
- Database auto-initializes on first run

---

## MVP Requirements (from reset prompt)

### 1. Create/Open Encrypted Finance File
**Status**: ❌ NOT IMPLEMENTED
- Current: Single database in app_data_dir
- Needed: File picker to create/open portable encrypted SQLite files
- Needed: Master password creation/unlock flow
- Needed: SQLCipher integration or app-level encryption

### 2. Create Templates (Global Categories + Default Amounts + Cadence)
**Status**: 🟡 PARTIALLY IMPLEMENTED
- ✅ Template system exists (`budget_templates`, `template_categories`)
- ✅ Global categories exist
- ❌ Template cadence/period length is not modeled explicitly in current schema (GAP vs corrected design)

### 3. Create Period from Template
**Status**: 🟡 PARTIALLY IMPLEMENTED
- ✅ `apply_template_to_budget` command exists
- ❌ No period-based system (currently month/year)
- ❌ No cadence selection (monthly/biweekly/weekly/daily/yearly/custom)
- ❌ No period creation UI flow

### 4. Log Transactions via Double-Click Modal
**Status**: 🟡 PARTIALLY IMPLEMENTED
- ✅ `CategoryLedgerModal` exists for transaction entry
- ❌ Not triggered by double-click on **Received amount**/**Spent amount** cells
- ❌ No single-period category grid view (one period budget instance per grid)

### 5. Rollups in Main Grid (Spent/Remaining Totals)
**Status**: ❌ NOT IMPLEMENTED
- ✅ Category stats exist (`get_budget_categories_with_stats`)
- ❌ No period-based rollups
- ❌ No single-period category grid view
- ❌ No per-category received date tracking for a period budget instance

### 6. Basic Export (CSV) + Backup Guidance
**Status**: ❌ NOT IMPLEMENTED
- ❌ No CSV export functionality
- ❌ No backup guidance UI

---

## Key Gaps: Current vs. MVP

| Feature | Current | MVP Needed |
|---------|---------|------------|
| **Data Model** | Month/year budgets | Period-based with cadence |
| **UI Pattern** | Category list/grid | Single-period category grid (rows = global categories; columns = fields/rollups) |
| **File System** | Single app_data_dir DB | Portable encrypted files (multi-dataset) |
| **Encryption** | None (placeholder) | SQLCipher or app-level encryption |
| **Templates** | Exists but incomplete | Templates define cadence + defaults per global category |
| **Export** | None | CSV export + backup guidance (budget instances, categories, line items) |
| **Transactions** | CategoryLedgerModal exists | Double-click Received/Spent amount → line-item modal for current period budget instance |
| **Rollups** | Category stats only | Period budget instance rollups (received/spent totals per category) |

---

## Architecture Patterns (CONFIRMED)

### Frontend → Backend Communication
- Tauri `invoke()` API for all backend calls
- Commands defined in `src-tauri/src/lib.rs` → `invoke_handler![]`
- Command implementations in `src-tauri/src/modules/commands/`

### Database Access
- All DB operations in Rust backend (no direct frontend DB access)
- `DbState` manages connection (single file path)
- Migrations run on `init_database` call

### State Management
- Redux Toolkit for global state (budgets, expenses, auth)
- React Context for timezone (TimezoneContext)
- Component-local state for UI (modals, forms)

### UI Patterns
- Tailwind CSS utility classes
- Headless UI components (`@headlessui/react`)
- AG Grid for some data grids (CategoryGrid)
- React Router for navigation

---

## Build & Development (CONFIRMED)

### Prerequisites
- Node.js (v16+)
- Rust (latest stable)
- Tauri CLI (`@tauri-apps/cli`)

### Commands
```bash
npm install          # Install frontend dependencies
npm run tauri dev    # Start dev server (Vite on :1420, Tauri window)
npm run tauri build  # Build production app
```

### Database Location
- **Dev**: `%APPDATA%/expensesmanager/expenses_encrypted.sqlite` (Windows)
- **Production**: Same location (app_data_dir)

---

## Security Status (CONFIRMED)

### Current Implementation Status
- ✅ Password hashing exists (SHA256 via `sha2` crate) - TO BE REPLACED
- ✅ `verify_master_password` command exists
- ❌ Database is **unencrypted** (SQLite plaintext)
- ❌ No SQLCipher integration
- ❌ No file-level encryption
- ❌ Encryption module is placeholder (`src-tauri/src/modules/security/encryption.rs`)

### MVP Decisions (CONFIRMED)
- **Password Hashing**: Argon2id exclusively (CONFIRMED - replacing SHA256, fresh start)
- **Database Encryption**: SQLCipher via rusqlite feature flag (CONFIRMED)
- **Target Platform**: Windows 11 only for MVP (CONFIRMED)
- Master password creation/unlock flow
- Encrypted portable finance files

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
- **No lock-in**: Users can ALWAYS Open Database + Export, even in Read-Only
- **Offline-first**: Perpetual plan works fully offline forever
- **Privacy-first**: No email/account required for perpetual licenses
- **Feature gating**: Based on `build_release_date <= feature_updates_until` (NOT system clock)
- **Old generation handling**: Valid signature → Full Mode; show banner to update, don't disrupt

### Licensing Artifacts
- **Perpetual License File**: Signed portable file (`license_id`, `generation`, `feature_updates_until`, `signature`)
- **Recovery Secret**: For license recovery without account
- **Lease Token**: For subscription plans (requires periodic refresh)

---

## References

### Key Files
- `src-tauri/src/modules/database/mod.rs` - Database initialization and schema
- `src-tauri/src/modules/commands/budget.rs` - Budget commands
- `src/components/features/BudgetGrid/BudgetGrid.tsx` - Main budget UI
- `src/components/features/BudgetGrid/CategoryGrid.tsx` - Category grid
- `documentation/specification.md` - Existing specification (may be outdated)

### Migration Files
- `src-tauri/migrations/2025_09_templates.sql` - Template system
- `src-tauri/migrations/2025_10_fix_categories_and_templates.sql` - Latest schema fixes

---

## Next Steps

1. Read **REPO_MAP.md** for detailed file structure
2. Read **ARCHITECTURE_CURRENT.md** for implementation details
3. Read **MVP_PLAN.md** for implementation roadmap
4. Check **QUESTIONS_FOR_USER.md** for any open questions
