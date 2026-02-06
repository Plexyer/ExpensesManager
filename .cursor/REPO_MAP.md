# Repository Map

> **Last Updated**: 2026-02-06  
> **Note**: This document contains both TARGET (planned) and CURRENT structure. Much of the detailed structure below is PLANNED and not yet implemented.

## Current Implementation (as of 2026-02-06)

After TASK-1.1 completion, the actual implemented structure is:

```
src/
├── App.tsx                    # Router setup (/, /settings)
├── main.tsx                   # Entry point with Redux Provider + MemoryRouter
├── index.css                  # Tailwind imports
├── components/
│   └── features/
│       └── Onboarding/
│           └── Onboarding.tsx # Create/Open file UI
├── pages/
│   ├── HomePage.tsx           # Conditional onboarding or file-open view
│   └── SettingsPage.tsx       # Placeholder
├── services/
│   └── fileService.ts         # Tauri dialog wrapper
└── store/
    ├── store.ts               # Redux store config
    ├── hooks.ts               # Typed useAppDispatch/useAppSelector
    └── slices/
        └── fileSlice.ts       # File state management

src-tauri/
├── src/
│   ├── lib.rs                 # Tauri app with dialog plugin
│   └── main.rs                # Binary entry point
├── Cargo.toml                 # Dependencies (tauri-plugin-dialog)
└── capabilities/
    └── default.json           # dialog:default permission
```

---

## Directory Structure (TARGET - planned)

```
ExpensesManager/
├── .cursor/                    # Cursor workspace (agents, skills, commands, docs)
├── .github/                    # GitHub workflows/instructions
├── .vscode/                    # VS Code settings
├── documentation/              # Project documentation
├── public/                     # Static assets
├── src/                        # Frontend React/TypeScript code
├── src-tauri/                  # Rust backend (Tauri)
├── target/                     # Rust build artifacts (gitignored)
├── package.json               # Frontend dependencies
├── tsconfig.json              # TypeScript config
├── vite.config.ts             # Vite build config
├── tailwind.config.js         # Tailwind CSS config
└── README.md                  # Basic project readme
```

---

## Frontend Entry Points (CONFIRMED)

### Main Entry
- **`src/main.tsx`** - React app entry point, renders `<App />`
- **`src/App.tsx`** - Root component with routing, sidebar, TimezoneProvider
- **`index.html`** - HTML entry point

### Routing (CONFIRMED from App.tsx)
Routes defined in `App.tsx`:
- `/` - Dashboard (`<Dashboard />`)
- `/budget` - Budgets (`<BudgetGrid />`)
- `/categories` - Categories (`<CategoriesPage />`)
- `/templates` - Templates (`<TemplatesPage />`)
- `/settings` - Settings (`<Settings />`)

---

## Frontend Structure (`src/`)

### Components (`src/components/`)

#### Features (`src/components/features/`)
- **`BudgetGrid/`**
  - `BudgetGrid.tsx` - Main budget list/detail container
  - `BudgetList.tsx` - Budget list view with cards
  - `BudgetDetail.tsx` - Detailed budget view
  - `BudgetChangeHistory.tsx` - Change history table
  - `CreateBudgetForm.tsx` - Budget creation form
  - `CategoryGrid.tsx` - Category grid with AG Grid
  - `CategoryLedgerModal.tsx` - Transaction entry modal
  - `ExpenseModal.tsx` - Simple expense modal (basic)
  - `categoryColumns.tsx` - Column definitions for CategoryGrid
  - `ChooseColumnsPopover.tsx` - Column visibility selector

- **`Dashboard/`**
  - `Dashboard.tsx` - Dashboard page

- **`Settings/`**
  - `SecuritySettings.tsx` - Security settings UI

- **`Templates/`**
  - `TemplatesPage.tsx` - Template management page
  - `TemplateManager.tsx` - Template manager component

#### Common (`src/components/common/`)
- `BackButton.tsx` - Back navigation button

### Contexts (`src/contexts/`)
- **`TimezoneContext.tsx`** - Global timezone state and date formatting

### Services (`src/services/`)
- **`budgetService.ts`** - Budget API calls (Tauri invoke wrappers)
- **`expenseService.ts`** - Expense API calls (Tauri invoke wrappers)

### Store (`src/store/`)
- **`store.ts`** - Redux store configuration
- **`types.ts`** - Redux type exports
- **`slices/`**
  - `authSlice.ts` - Authentication state
  - `budgetSlice.ts` - Budget state (budgets, categories, loading)
  - `expenseSlice.ts` - Expense state

### Types (`src/types/`)
- **`budget.ts`** - Budget type definitions
- **`budget.types.ts`** - Budget template types
- **`category.types.ts`** - Category type definitions
- **`expense.types.ts`** - Expense type definitions

### Pages (`src/pages/`)
- **`Settings.tsx`** - Settings page component

### Other (`src/`)
- **`App.css`** - Global CSS
- **`index.css`** - Tailwind imports and base styles
- **`migration.js`** - Frontend migration runner
- **`test-migration.js`** - Migration testing

---

## Backend Structure (`src-tauri/`)

### Entry Points (CONFIRMED)
- **`src/main.rs`** - Binary entry point, calls `expensesmanager_lib::run()`
- **`src/lib.rs`** - Library entry point, sets up Tauri app and command handlers

### Modules (`src-tauri/src/modules/`)

