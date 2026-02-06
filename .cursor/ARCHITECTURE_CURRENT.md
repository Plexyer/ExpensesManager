# Current Architecture

> **Last Updated**: 2026-02-06  
> **Note**: This document contains both the TARGET architecture (planned) and CURRENT implementation status. Sections marked "(PLANNED)" describe intended design; sections marked "(IMPLEMENTED)" reflect actual code.

## MVP Progress

| Phase | Status | Notes |
|-------|--------|-------|
| Phase 1.1 - File Picker | ✅ DONE | Tauri dialog, Redux store, Onboarding UI |
| Phase 1.2 - Password Creation | ✅ DONE | Password modal with zxcvbn strength, validation |
| Phase 1.2b - Password Unlock | ✅ DONE | Unlock modal with error handling, attempt limiting |
| Phase 1.2c - Stub File Format | ✅ DONE | Temporary plaintext `.financedb` for testing (TASK-STUB-1) |
| Phase 1.3 - Encryption | ⏳ NEXT | TASK-1.4 (research) then TASK-1.5/1.6 |

### Stub File Format (Implemented 2026-02-06)

**Solution Implemented**: Temporary stub file format with Rust backend (no new dependencies).

**Components**:
- `src-tauri/src/stub_file.rs`: Tauri commands for create/read/verify stub files
- `src/services/fileService.ts`: TypeScript wrappers for Rust commands
- Stub files are JSON with format `financedb_stub`, version `1`, plaintext password

**⚠️ MVP STUB ONLY**: Password stored in plaintext. Will be replaced by SQLCipher in Phase 1.3.

---

## Architecture Overview (TARGET)

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

## Frontend Architecture (CURRENT - as of 2026-02-06)

### Actual Component Structure
```
App (root, src/App.tsx)
└── Routes (MemoryRouter)
    ├── "/" → HomePage
    │   ├── Onboarding (when no file open)
    │   └── File Selected View (when file open)
    └── "/settings" → SettingsPage (placeholder)
```

### Actual Redux Store
```typescript
// src/store/store.ts
{
  file: FileState  // filePath, fileName, isFileOpen, isLoading, error
}
```

### Actual Services
- `src/services/fileService.ts` - Tauri dialog wrapper (selectNewFilePath, selectExistingFilePath)

---

## Frontend Architecture (TARGET - planned)

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

### Frontend (`package.json`) - Updated 2026-02-06
- React 18.3.1
- Redux Toolkit 2.11.2
- React Redux 9.2.0
- React Router DOM 7.13.0
- Tailwind CSS 4.1.18 (via @tailwindcss/vite)
- Tauri API 2.x
- @tauri-apps/plugin-dialog 2.6.0

### Backend (`src-tauri/Cargo.toml`) - Updated 2026-02-06
- Tauri 2
- tauri-plugin-dialog 2.6.0
- tauri-plugin-opener 2
- serde 1.x
- serde_json 1.x

---

## Current Implementation Status

| Component | Status | Notes |
|-----------|--------|-------|
| File picker system | ✅ DONE | TASK-1.1 completed 2026-02-06; Tauri dialog plugin integrated |
| Redux store | ✅ DONE | fileSlice with path/loading/error state |
| React Router | ✅ DONE | MemoryRouter with `/` and `/settings` routes |
| Tailwind CSS | ✅ DONE | v4 configured via Vite plugin |
| Onboarding UI | ✅ DONE | Create/Open file buttons with native dialogs |

---

## Stub File I/O Architecture (Temporary - MVP Testing)

> **⚠️ MVP STUB ONLY**: This architecture is temporary. See `.cursor/FINANCEDB_STUB_SPEC.md` for full spec.

### Overview

Before SQLCipher encryption is implemented, we use a simple JSON stub file to enable testing of create/open/unlock flows.

```
┌─────────────────────────────────────┐
│      React Frontend (TypeScript)    │
│  - PasswordCreationModal            │
│  - PasswordUnlockModal              │
│  - fileService.ts                   │
└──────────────┬──────────────────────┘
               │ Tauri FS API (read/write)
               │
┌──────────────▼──────────────────────┐
│      .financedb Stub File           │
│  {                                  │
│    "format": "financedb_stub",      │
│    "version": 1,                    │
│    "master_password": "plaintext",  │
│    "password_hint": "optional"      │
│  }                                  │
└─────────────────────────────────────┘
```

### Data Flow

#### Create Finance File
1. User completes password creation modal
2. `fileService.writeStubFile(path, password, hint)` called
3. Tauri FS API writes JSON to selected path
4. Redux state updated: `isFileOpen = true`

