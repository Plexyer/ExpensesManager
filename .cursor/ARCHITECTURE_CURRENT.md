# Current Architecture

## Architecture Overview (CONFIRMED)

```
┌─────────────────────────────────────┐
│      React Frontend (TypeScript)    │
│  - Redux Toolkit (state)            │
│  - React Router (routing)            │
│  - Tailwind CSS (styling)           │
│  - AG Grid (some grids)             │
└──────────────┬──────────────────────┘
               │ Tauri invoke()
               │
┌──────────────▼──────────────────────┐
│      Tauri Bridge (IPC)             │
└──────────────┬──────────────────────┘
               │
┌──────────────▼──────────────────────┐
│      Rust Backend                    │
│  - Tauri commands                    │
│  - rusqlite (SQLite)                 │
│  - serde (serialization)             │
└──────────────┬──────────────────────┘
               │
┌──────────────▼──────────────────────┐
│      SQLite Database                 │
│  (unencrypted, app_data_dir)         │
└──────────────────────────────────────┘
```

---

## Frontend Architecture (CONFIRMED)

### React Structure

#### Component Hierarchy
```
App (root)
├── TimezoneProvider (context)
├── Header (navigation)
├── Sidebar (desktop)
├── Mobile Menu (mobile)
└── Outlet (React Router)
    ├── Dashboard
    ├── BudgetGrid
    │   ├── BudgetList
    │   ├── BudgetDetail
    │   │   └── CategoryGrid
    │   │       └── CategoryLedgerModal
    │   └── CreateBudgetForm
    ├── CategoriesPage
    ├── TemplatesPage
    └── Settings
```

#### State Management

**Redux Store** (`src/store/store.ts`)
```typescript
{
  auth: AuthState,      // Authentication state
  budget: BudgetState,  // Budgets, categories, loading
  expense: ExpenseState // Expenses/transactions
}
```

**Redux Slices**:
- `authSlice.ts` - User authentication
- `budgetSlice.ts` - Budgets, categories, visible columns
- `expenseSlice.ts` - Expense entries

**React Context**:
- `TimezoneContext.tsx` - Global timezone selection and date formatting

#### Routing (CONFIRMED from App.tsx)
- React Router DOM v6
- Routes: `/`, `/budget`, `/categories`, `/templates`, `/settings`
- Navigation via `<NavLink>` components

#### Styling
- **Tailwind CSS 4.1.11** - Utility-first CSS
- **Headless UI** - Accessible component primitives
- **Lucide React** - Icon library
- **AG Grid** - Data grid for CategoryGrid

---

## Backend Architecture (CONFIRMED)

### Tauri Setup

#### App Initialization (`src-tauri/src/lib.rs`)
```rust
tauri::Builder::default()
    .plugin(tauri_plugin_opener::init())
    .setup(|app| {
        let state = init_state(&app.handle())?;
        app.manage::<DbState>(state);
        Ok(())
    })
    .invoke_handler(tauri::generate_handler![
        // ... commands
    ])
```

#### Command Pattern
- Commands defined in `src-tauri/src/modules/commands/`
- Registered in `lib.rs` via `invoke_handler![]`
- Frontend calls via `invoke('command_name', { args })`
- Commands receive `State<DbState>` for database access

### Database Layer

#### Connection Management (`src-tauri/src/modules/database/mod.rs`)
```rust
pub struct DbState {
    pub path: PathBuf,  // Path to SQLite file
}

impl DbState {
    pub fn new(app: &AppHandle) -> Result<Self, DbError> {
        let app_dir = app.path().app_data_dir()?;
        let db_path = app_dir.join("expenses_encrypted.sqlite");
        Ok(Self { path: db_path })
    }

    pub fn get_conn(&self) -> Result<Connection, DbError> {
        Connection::open_with_flags(
            &self.path,
            OpenFlags::SQLITE_OPEN_READ_WRITE | OpenFlags::SQLITE_OPEN_CREATE
        )
    }
}
```

#### Schema Management
- Schema created inline in `run_migrations()` function
- Migrations run on `init_database` command
- Foreign keys enabled: `PRAGMA foreign_keys = ON`

#### Current Schema (CONFIRMED from database/mod.rs and migrations)

**Core Tables**:
- `MonthlyBudgets` - Budgets (month, year, income, finished_at, name)
- `budget_categories` - Categories per budget (category_name, allocated_amount)
- `expenses` - Transactions (entry_type, amount, date, description, place, notes, deleted_at)
- `BudgetChangeHistory` - Audit trail

**Template System**:
- `budget_templates` - Template definitions
- `template_categories` - Template → global category mappings
- `global_categories` - Reusable category definitions

**Legacy Tables** (may be unused):
- `Users` - User accounts (username, password_hash)
- `BudgetTemplates` - Old template table
- `BudgetCategories` - Old category table
- `CategoryAllocations` - Old allocation table

### Command Implementation Pattern

