# Backlog - MVP Tasks

## Task Format

Each task includes:
- **Goal**: What needs to be accomplished
- **Scope**: What's included/excluded
- **Acceptance Criteria**: How to verify completion
- **Likely Areas/Files**: Where changes will be made
- **Complexity**: S (Small, 1-2 days), M (Medium, 3-5 days), L (Large, 1+ weeks)
- **Dependencies**: Other tasks that must complete first

---

## Phase 1: Foundation - File System & Encryption

### TASK-1.1: Integrate Tauri File Dialog API ✅ COMPLETED
**Goal**: Add file picker to create/open finance files  
**Scope**: 
- Install/use Tauri file dialog plugin
- Create "Create File" button/flow
- Create "Open File" button/flow
- Store selected file path in app state

**Acceptance Criteria**:
- ✅ User can click "Create New Finance File" → file picker opens
- ✅ User can select save location and enter filename
- ✅ User can click "Open Finance File" → file picker opens
- ✅ Selected file path stored in Redux state or context

**Likely Areas/Files**:
- `src/components/Onboarding.tsx` (new component)
- `src/services/fileService.ts` (new service, wraps Tauri invoke)
- `src-tauri/src/modules/commands/file.rs` (new command module)
- `src-tauri/src/lib.rs` (register file commands)
- `src/store/slices/fileSlice.ts` (new Redux slice for file state)

**Complexity**: S  
**Dependencies**: None

#### Implementation Notes
- **Completed on**: 2026-02-06
- **Summary**:
  - Installed Tauri dialog plugin (Rust + npm), Tailwind CSS v4, React Router, Redux Toolkit
  - Created Onboarding component with "Create New" and "Open Existing" file buttons
  - Created Redux store with fileSlice tracking filePath, fileName, isFileOpen, isLoading, error
  - Created fileService wrapping Tauri dialog API for save/open dialogs with `.financedb` extension
  - Set up app shell with MemoryRouter (`/` home, `/settings` placeholder)
- **Files changed**:
  - Frontend: `src/store/store.ts`, `src/store/slices/fileSlice.ts`, `src/store/hooks.ts`, `src/services/fileService.ts`, `src/components/features/Onboarding/Onboarding.tsx`, `src/pages/HomePage.tsx`, `src/pages/SettingsPage.tsx`, `src/App.tsx`, `src/main.tsx`, `src/index.css`
  - Backend: `src-tauri/src/lib.rs`, `src-tauri/Cargo.toml`, `src-tauri/capabilities/default.json`
  - Config: `package.json`, `vite.config.ts`, `index.html`
- **Verification**:
  - Run `npm run tauri dev` → onboarding screen appears
  - Click "Create New Finance File" → native save dialog opens with `.financedb` filter
  - Click "Open Finance File" → native open dialog opens
  - File selection updates Redux state and shows "File Selected Successfully" screen

---

### TASK-1.2: Master Password Creation Modal ✅ COMPLETED
**Goal**: Implement password creation UI  
**Scope**:
- Password input field (with show/hide toggle)
- Password confirmation field
- Password strength indicator (weak/medium/strong)
- Password hint field (optional)
- Validation (match, minimum length)

**Acceptance Criteria**:
- ✅ User can enter master password
- ✅ User can confirm password
- ✅ Mismatch shows error
- ✅ Password strength displayed
- ✅ User can enter optional hint

**Likely Areas/Files**:
- `src/components/PasswordModal.tsx` (new component)
- `src/utils/passwordStrength.ts` (new utility)

**Complexity**: S  
**Dependencies**: TASK-1.1

#### Implementation Notes
- **Completed on**: 2026-02-06
- **Summary**:
  - Added zxcvbn library for password strength calculation
  - Created PasswordInput component with show/hide toggle
  - Created PasswordCreationModal with strength indicator, requirements checklist, and hint field
  - Minimum 12 character requirement with visual checklist
  - Warning banner about no password recovery
  - Discard confirmation when canceling with data entered
  - Updated fileSlice with onboarding steps (select → create-password → complete)
- **Files changed**:
  - New: `src/utils/passwordStrength.ts`, `src/utils/passwordValidation.ts`
  - New: `src/components/common/PasswordInput.tsx`
  - New: `src/components/features/Onboarding/PasswordCreationModal.tsx`
  - Modified: `src/store/slices/fileSlice.ts`, `src/components/features/Onboarding/Onboarding.tsx`, `src/pages/HomePage.tsx`
  - Dependencies: `package.json` (added zxcvbn, @types/zxcvbn)
- **Verification**:
  - Run `npm run tauri dev` → click "Create New Finance File" → select location → password modal appears
  - Test password validation, strength indicator, confirmation matching, hint field

---

### TASK-1.3: Master Password Unlock Modal ✅ COMPLETED
**Goal**: Implement password unlock UI  
**Scope**:
- Password input field
- Show/hide password toggle
- Password hint display (if available)
- Error message display (wrong password)
- Retry functionality

**Acceptance Criteria**:
- ✅ User can enter password to unlock
- ✅ Wrong password shows error
- ✅ Password hint shown (if available)
- ✅ User can retry after error

**Likely Areas/Files**:
- `src/components/UnlockModal.tsx` (new component, or reuse PasswordModal)
- `src/services/securityService.ts` (new service)

**Complexity**: S  
**Dependencies**: TASK-1.1

#### Implementation Notes
- **Completed on**: 2026-02-06
- **Summary**:
  - Created PasswordUnlockModal component with password input, hint display, error handling
  - Added attempt limiting (max 5 attempts, session-based lockout)
  - Modified fileSlice: openExistingFile now goes to "unlock-password" step before marking file open
  - Added completeFileUnlock and cancelFileUnlock Redux actions
  - Integrated unlock modal into Onboarding component
  - Stub behavior: password verification succeeds by default; passwords starting with "fail" trigger error for testing