#### Open Finance File
1. User selects `.financedb` file
2. `fileService.readStubFile(path)` called
3. File parsed, `password_hint` extracted for modal
4. Unlock modal shown
5. User enters password
6. `fileService.verifyStubPassword(path, input)` compares to stored password
7. If match → Redux state updated: `isFileOpen = true`
8. If mismatch → error shown, retry allowed

### File Location

- **User-chosen**: File saved to location selected in file picker
- **No default location**: Unlike app data, finance files are portable
- **Extension**: `.financedb` (same as future encrypted format)

### Security Model (Stub Only)

| Aspect | Stub (Temporary) | Final (SQLCipher) |
|--------|------------------|-------------------|
| Password storage | Plaintext in JSON | Not stored (implicit in encryption) |
| Encryption | None | AES-256 via SQLCipher |
| Password verification | String comparison | Decryption success/failure |
| Security level | ⚠️ NONE | ✅ Strong |

---

## Known Architecture Gaps (for MVP)

1. ~~**No file picker system**~~ - ✅ Implemented (TASK-1.1)
2. ~~**No file creation**~~ - ⏳ Stub file format (TASK-STUB-1 next)
3. **No encryption** - Database is plaintext SQLite (stub uses plaintext JSON)
4. **No period system** - Currently no database schema implemented
5. **No single-period category grid (corrected design)** - No grid UI yet
6. **No CSV export** - No export functionality exists
7. **Template cadence not modeled** - No template system implemented yet
8. **No licensing system** - No license state, no app mode (Full vs Read-Only), no feature gating
9. **No database** - No rusqlite/SQLite integration yet (file path only, no actual DB operations)

---

## Licensing Architecture (CONFIRMED)

See `.cursor/LICENSING.md` for authoritative source and `.cursor/LICENSING_MVP_IMPACTS.md` for MVP scope breakdown.

### License State Management

```
┌─────────────────────────────────────┐
│      App Startup                    │
│  1. Check for local license file    │
│  2. Validate signature (offline)    │
│  3. Determine app mode              │
└──────────────┬──────────────────────┘
               │
       ┌───────▼────────┐
       │ License Valid? │
       └───────┬────────┘
          Yes  │  No
    ┌──────────┴──────────┐
    ▼                     ▼
┌────────────┐     ┌──────────────┐
│ Full Mode  │     │ Read-Only    │
│ (R+W)      │     │ Mode (R only)│
└────────────┘     └──────────────┘
```

### App Mode State

```typescript
// Frontend state shape (conceptual)
interface LicenseState {
  mode: 'full' | 'read-only';
  licenseType: 'perpetual' | 'subscription' | 'none';
  licenseId: string | null;
  generation: number | null;
  featureUpdatesUntil: Date | null;
  isPremium: boolean;
  offlineModeEnabled: boolean; // Perpetual only
}
```

### Feature Gating Logic (CONFIRMED)

```rust
// Rust backend (conceptual)
fn is_feature_available(
    feature_release_date: Date,
    license: &PerpetualLicense
) -> bool {
    // Gate by BUILD release date, NOT system clock
    feature_release_date <= license.feature_updates_until
}
```

**Key rule**: NEVER use `today()` / system clock for feature eligibility. Use build metadata's release date instead.

### License Artifacts (CONFIRMED)

#### Perpetual License File
```json
{
  "license_id": "lic_abc123",
  "generation": 1,
  "plan_type": "perpetual",
  "feature_updates_until": "2031-02-06",
  "issued_at": "2026-02-06",
  "signature": "Ed25519_signature_here"
}
```

#### Lease Token (Subscription - Post-MVP)
```json
{
  "account_id": "acc_xyz789",
  "subscription_paid_until": "2027-02-06",
  "offline_allowed_until": "2026-03-08",
  "issued_at": "2026-02-06",
  "signature": "Ed25519_signature_here"
}
```

### Mode Behavior Matrix

| Mode | View Data | Export | Add/Edit/Delete | Requires |
|------|-----------|--------|-----------------|----------|
| **Full** | ✅ | ✅ | ✅ | Valid license |
| **Read-Only** | ✅ | ✅ | ❌ | Any (default) |

### Offline Mode Toggle (Perpetual Only)

When enabled:
- No server calls (no update checks, no license status check)
- Show warning in UI
- All base features work normally

When disabled:
- Optional update checks
- Optional license status checks (for banner about newer generation)

### Old Generation Handling (CONFIRMED)

If server reports newer generation exists:
- **Do NOT switch to Read-Only**
- Keep Full Mode
- Show non-intrusive banner: "A newer license version exists. Import it to continue receiving updates."
- Block feature-update downloads only
- Offline use continues normally

---

## References

- See **REPO_MAP.md** for file locations
- See **DATA_MODEL.md** for database schema details
- See **PROJECT_OVERVIEW.md** for high-level overview