#### Example: Budget Command (`src-tauri/src/modules/commands/budget.rs`)
```rust
#[tauri::command]
pub fn create_monthly_budget(
    args: CreateBudgetArgs,
    db: State<DbState>
) -> Result<i64, String> {
    let conn = db.get_conn().map_err(|e| e.to_string())?;
    // ... SQL operations
    Ok(budget_id)
}
```

#### Error Handling
- Commands return `Result<T, String>`
- Errors converted to strings for frontend
- Database errors wrapped in `DbError` enum

---

## Data Flow (CONFIRMED)

### Budget Creation Flow
1. User fills `CreateBudgetForm`
2. Form calls `createMonthlyBudget()` from `budgetService.ts`
3. Service calls `invoke('create_monthly_budget', { args })`
4. Tauri routes to `create_monthly_budget` command in Rust
5. Command opens DB connection via `DbState`
6. Command inserts into `MonthlyBudgets` table
7. Command returns `budget_id`
8. Frontend updates Redux state
9. UI refreshes to show new budget

### Category Grid Flow
1. `BudgetDetail` renders `CategoryGrid` with `budgetId`
2. `CategoryGrid` dispatches `fetchCategoriesWithStats(budgetId)`
3. Redux thunk calls `invoke('get_budget_categories_with_stats', { budgetId })`
4. Command queries `budget_categories` + `expenses` (aggregated)
5. Returns category stats (allocated, spent, remaining)
6. Redux updates `budget.categories`
7. `CategoryGrid` renders AG Grid with data

### Transaction Entry Flow
1. User clicks category in `CategoryGrid`
2. Opens `CategoryLedgerModal`
3. Modal loads transactions via `invoke('get_category_ledger', { categoryId })`
4. User adds transaction via `invoke('add_category_entry', { args })`
5. Command inserts into `expenses` table
6. Modal refreshes ledger
7. `CategoryGrid` refreshes stats

---

## Security Architecture (CONFIRMED)

### Current Implementation

#### Password Hashing (`src-tauri/src/modules/security/auth.rs`)
- **Algorithm**: SHA256 (via `sha2` crate)
- **Storage**: `Users` table, `password_hash` column
- **Verification**: `verify_password()` function
- **Command**: `verify_master_password` (exists but may not be used)

#### Encryption Status
- **Database**: ❌ Unencrypted SQLite
- **File**: ❌ No file-level encryption
- **SQLCipher**: ❌ Not integrated
- **Placeholder**: `src-tauri/src/modules/security/encryption.rs` (empty)

### MVP Needed
- Master password creation/unlock flow
- SQLCipher integration OR app-level encryption
- Encrypted portable finance files

---

## Performance Considerations (INFERRED)

### Current Patterns
- **Database**: Single connection per command (no connection pooling)
- **Frontend**: Redux caching (budgets, categories cached in store)
- **Grid**: AG Grid used for CategoryGrid (virtualization built-in)
- **Queries**: Direct SQL, no ORM overhead

### Potential Issues
- No database connection pooling (may be fine for single-user desktop app)
- No query optimization (indexes exist but may need more)
- Redux state can grow large with many budgets/categories

---

## Testing (INFERRED - not confirmed)

### Current State
- No test files found in repo scan
- No test configuration in `package.json`
- No Rust test modules visible

### MVP Needed
- Unit tests for critical business logic
- Integration tests for Tauri commands
- E2E tests for key user flows

---

## Build Pipeline (CONFIRMED)

### Frontend Build (Vite)
1. `npm run build` → `tsc && vite build`
2. TypeScript compiles
3. Vite bundles React app to `dist/`
4. Tailwind CSS processed by PostCSS

### Backend Build (Cargo)
1. `cargo build` (via Tauri CLI)
2. Rust compiles to binary
3. Links with Tauri runtime

### Tauri Bundle
1. `npm run tauri build`
2. Frontend builds to `dist/`
3. Rust compiles
4. Tauri bundles into installer (Windows/MSI, macOS/DMG, Linux/AppImage)

---

## Dependencies (CONFIRMED)

### Frontend (`package.json`)
- React 18.3.1
- Redux Toolkit 2.2.7
- React Router DOM 6.26.2
- Tailwind CSS 4.1.11
- AG Grid Community 32.3.3
- Headless UI 2.1.10
- Lucide React 0.471.0
- Tauri API 2.x

### Backend (`src-tauri/Cargo.toml`)
- Tauri 2
- rusqlite 0.31 (bundled)
- serde 1.x
- serde_json 1.x
- sha2 0.10
- thiserror 1.0
- time 0.3

---

## Known Architecture Gaps (for MVP)

1. **No file picker system** - Currently single database in app_data_dir
2. **No encryption** - Database is plaintext SQLite
3. **No period system** - Currently month/year, not cadence-based periods
4. **No single-period category grid (corrected design)** - Current UI is category list/grid, not a period budget instance grid with Received/Spent columns and line-item modals
5. **No CSV export** - No export functionality exists
6. **Template cadence not modeled** - Corrected design requires cadence/period length per template; current schema does not encode it explicitly

---

## References

- See **REPO_MAP.md** for file locations
- See **DATA_MODEL.md** for database schema details
- See **PROJECT_OVERVIEW.md** for high-level overview