- **Files changed**:
  - New: `src/components/features/Onboarding/PasswordUnlockModal.tsx`
  - Modified: `src/store/slices/fileSlice.ts` (added unlock actions, changed openExistingFile flow)
  - Modified: `src/components/features/Onboarding/Onboarding.tsx` (integrated unlock modal)
- **Verification**:
  - Run `npm run tauri dev` → click "Open Finance File" → select any .financedb → unlock modal appears
  - Enter any password → file opens (stub success)
  - Enter password starting with "fail" → shows error, can retry
  - After 5 failures → shows lockout message, input disabled
  - Cancel or Escape → returns to file selection

---

### TASK-STUB-1: Implement Temporary `.financedb` Stub File Creation/Unlock ✅ DONE
**Goal**: Create a temporary plaintext file format to enable testing of create/open/unlock flows before SQLCipher  
**Scope**:
- Implement stub file write on "Create Finance File" completion
- Implement stub file read on "Open Finance File"
- Implement password verification against stub file
- Display password hint from stub file
- Enable further MVP feature development that requires an existing file

**Acceptance Criteria**:
- ✅ "Create Finance File" writes a `.financedb` JSON stub file to disk
- ✅ Stub file contains: format identifier, version, created_at, master_password (plaintext), password_hint
- ✅ "Open Finance File" reads and parses stub file
- ✅ Unlock modal verifies password against stub file content
- ✅ Wrong password shows error, correct password unlocks file
- ✅ Password hint displayed if available and requested
- ✅ Invalid/corrupted files show appropriate error messages

**Likely Areas/Files**:
- `src/services/fileService.ts` (add stub read/write functions)
- `src/components/features/Onboarding/PasswordCreationModal.tsx` (call stub write on create)
- `src/components/features/Onboarding/PasswordUnlockModal.tsx` (call stub verify, display hint)
- `src/store/slices/fileSlice.ts` (minor state updates if needed)

**Complexity**: S (Small)  
**Dependencies**: TASK-1.1, TASK-1.2, TASK-1.3

**⚠️ MVP STUB ONLY**: This is a TEMPORARY format with PLAINTEXT passwords. See `.cursor/FINANCEDB_STUB_SPEC.md` for full specification. Will be replaced by SQLCipher in TASK-1.6.

**Implementation Notes**:
- **Completed on**: 2026-02-06
- **Summary**:
  - Implemented stub file I/O in Rust via Tauri commands (no new dependencies)
  - Added `create_stub_file`, `read_stub_file_info`, `verify_stub_password` commands
  - Updated fileService.ts with TypeScript wrappers for Rust commands
  - Updated Onboarding flow to create real files and verify passwords
  - Password hint is now read from file and displayed in unlock modal
- **Files changed**:
  - `src-tauri/src/stub_file.rs` (NEW - Rust stub file module with tests)
  - `src-tauri/src/lib.rs` (register Tauri commands)
  - `src/services/fileService.ts` (add stub file functions)
  - `src/store/slices/fileSlice.ts` (handle password hint from file)
  - `src/components/features/Onboarding/Onboarding.tsx` (integrate stub file I/O)
- **Verification**:
  - 5 Rust unit tests pass (create, read, verify correct/wrong password, invalid file)
  - TypeScript compiles with no errors

---

### TASK-1.4: Research SQLCipher Rust Integration ✅ COMPLETED
**Goal**: Determine how to integrate SQLCipher  
**Scope**:
- Research `rusqlite` SQLCipher support
- Research `sqlcipher` crate (if exists)
- Research compiling SQLCipher from source
- Document findings and recommendation

**Acceptance Criteria**:
- ✅ SQLCipher integration approach documented
- ✅ Dependencies identified
- ✅ Implementation plan created

**Likely Areas/Files**:
- `.cursor/ENCRYPTION_SPEC.md` (update with findings)
- Research notes

**Complexity**: S (research only)  
**Dependencies**: None (can run in parallel with TASK-STUB-1)

#### Implementation Notes
- **Completed on**: 2026-02-06
- **Summary**:
  - Researched rusqlite SQLCipher feature flags: `bundled-sqlcipher-vendored-openssl` is recommended
  - Confirmed `rusqlcipher` crate is outdated (7+ years) - do not use
  - Documented raw hex key format (`PRAGMA key = "x'hex'"`) to bypass SQLCipher PBKDF2 for Argon2id
  - Documented fallback approach using `aes-gcm` crate
  - Documented Windows 11 build requirements (MSVC C++ compiler)
- **Files changed**:
  - Created: `.cursor/TASK-1.4_SQLCIPHER_RESEARCH.md` (comprehensive research document)
  - Modified: `.cursor/ENCRYPTION_SPEC.md` (updated Rust Integration, Key Setting Pattern, Implementation Steps, Fallback Plan, Resolved Questions)
- **Verification**:
  - Research document contains all findings with sources
  - ENCRYPTION_SPEC.md has concrete Cargo.toml configuration ready for TASK-1.5

---

### TASK-1.5: Implement Key Derivation (Argon2id) ✅ COMPLETED
**Goal**: Derive encryption key from master password  
**Scope**:
- Add `argon2` crate dependency
- Implement key derivation function
- Generate random salt
- Store salt + KDF params in file header

**Acceptance Criteria**:
- ✅ Key derivation function implemented
- ✅ Salt generated securely
- ✅ KDF params configurable

**Likely Areas/Files**:
- `src-tauri/Cargo.toml` (add argon2 dependency)
- `src-tauri/src/modules/security/encryption.rs` (implement KDF)

**Complexity**: M  
**Dependencies**: TASK-1.4