#### Commands (`src-tauri/src/modules/commands/`)
- **`mod.rs`** - Command module exports
- **`budget.rs`** - Budget CRUD commands (create, list, get, delete, finish, unfinish, update_title, change_history)
- **`expense.rs`** - Expense/transaction commands (add, update, soft_delete, get_ledger)
- **`security.rs`** - Security commands (verify_master_password)

#### Database (`src-tauri/src/modules/database/`)
- **`mod.rs`** - Database initialization, connection management, schema creation
  - `DbState` struct - Manages database path and connection
  - `init_state()` - Initialize database state
  - `run_migrations()` - Run schema migrations

#### Security (`src-tauri/src/modules/security/`)
- **`mod.rs`** - Security module exports
- **`auth.rs`** - Password verification (SHA256 hashing)
- **`encryption.rs`** - Placeholder for encryption (currently empty)

#### Models (`src-tauri/src/modules/models/`)
- **`mod.rs`** - Model definitions (if any)

#### Utils (`src-tauri/src/modules/utils/`)
- **`mod.rs`** - Utility functions (if any)

### Migrations (`src-tauri/migrations/`)
- **`2025_09_alter_expenses_unified_entries.sql`** - Unified expense entries (entry_type)
- **`2025_09_create_budget_categories.sql`** - Budget categories schema
- **`2025_09_templates.sql`** - Template system schema
- **`2025_10_fix_categories_and_templates.sql`** - Latest schema fixes (global_categories, template_categories, budget_categories)

### Configuration (`src-tauri/`)
- **`Cargo.toml`** - Rust dependencies and package config
- **`tauri.conf.json`** - Tauri app configuration (window, build, bundle)
- **`capabilities/default.json`** - Tauri capabilities/permissions
- **`build.rs`** - Build script

---

## Documentation (`documentation/`)

- **`specification.md`** - Existing software specification (may be outdated)
- **`core_app_dev_roadmap.md`** - Development roadmap
- **`ethical_budget_app_vision.md`** - Project vision document
- **`2025_10_fix_categories_and_templates.sql`** - SQL migration reference

---

## Configuration Files (CONFIRMED)

### Frontend
- **`package.json`** - NPM dependencies and scripts
- **`tsconfig.json`** - TypeScript compiler config (strict mode)
- **`vite.config.ts`** - Vite build config (port 1420, React plugin)
- **`tailwind.config.js`** - Tailwind CSS config
- **`postcss.config.js`** - PostCSS config

### Backend
- **`src-tauri/Cargo.toml`** - Rust dependencies
- **`src-tauri/tauri.conf.json`** - Tauri app config

### IDE
- **`.vscode/extensions.json`** - Recommended VS Code extensions
- **`.cursor/`** - Cursor workspace (this folder)

---

## Key Files by Purpose

### Database Schema
- `src-tauri/src/modules/database/mod.rs` - Schema creation (inline SQL)
- `src-tauri/migrations/*.sql` - Migration files

### Tauri Commands
- `src-tauri/src/lib.rs` - Command handler registration
- `src-tauri/src/modules/commands/budget.rs` - Budget commands
- `src-tauri/src/modules/commands/expense.rs` - Expense commands
- `src-tauri/src/modules/commands/security.rs` - Security commands

### Frontend API Calls
- `src/services/budgetService.ts` - Budget service (wraps Tauri invoke)
- `src/services/expenseService.ts` - Expense service (wraps Tauri invoke)

### State Management
- `src/store/store.ts` - Redux store setup
- `src/store/slices/budgetSlice.ts` - Budget Redux slice
- `src/store/slices/expenseSlice.ts` - Expense Redux slice
- `src/store/slices/authSlice.ts` - Auth Redux slice

### UI Components
- `src/components/features/BudgetGrid/BudgetGrid.tsx` - Main budget UI
- `src/components/features/BudgetGrid/CategoryGrid.tsx` - Category grid
- `src/components/features/BudgetGrid/CategoryLedgerModal.tsx` - Transaction modal
- `src/components/features/Templates/TemplatesPage.tsx` - Template management

### Routing & Layout
- `src/App.tsx` - Root component with routing
- `src/main.tsx` - React entry point

---

## Build Artifacts (gitignored)

- **`target/`** - Rust compilation output
- **`node_modules/`** - NPM dependencies
- **`dist/`** - Frontend build output

---

## Entry Points Summary

### Development
1. Run `npm run tauri dev`
2. Vite dev server starts on `http://localhost:1420`
3. Tauri window opens, loads frontend
4. Frontend calls `init_database` on mount
5. Database initializes in `app_data_dir`

### Production Build
1. Run `npm run tauri build`
2. Frontend builds to `dist/`
3. Rust compiles to binary
4. Tauri bundles everything into installer

---

## File Naming Conventions (CONFIRMED)

- **React components**: PascalCase (e.g., `BudgetGrid.tsx`)
- **TypeScript types**: camelCase interfaces/types (e.g., `budget.types.ts`)
- **Rust modules**: snake_case (e.g., `budget.rs`)
- **SQL migrations**: `YYYY_MM_description.sql` (e.g., `2025_09_templates.sql`)
- **Tauri commands**: snake_case (e.g., `create_monthly_budget`)

---

## References

- See **ARCHITECTURE_CURRENT.md** for implementation details
- See **BUILD_AND_RUN.md** for build/run instructions
- See **PROJECT_OVERVIEW.md** for high-level overview