#### Implementation Notes
- **Completed on**: 2026-02-06
- **Summary**:
  - Added `argon2`, `rand`, `hex` crates to Cargo.toml
  - Created `src-tauri/src/kdf.rs` module with Argon2id key derivation
  - Implemented `generate_salt()`, `derive_key()`, `key_to_hex()`, `get_kdf_params()`
  - Uses OWASP-recommended params: 64MB memory, 3 iterations, 4 parallelism, 32-byte output
  - Added `KdfError` enum with Display/Error traits for proper error handling
- **Files changed**:
  - `src-tauri/Cargo.toml` (added argon2, rand, hex dependencies)
  - `src-tauri/src/kdf.rs` (NEW - KDF module with tests)
  - `src-tauri/src/lib.rs` (added mod kdf declaration)
- **Verification**:
  - `cargo build` succeeds
  - `cargo test` passes all 8 KDF tests (+ 5 existing stub_file tests)
  - Tests cover: determinism, uniqueness, empty password validation, hex encoding

---

### TASK-1.6: Implement Database Encryption ✅ COMPLETED
**Goal**: Encrypt database file with SQLCipher or app-level encryption  
**Scope**:
- Integrate SQLCipher OR implement app-level AES-256-GCM
- Encrypt database on save
- Decrypt database on load
- Handle wrong password errors
- Replace stub file format with real encrypted SQLite

**Acceptance Criteria**:
- ✅ Database file is encrypted
- ✅ File unlocks with correct password
- ✅ Wrong password fails gracefully
- ✅ File is portable (can be moved/copied)
- ✅ New files created as encrypted SQLite (not stub JSON)
- ✅ Stub files from TASK-STUB-1 are no longer created (MVP testing complete)

**Completed Files**:
- `src-tauri/src/file_header.rs` - Plaintext file header with salt, KDF params, hint
- `src-tauri/src/encrypted_db.rs` - SQLCipher database operations + Tauri commands
- `src-tauri/src/lib.rs` - Updated to register DbState and new commands
- `src-tauri/Cargo.toml` - Added rusqlite, tempfile, thiserror
- `src/services/fileService.ts` - Replaced stub functions with encrypted DB calls
- `src/store/slices/fileSlice.ts` - Updated to use getDbInfo
- `src/components/features/Onboarding/Onboarding.tsx` - Updated to use encrypted DB
- Removed `src-tauri/src/stub_file.rs` (no longer needed)

**Implementation Notes**:
- Uses SQLCipher via `rusqlite` with `bundled-sqlcipher-vendored-openssl` feature
- Uses Argon2id for key derivation (bypasses SQLCipher's PBKDF2 via raw hex key)
- File format: EFM1 header (magic + version + salt + KDF params + hint) + encrypted SQLite
- 17 tests passing (file_header, encrypted_db, kdf)

**Complexity**: L  
**Dependencies**: TASK-1.5

---

## Phase 2: Data Model - Budget Instances & Categories

### TASK-2.1: Create Periods Table Migration ✅ COMPLETED
**Goal**: Add a **budget instance per period** table to schema (one main grid per budget instance)  
**Scope**:
- Create migration file
- Define budget instance table (cadence, start_date, end_date, template_id)
- Add indexes
- Run migration on init

**Acceptance Criteria**:
- ✅ Budget instance table exists
- ✅ Migration runs successfully
- ✅ Indexes created

**Likely Areas/Files**:
- `src-tauri/migrations/YYYY_MM_create_periods.sql` (new)
- `src-tauri/src/modules/database/mod.rs` (add migration call)

**Complexity**: S  
**Dependencies**: None (can do in parallel with Phase 1)

#### Implementation Notes
- **Completed on**: 2026-02-06
- **Summary**:
  - Created `migrations.rs` module with schema versioning via `_meta.schema_version`
  - Migration v1 creates base MVP tables: `global_categories`, `budget_templates`, `template_categories`, `period_budget_instances`
  - Migrations run automatically on both create and open paths
  - Added `MigrationError` variant to `EncryptedDbError`
- **Files changed**:
  - `src-tauri/src/migrations.rs` (NEW - migration module with v1 schema)
  - `src-tauri/src/encrypted_db.rs` (added migration calls, MigrationError variant)
  - `src-tauri/src/lib.rs` (added `mod migrations`)
- **Verification**:
  - 28 Rust tests pass (7 new migration tests)
  - `cargo build` succeeds with no warnings
  - Tables created: `global_categories`, `budget_templates`, `template_categories`, `period_budget_instances`
  - Indexes created: 6 indexes for query performance

---

### TASK-2.2: Create Envelopes Table Migration ✅ COMPLETED
**Goal**: Add per-budget-instance category rows (references global unique categories)  
**Scope**:
- Create migration file
- Define a table linking budget instance ↔ global_category_id, including received_date defaults and template default amounts
- Add foreign keys and indexes
- Run migration

**Acceptance Criteria**:
- ✅ `budget_instance_categories` table exists (renamed from `envelopes` per DATA_MODEL.md)
- ✅ Foreign keys correct (ON DELETE CASCADE to period_budget_instances and global_categories)
- ✅ Indexes created (3 indexes: idx_bic_budget_instance_id, idx_bic_global_category_id, idx_bic_instance_sort)

**Likely Areas/Files**:
- `src-tauri/src/migrations.rs` (migration v2)

**Complexity**: S  
**Dependencies**: TASK-2.1

#### Implementation Notes
- **Completed on**: 2026-02-06
- **Summary**:
  - Added migration v2 with `budget_instance_categories` table (links budget instances to global categories)
  - Table columns: budget_instance_category_id, budget_instance_id, global_category_id, default_amount, default_currency, sort_order, created_at
  - Added 3 performance indexes for common query patterns
  - Updated CURRENT_SCHEMA_VERSION from 1 to 2
  - Unique constraint on (budget_instance_id, global_category_id) prevents duplicates
- **Files changed**:
  - `src-tauri/src/migrations.rs` (added migration v2, 6 new tests)
- **Verification**:
  - All 34 Rust tests pass (6 new migration v2 tests)
  - `cargo build` succeeds
  - Migration is idempotent and upgrades v1 databases to v2

---

### TASK-2.3: Add Cadence to Templates
**Goal**: Store template cadence/period length (corrected design requirement)  
**Scope**:
- Create migration file
- Add `cadence` column to `budget_templates` table
- Default cadence for existing records (e.g., 'monthly') and allow editing
- Update template creation/editing code (UI + command)

**Acceptance Criteria**:
- ✅ `budget_templates` has `cadence` column
- ✅ Existing records have default cadence
- ✅ Template creation includes cadence

**Likely Areas/Files**:
- `src-tauri/migrations/YYYY_MM_add_cadence_to_templates.sql` (new)
- `src-tauri/src/modules/commands/budget.rs` (modify template commands)

**Complexity**: S  
**Dependencies**: None

---

### TASK-2.4: Update Transactions Schema
**Goal**: Store received/spent line items per category within a budget instance  
**Scope**:
- Add a line-items table (or extend existing) that links to a budget-instance category row
- Include explicit date (and optional time) per line item
- Update foreign keys
- Migrate existing transactions (if any) into the new model (as spent)
- Update command APIs accordingly

**Acceptance Criteria**:
- ✅ Line items link to (budget instance + category row)
- ✅ Foreign keys correct
- ✅ Existing data migrated

**Likely Areas/Files**:
- `src-tauri/migrations/YYYY_MM_update_transactions.sql` (new)
- `src-tauri/src/modules/commands/expense.rs` (modify)

**Complexity**: M  
**Dependencies**: TASK-2.2

---

### TASK-2.5: Implement Rollup Queries
**Goal**: Calculate received/spent totals per category for one budget instance  
**Scope**:
- Create SQL query for received total (sum received line items)
- Create SQL query for spent total (sum spent line items)
- Create command to get grid data for one budget instance (category rows with rollups)
- Handle edge cases (no transactions, negative amounts)

**Acceptance Criteria**:
- ✅ Spent amount calculated correctly
- ✅ Remaining amount calculated correctly
- ✅ Query performance acceptable (< 100ms)

**Likely Areas/Files**:
- `src-tauri/src/modules/commands/budget.rs` (new command: `get_grid_data`)

**Complexity**: M  
**Dependencies**: TASK-2.4

---

## Phase 3: Templates - Cadence + Defaults

### TASK-3.1: Update Template UI - Cadence
**Goal**: Add cadence selection to template creation form  
**Scope**:
- Add cadence dropdown to template form
- Save cadence with template
- Display cadence in template view

**Acceptance Criteria**:
- ✅ User can set cadence per template
- ✅ Cadence saved with template
- ✅ Cadence displayed in template list/view

**Likely Areas/Files**:
- `src/components/features/Templates/TemplatesPage.tsx` (modify)
- `src/types/template.types.ts` (add cadence field)

**Complexity**: S  
**Dependencies**: TASK-2.3

---

### TASK-3.2: Implement Template → Period Application
**Goal**: Create period with envelopes from template  
**Scope**:
- Create `create_period_from_template` command
- Copy envelopes from template to period
- Copy planned amounts
- Set period cadence and dates

**Acceptance Criteria**:
- ✅ Period created from template
- ✅ All envelopes copied
- ✅ Default amounts copied

**Likely Areas/Files**:
- `src-tauri/src/modules/commands/budget.rs` (new command)
- `src/services/budgetService.ts` (new function)

**Complexity**: M  
**Dependencies**: TASK-2.2, TASK-3.1

---

## Phase 4: UI - Excel-Like Grid

### TASK-4.1: Design Grid Component
**Goal**: Plan grid component architecture  
**Scope**:
- Choose grid library (AG Grid or custom)
- Design component hierarchy
- Plan cell rendering
- Document design decisions

**Acceptance Criteria**:
- ✅ Grid architecture documented
- ✅ Library chosen
- ✅ Component structure planned

**Likely Areas/Files**:
- Design document (markdown)

**Complexity**: S (planning)  
**Dependencies**: None

---

### TASK-4.2: Implement Grid Data Loading
**Goal**: Load and display one budget instance category grid data  
**Scope**:
- Create `get_grid_data` command (if not done in TASK-2.5)
- Load category rows for one budget instance
- Load rollups (received_total/spent_total)
- Display in grid component

**Acceptance Criteria**:
- ✅ Grid loads data
- ✅ Cells show spent/remaining
- ✅ Grid updates on data change

**Likely Areas/Files**:
- `src/components/features/BudgetGrid/PeriodGrid.tsx` (new)
- `src/services/budgetService.ts` (new function)

**Complexity**: L  
**Dependencies**: TASK-2.5, TASK-4.1

---

### TASK-4.3: Implement Grid Cell Selection
**Goal**: Excel-like cell selection  
**Scope**:
- Click to select cell
- Arrow keys to navigate
- Visual selection indicator
- Selected cell state management

**Acceptance Criteria**:
- ✅ User can select cells
- ✅ Arrow keys navigate cells
- ✅ Selection visually indicated

**Likely Areas/Files**:
- `src/components/features/BudgetGrid/PeriodGrid.tsx` (modify)
- `src/components/features/BudgetGrid/GridCell.tsx` (new)

**Complexity**: M  
**Dependencies**: TASK-4.2

---

### TASK-4.4: Implement Frozen Columns/Rows
**Goal**: Keep category name and column headers visible while scrolling  
**Scope**:
- Keep left-most category name column visible (if horizontally scrollable in future)
- Keep column headers visible (Category / Received date / Received amount / Spent amount)
- Scroll content area independently
- Handle scrolling correctly

**Acceptance Criteria**:
- ✅ Category names remain visible while scrolling (as applicable)
- ✅ Column headers stay visible while scrolling
- ✅ Scrolling works smoothly

**Likely Areas/Files**:
- `src/components/features/BudgetGrid/PeriodGrid.tsx` (modify)

**Complexity**: M  
**Dependencies**: TASK-4.2

---

### TASK-4.5: Implement Double-Click to Open Modal
**Goal**: Open transaction modal on double-click  
**Scope**:
- Handle double-click event on cell
- Extract (budget_instance_id + global_category_id) and which column was clicked (received vs spent)
- Open transaction modal
- Pass ids + column context to modal

**Acceptance Criteria**:
- ✅ Double-click opens modal
- ✅ Modal receives correct ids + context (received/spent)
- ✅ Modal loads transactions for that cell

**Likely Areas/Files**:
- `src/components/features/BudgetGrid/PeriodGrid.tsx` (modify)
- `src/components/features/BudgetGrid/CategoryLedgerModal.tsx` (modify)

**Complexity**: S  
**Dependencies**: TASK-4.3, TASK-5.1

---

## Phase 5: Transactions - Double-Click Modal

### TASK-5.1: Update Transaction Modal for Budget Instance Category
**Goal**: Load line items for a category within one budget instance  
**Scope**:
- Modify modal to accept (budget_instance_id + global_category_id) and column context (received vs spent)
- Load line items for that category in that budget instance
- Display transactions in table
- Show total spent

**Acceptance Criteria**:
- ✅ Modal loads line items for the selected category in the current budget instance
- ✅ Transactions displayed correctly
- ✅ Total shown

**Likely Areas/Files**:
- `src/components/features/BudgetGrid/CategoryLedgerModal.tsx` (modify)
- `src-tauri/src/modules/commands/expense.rs` (modify `get_category_ledger` or create new)

**Complexity**: M  
**Dependencies**: TASK-2.4

---

### TASK-5.2: Implement Transaction Entry Form
**Goal**: Add transaction via modal  
**Scope**:
- Transaction form (date, description, amount, type)
- Validation (required fields, amount > 0)
- Save transaction command
- Update grid after save

**Acceptance Criteria**:
- ✅ User can add transaction
- ✅ Validation works
- ✅ Transaction saves
- ✅ Grid updates

**Likely Areas/Files**:
- `src/components/features/BudgetGrid/CategoryLedgerModal.tsx` (modify)
- `src-tauri/src/modules/commands/expense.rs` (modify `add_category_entry`)

**Complexity**: M  
**Dependencies**: TASK-5.1

---

### TASK-5.3: Implement Transaction Edit/Delete
**Goal**: Edit and delete transactions  
**Scope**:
- Edit button on transaction row
- Edit form (pre-filled)
- Update transaction command
- Delete button with confirmation
- Soft delete transaction

**Acceptance Criteria**:
- ✅ User can edit transaction
- ✅ User can delete transaction (with confirmation)
- ✅ Changes reflect in grid

**Likely Areas/Files**:
- `src/components/features/BudgetGrid/CategoryLedgerModal.tsx` (modify)
- `src-tauri/src/modules/commands/expense.rs` (modify update/delete commands)

**Complexity**: M  
**Dependencies**: TASK-5.2

---

## Phase 6: Period Creation Flow

### TASK-6.1: Create Period Creation Form
**Goal**: UI for creating period from template  
**Scope**:
- Period creation modal/form
- Template selection dropdown
- Cadence selection (monthly/biweekly/weekly/daily/yearly/custom)
- Date picker (start date, end date if custom)
- Validation

**Acceptance Criteria**:
- ✅ User can open period creation form
- ✅ User can select template
- ✅ User can select cadence
- ✅ User can enter dates
- ✅ Validation works

**Likely Areas/Files**:
- `src/components/features/BudgetGrid/CreatePeriodForm.tsx` (new)
- `src/components/features/BudgetGrid/PeriodGrid.tsx` (add button)

**Complexity**: M  
**Dependencies**: TASK-3.2

---

### TASK-6.2: Implement Period Creation Backend
**Goal**: Create a period budget instance from a template (one grid view per instance)  
**Scope**:
- `create_period` command
- Copy referenced global categories from template into the budget instance
- Set default amounts
- Set cadence and dates
- Return budget_instance_id

**Acceptance Criteria**:
- ✅ Period created in database
- ✅ Category rows created from template
- ✅ All data copied correctly

**Likely Areas/Files**:
- `src-tauri/src/modules/commands/budget.rs` (new command)
- `src/services/budgetService.ts` (new function)

**Complexity**: M  
**Dependencies**: TASK-2.2, TASK-3.2

---

### TASK-6.3: Update Grid to Show New Period
**Goal**: Open / navigate to the new period budget instance grid  
**Scope**:
- After creating a budget instance, navigate to its grid view
- Ensure the grid header reflects the current period (cadence + date range)
- Ensure category rows load for that instance

**Acceptance Criteria**:
- ✅ App opens the new budget instance grid view
- ✅ Grid header shows cadence and dates
- ✅ Grid displays category rows for that instance

**Likely Areas/Files**:
- `src/components/features/BudgetGrid/PeriodGrid.tsx` (modify)

**Complexity**: S  
**Dependencies**: TASK-6.2, TASK-4.2

---

## Phase 7: Export & Backup

### TASK-7.1: Implement CSV Export Backend
**Goal**: Export data to CSV format  
**Scope**:
- Create `export_to_csv` command
- Query all budget instances, categories, and received/spent line items
- Format as CSV (with headers)
- Return CSV string or write to file

**Acceptance Criteria**:
- ✅ CSV includes all data
- ✅ CSV format valid (opens in Excel)
- ✅ Headers correct

**Likely Areas/Files**:
- `src-tauri/src/modules/commands/export.rs` (new)
- `src/services/exportService.ts` (new)

**Complexity**: M  
**Dependencies**: TASK-2.4

---

### TASK-7.2: Implement CSV Export UI
**Goal**: Export CSV via Settings UI  
**Scope**:
- Export button in Settings
- File picker to save CSV
- Success/error messages
- Loading state

**Acceptance Criteria**:
- ✅ User can click "Export CSV"
- ✅ File picker opens
- ✅ CSV saved
- ✅ Success message shown

**Likely Areas/Files**:
- `src/components/pages/Settings.tsx` (modify)
- `src/components/features/Settings/ExportSettings.tsx` (new)

**Complexity**: S  
**Dependencies**: TASK-7.1

---

### TASK-7.3: Implement Backup Guidance UI
**Goal**: Show backup instructions  
**Scope**:
- Backup section in Settings
- Instructions text
- File location display (clickable)
- Copy file button (optional)

**Acceptance Criteria**:
- ✅ Backup section visible
- ✅ Instructions displayed
- ✅ File location shown
- ✅ User can copy file (optional)

**Likely Areas/Files**:
- `src/components/features/Settings/BackupSettings.tsx` (new)

**Complexity**: S  
**Dependencies**: TASK-1.1

---

## Phase 8: Polish & Testing

### TASK-8.1: Error Handling
**Goal**: Comprehensive error handling  
**Scope**:
- Error messages for all failure cases
- User-friendly error dialogs
- Error logging
- Recovery flows

**Acceptance Criteria**:
- ✅ All errors show user-friendly messages
- ✅ Errors logged
- ✅ User can recover

**Likely Areas/Files**:
- All components (add error handling)
- `src/utils/errorHandler.ts` (new utility)

**Complexity**: M  
**Dependencies**: All previous tasks

---

### TASK-8.2: Internationalization (i18n)
**Goal**: Support English and German  
**Scope**:
- Set up react-i18next
- Create translation files (en.json, de.json)
- Translate UI strings
- Currency formatting (CHF/EUR)
- Language selector in Settings

**Acceptance Criteria**:
- ✅ UI supports EN and DE
- ✅ User can switch language
- ✅ Currency formatted correctly

**Likely Areas/Files**:
- `src/i18n/` (new folder)
- `src/i18n/en.json` (new)
- `src/i18n/de.json` (new)
- All components (add translations)

**Complexity**: M  
**Dependencies**: All UI tasks

---

### TASK-8.3: Testing & Bug Fixes
**Goal**: Test MVP and fix bugs  
**Scope**:
- Manual testing of all flows
- Bug tracking
- Performance testing
- Fix critical bugs

**Acceptance Criteria**:
- ✅ All MVP features tested
- ✅ Critical bugs fixed
- ✅ Performance acceptable

**Likely Areas/Files**:
- Test plan document
- Bug fixes across codebase

**Complexity**: L  
**Dependencies**: All previous tasks

---

## Phase 7.5: Licensing & App Modes (CONFIRMED from LICENSING.md)

### TASK-LIC-1: License State Management
**Goal**: Create Redux slice for license state  
**Scope**:
- Create `licenseSlice.ts` with state: mode, licenseType, licenseId, generation, featureUpdatesUntil
- Add actions for mode switching
- Persist license state across sessions

**Acceptance Criteria**:
- ✅ License state exists in Redux
- ✅ Mode can be switched (full / read-only)
- ✅ License state persists across app restarts

**Likely Areas/Files**:
- `src/store/slices/licenseSlice.ts` (new)
- `src/store/store.ts` (register slice)

**Complexity**: S  
**Dependencies**: None

---

### TASK-LIC-2: Read-Only Mode UI
**Goal**: Implement Read-Only mode visual indicators and behavior  
**Scope**:
- Read-Only banner at top of app
- Disable write buttons/actions when in Read-Only
- Clear messaging about what's disabled
- **Export ALWAYS works** (non-negotiable)

**Acceptance Criteria**:
- ✅ Read-Only banner visible when no valid license
- ✅ Add/edit/delete buttons disabled or hidden
- ✅ **Export works in Read-Only mode** (NON-NEGOTIABLE)
- ✅ View/search/filter works normally
- ✅ Clear "Purchase/Import License" CTA in banner

**Likely Areas/Files**:
- `src/components/common/ReadOnlyBanner.tsx` (new)
- `src/components/common/ModeIndicator.tsx` (new)
- All components with write actions (add conditional disable)

**Complexity**: M  
**Dependencies**: TASK-LIC-1

---

### TASK-LIC-3: License File Import UI
**Goal**: Allow user to import perpetual license file  
**Scope**:
- License section in Settings page
- File picker to select license file
- Display current license status
- Success/error messages

**Acceptance Criteria**:
- ✅ Settings has "License" tab/section
- ✅ User can click "Import License"
- ✅ File picker opens for .json/.lic files
- ✅ License status displayed (plan type, expiry, etc.)

**Likely Areas/Files**:
- `src/components/features/Settings/LicenseSettings.tsx` (new)
- `src/pages/Settings.tsx` (add license section)

**Complexity**: S  
**Dependencies**: TASK-LIC-1

---

### TASK-LIC-4: License Signature Verification (Backend)
**Goal**: Verify license file signature in Rust backend  
**Scope**:
- Parse license file JSON
- Verify Ed25519 signature using embedded public key
- Return license validity and details
- No network required (offline verification)

**Acceptance Criteria**:
- ✅ License file parsed correctly
- ✅ Signature verified using embedded public key
- ✅ Invalid signature rejected
- ✅ Works completely offline

**Likely Areas/Files**:
- `src-tauri/src/modules/commands/license.rs` (new)
- `src-tauri/src/modules/security/license_verify.rs` (new)
- `src-tauri/Cargo.toml` (add ed25519 crate)

**Complexity**: M  
**Dependencies**: None

---

### TASK-LIC-5: Feature Gating by Build Date
**Goal**: Gate features by build release date, not system clock  
**Scope**:
- Add build metadata with deterministic release date
- Implement gating logic: `build_release_date <= feature_updates_until`
- Apply gating to feature-locked components

**Acceptance Criteria**:
- ✅ Build includes release date metadata
- ✅ Gating logic does NOT use system clock
- ✅ Features released after license expiry are disabled
- ✅ Base features always work

**Likely Areas/Files**:
- `src-tauri/build.rs` (generate build metadata)
- `src-tauri/src/modules/license/feature_gate.rs` (new)
- `src/utils/featureGate.ts` (new)

**Complexity**: S  
**Dependencies**: TASK-LIC-4

---

### TASK-LIC-6: Mode-Based Export Access (NON-NEGOTIABLE)
**Goal**: Ensure export is ALWAYS available regardless of mode  
**Scope**:
- Export command available in both Full and Read-Only modes
- Export UI always enabled
- No conditional gating on export

**Acceptance Criteria**:
- ✅ **Export works in Full Mode**
- ✅ **Export works in Read-Only Mode** (NON-NEGOTIABLE)
- ✅ Export never disabled due to license status
- ✅ User can always get their data out

**Likely Areas/Files**:
- `src-tauri/src/modules/commands/export.rs` (verify no mode check)
- `src/components/features/Settings/ExportSettings.tsx` (verify always enabled)

**Complexity**: S  
**Dependencies**: TASK-7.1 (CSV Export Backend), TASK-LIC-2

---

### TASK-LIC-7: Offline Mode Toggle (Perpetual Only)
**Goal**: Allow perpetual license users to disable all network access  
**Scope**:
- Toggle in Settings (only visible with perpetual license)
- When enabled: no server calls for any reason
- Warning dialog before enabling
- Indicator when offline mode is active

**Acceptance Criteria**:
- ✅ Toggle visible only for perpetual license holders
- ✅ Warning shown before enabling
- ✅ No network calls when enabled (verified)
- ✅ "Offline Mode" indicator visible in UI

**Likely Areas/Files**:
- `src/components/features/Settings/OfflineModeToggle.tsx` (new)
- `src/services/networkService.ts` (modify to respect offline mode)

**Complexity**: S  
**Dependencies**: TASK-LIC-1, TASK-LIC-4

**Status**: ⏳ Deferred until post-MVP (low priority; perpetual license works offline by default)

---

### TASK-LIC-8: Old Generation License Banner
**Goal**: Show non-intrusive banner when newer license generation exists  
**Scope**:
- On optional license check (when online), detect outdated generation
- Show dismissible banner
- Do NOT disrupt Full Mode
- Only block feature-update downloads

**Acceptance Criteria**:
- ✅ Banner shown for outdated generation (not error)
- ✅ **Full Mode NOT disrupted** - user continues working
- ✅ Banner actions: "Import" / "Dismiss"
- ✅ Feature-update downloads blocked
- ✅ Offline use continues normally

**Likely Areas/Files**:
- `src/components/common/LicenseUpdateBanner.tsx` (new)
- `src-tauri/src/modules/commands/license.rs` (add check endpoint logic)

**Complexity**: M  
**Dependencies**: TASK-LIC-4

**Status**: ⏳ Deferred until post-MVP (requires server infrastructure)

---

## MVP Licensing Safeguards (Non-Negotiable)

These are not new features but architectural safeguards that MUST be in place to avoid major rework later.

### TASK-SAFEGUARD-1: App Mode Plumbing (Full vs Read-Only)
**Goal**: Ensure app mode state exists and is respected throughout the codebase  
**Scope**:
- Create license state slice with `mode: 'full' | 'read-only'`
- All write actions check mode before proceeding
- Mode can be switched when license is imported/removed

**Why Now**: If we build components without mode awareness, we'll have to retrofit every write action later.

**Acceptance Criteria**:
- ✅ License state exists with mode field
- ✅ Sample write action respects mode (template for others)
- ✅ Mode switching works when license state changes

**Complexity**: S  
**Dependencies**: None (should be early)

---

### TASK-SAFEGUARD-2: Export Always Available
**Goal**: Ensure export command and UI are never gated by license status  
**Scope**:
- Export backend command has NO license checks
- Export UI button is NEVER disabled based on mode
- Add explicit comment in code: "// NON-NEGOTIABLE: Export always available"

**Why Now**: Export is a UX non-negotiable from LICENSING.md. If we accidentally add mode gating, we violate the no-lock-in principle.

**Acceptance Criteria**:
- ✅ Export works in Full Mode
- ✅ Export works in Read-Only Mode
- ✅ Code has explicit documentation

**Complexity**: S  
**Dependencies**: TASK-7.1 (CSV Export Backend)

---

### TASK-SAFEGUARD-3: Database Open/Unlock Never Blocked
**Goal**: Ensure opening and unlocking encrypted database is license-independent  
**Scope**:
- File picker and open flows have NO license checks
- Password unlock has NO license checks
- License state is determined AFTER database is open
- Add explicit comment: "// NON-NEGOTIABLE: DB access never requires license"

**Why Now**: Users must always access their data. If we add license checks to the open flow, we trap user data.

**Acceptance Criteria**:
- ✅ Can open database with no license
- ✅ Can unlock database with no license
- ✅ License state determined after unlock

**Complexity**: S  
**Dependencies**: TASK-1.6 (Database Encryption)

---

## Adjustments / Bugfixes

### TASK-FIX-1: Password Creation Modal Responsive Height ✅ COMPLETED
**Goal**: Fix Password Creation Modal overflow at small window heights (720px)  
**Scope**:
- Make modal content scrollable when viewport height is constrained
- Ensure header remains visible at all times
- Ensure action buttons (Cancel / Create) are always accessible via scroll

**Acceptance Criteria**:
- ✅ No elements cut off at 720px viewport height
- ✅ Form body scrolls when content exceeds available height
- ✅ Buttons accessible (via scroll)

**Likely Areas/Files**:
- `src/components/features/Onboarding/PasswordCreationModal.tsx`

**Complexity**: S  
**Dependencies**: TASK-1.2

#### Implementation Notes
- **Completed on**: 2026-02-06
- **Summary**:
  - Added `max-h-[calc(100vh-2rem)]` and `flex flex-col` to modal container for height constraint
  - Added `overflow-y-auto flex-1 min-h-0` to form element to enable scrolling
  - Added `flex-shrink-0` to header to keep it always visible
- **Files changed**:
  - Modified: `src/components/features/Onboarding/PasswordCreationModal.tsx`
- **Verification**:
  - Run `npm run tauri dev` → Create New Finance File → select location → modal appears
  - Resize window to 720px height → form scrolls, buttons reachable
  - Resize window to normal size → no unnecessary scrollbar

---

### TASK-FIX-2: Close File Button Does Not Close Backend Connection ✅ COMPLETED
**Goal**: Fix "Close File" button to properly close the database connection in the backend  
**Scope**:
- Call `closeDb()` Tauri command when closing a file, not just Redux state reset
- Make `close_db` idempotent (safe to call multiple times)
- Fix error handling to properly display Tauri error strings

**Acceptance Criteria**:
- ✅ After closing a file, user can create a new file
- ✅ After closing a file, user can reopen the same file
- ✅ Errors display actual messages instead of generic fallbacks

**Likely Areas/Files**:
- `src/pages/HomePage.tsx`
- `src-tauri/src/encrypted_db.rs`
- `src/components/features/Onboarding/PasswordCreationModal.tsx`
- `src/components/features/Onboarding/PasswordUnlockModal.tsx`

**Complexity**: S  
**Dependencies**: TASK-1.6

#### Implementation Notes
- **Completed on**: 2026-02-06
- **Summary**:
  - Root cause: `handleCloseFile` only dispatched Redux `closeFile()` but did NOT call `closeDb()` to close the actual Rust database connection
  - Backend `DbState.conn` remained open, causing `AlreadyOpen` errors on subsequent create/open attempts
  - Fixed `handleCloseFile` to call `await closeDb()` before dispatching Redux action
  - Made `close_db_internal` idempotent (succeeds even if no DB is open)
  - Fixed error handling in modals to extract Tauri string errors (not just `Error` objects)
- **Files changed**:
  - Modified: `src/pages/HomePage.tsx` (added async closeDb call before Redux dispatch)
  - Modified: `src-tauri/src/encrypted_db.rs` (made close_db idempotent)
  - Modified: `src/components/features/Onboarding/PasswordCreationModal.tsx` (fixed error extraction)
  - Modified: `src/components/features/Onboarding/PasswordUnlockModal.tsx` (fixed error extraction)
- **Verification**:
  - Run `npm run tauri dev` → Create file → Close file → Create new file → Works
  - Close file → Reopen same file → Works
  - All 21 Rust tests pass

---

## Next Backlog (Post-MVP)

### CSV Import
- Import transactions from CSV
- Validate CSV format
- Map CSV columns to database fields

### PDF Reports
- Generate PDF reports
- Include charts/graphs
- Customizable report templates

### Custom Columns (CONFIRMED - plan for extensibility)
- User-defined columns
- Formula support
- Custom calculations
- **Note**: MVP architecture should be extensible to support this feature (CONFIRMED)

### MacOS/Linux Support
- Extend SQLCipher integration to MacOS
- Extend SQLCipher integration to Linux
- Cross-platform testing

### Locale-Specific Date Formats
- Add locale option for CSV export dates
- Add locale option for UI date display

### Live Currency Conversion Rates
- API integration for real-time exchange rates
- Replace fixed conversion ratio

---

## Future Features / Premium Features (CONFIRMED - OUT OF SCOPE for MVP)

These features were explicitly identified by the user as future premium features. They are OUT OF SCOPE for MVP but documented here for future planning.

### FUTURE-1: Bank Integration (Premium)
**Description**: Connect banking apps like UBS E-banking (read-only) for transaction verification.

**Scope**:
- Read-only connection to banking APIs
- Verify if periodic transactions have gone through
- Auto-import transaction data (date, time, amount, notes)
- Transaction matching with budget entries

**Status**: OUT OF SCOPE for MVP (CONFIRMED)

---

### FUTURE-2: Receipt Scanning (Premium)
**Description**: Photograph receipts and use AI/algorithm to extract data.

**Scope**:
- Camera integration for receipt capture
- OCR or AI-based text extraction
- Auto-populate transaction fields from receipt data
- Store receipt image with transaction

**Status**: OUT OF SCOPE for MVP (CONFIRMED)

---

### FUTURE-3: Cloud Sync (Premium)
**Description**: Server-based storage with account access from anywhere.

**Scope**:
- User account system
- Server-side database storage
- Sync across devices
- User doesn't need to manage file location
- Access from anywhere via account login

**Status**: OUT OF SCOPE for MVP (CONFIRMED)

---

### FUTURE-4: Advanced Reconciliation
**Description**: Bank statement import and transaction matching.

**Scope**:
- Import bank statements (CSV, OFX, QIF)
- Match imported transactions to budget entries
- Reconciliation workflow and status tracking

**Status**: OUT OF SCOPE for MVP (mentioned as premium feature)

---

## References

- See **MVP_PLAN.md** for phase overview
- See **PRODUCT_REQUIREMENTS.md** for requirements
- See **DATA_MODEL.md** for schema details
- See **QUESTIONS_FOR_USER.md** for all confirmed decisions
- See **LICENSING.md** for authoritative licensing spec
- See **LICENSING_SUMMARY.md** for structured licensing summary
