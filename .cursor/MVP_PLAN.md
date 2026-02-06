# MVP Implementation Plan

## Overview

This document outlines the step-by-step implementation plan for the ExpensesManager MVP. Each step includes checkpoints and acceptance criteria.

## Key Confirmed Decisions

| Decision | Status | Details |
|----------|--------|---------|
| Target Platform | CONFIRMED | Windows 11 only for MVP |
| Encryption | CONFIRMED | SQLCipher via rusqlite |
| Password Hashing | CONFIRMED | Argon2id (replacing SHA256) |
| Grid Editing | CONFIRMED | Modal-only (no inline editing) |
| Performance | CONFIRMED | <100ms target, <500ms acceptable, loading screens required |
| Testing | CONFIRMED | Write automated tests during development |
| Multi-currency | CONFIRMED | Fixed conversion ratio, multi-currency columns |
| Virtualization | CONFIRMED | Use for large lists |
| **Licensing** | CONFIRMED | Read-Only mode fallback, export always available |
| **No Lock-In** | CONFIRMED | Users can ALWAYS access data + export |
| **App Modes** | CONFIRMED | Full Mode (with license) / Read-Only Mode (default) |

---

## Phase 1: Foundation - File System & Encryption

### Step 1.1: File Picker Integration
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

**Likely Files**:
- `src/components/Onboarding.tsx` (new)
- `src/services/fileService.ts` (new)
- `src-tauri/src/modules/commands/file.rs` (new)

**Complexity**: S (Small)

---

### Step 1.2: Master Password Flow
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

**Likely Files**:
- `src/components/PasswordModal.tsx` (new)
- `src-tauri/src/modules/commands/security.rs` (modify)
- `src/services/securityService.ts` (new)

**Complexity**: M (Medium)

---

### Step 1.3: Encryption Integration
**Goal**: Integrate SQLCipher or app-level encryption  
**Scope**:
- Research SQLCipher Rust bindings
- Implement key derivation (Argon2id)
- Implement file encryption/decryption
- Test encryption/decryption flow

**Acceptance Criteria**:
- ✅ Database file is encrypted
- ✅ File can be unlocked with correct password
- ✅ Wrong password fails to unlock
- ✅ File can be moved/copied (portable)

**Likely Files**:
- `src-tauri/src/modules/security/encryption.rs` (implement)
- `src-tauri/Cargo.toml` (add dependencies: argon2, sqlcipher or aes-gcm)
- `src-tauri/src/modules/database/mod.rs` (modify for encryption)

**Complexity**: L (Large) - Research required

**Checkpoint**: File system working, encryption integrated, password flow complete

---

## Phase 2: Data Model - Budget Instances & Categories

### Step 2.1: Period Budget Instance Schema
**Goal**: Model a **single budget instance per period** (one grid view per budget instance)  
**Scope**:
- Create a table for period budget instances (cadence, start_date, end_date, template reference)
- Create migration script
- Update backend commands to load/save budget instances

**Acceptance Criteria**:
- ✅ Budget instance table exists with correct schema
- ✅ Migration runs successfully
- ✅ Existing data migrated (if any)

**Likely Files**:
- `src-tauri/migrations/YYYY_MM_create_periods.sql` (new)
- `src-tauri/src/modules/database/mod.rs` (modify)

**Complexity**: M (Medium)

---

### Step 2.2: Budget Category Rows (Per Budget Instance)
**Goal**: Store category rows for a budget instance (rows reference **global categories**)  
**Scope**:
- Create table linking budget instance ↔ global categories, including received_date defaults and template default amounts
- Ensure global categories are unique per dataset (already true in current repo schema)
- Update foreign keys

**Acceptance Criteria**:
- ✅ Budget instance category-row table exists
- ✅ `template_categories` has cadence/default amounts linkage documented (see DATA_MODEL.md)
- ✅ Foreign keys correct

**Likely Files**:
- `src-tauri/migrations/YYYY_MM_create_envelopes.sql` (new)
- `src-tauri/migrations/YYYY_MM_add_account_to_templates.sql` (new)

**Complexity**: M (Medium)

---

### Step 2.3: Received/Spent Line Items Schema
**Goal**: Store **received** and **spent** line items per category within a budget instance  
**Scope**:
- Store line items with explicit date (and optional time)
- Ensure rollups can compute received/spent totals for the current budget instance grid

**Acceptance Criteria**:
- ✅ Line items link to (budget instance + global category)
- ✅ Rollup queries work correctly
- ✅ Existing transactions migrated (if any)

**Likely Files**:
- `src-tauri/migrations/YYYY_MM_update_transactions.sql` (new)
- `src-tauri/src/modules/commands/expense.rs` (modify)

**Complexity**: M (Medium)

**Checkpoint**: Database schema supports budget instances, global categories, and received/spent line items

---

## Phase 3: Templates - Add Cadence / Period Length

### Step 3.1: Template UI - Cadence
**Goal**: Ensure templates define cadence/period length  
**Scope**:
- Add cadence selection to template creation/editing UI
- Store cadence in template schema

**Acceptance Criteria**:
- ✅ User can set cadence (monthly/biweekly/weekly/daily/yearly/custom) per template
- ✅ Cadence saved with template
- ✅ Cadence displayed in template view

**Likely Files**:
- `src/components/features/Templates/TemplatesPage.tsx` (modify)
- `src/types/template.types.ts` (modify)

**Complexity**: S (Small)

---

### Step 3.2: Template → Period Application
**Goal**: Apply template to create period with envelopes  
**Scope**:
- Update `apply_template_to_budget` command (or create new)
- Copy envelopes from template to period
- Copy default amounts

**Acceptance Criteria**:
- ✅ Period created from template includes all referenced categories
- ✅ Default amounts copied from template

**Likely Files**:
- `src-tauri/src/modules/commands/budget.rs` (modify or new command)
- `src/services/budgetService.ts` (modify)

**Complexity**: M (Medium)

**Checkpoint**: Templates include cadence + defaults and can create period budget instances

---

## Phase 4: UI - Single-Period Main Grid

### Step 4.1: Grid Component Architecture
**Goal**: Design grid component structure  
**Scope**:
- Plan grid component hierarchy
- Choose grid library (AG Grid or custom)
- Design columns as category fields/rollups (Category, Received date, Received amount, Spent amount)

**Acceptance Criteria**:
- ✅ Grid component structure planned
- ✅ Grid library chosen
- ✅ Cell rendering design documented

**Likely Files**:
- `src/components/features/BudgetGrid/PeriodGrid.tsx` (new, design doc)

**Complexity**: S (Small) - Planning only

---

### Step 4.2: Grid Data Loading
**Goal**: Load and display **one budget instance** (one period) category grid data  
**Scope**:
- Create command to load grid data for a single budget instance
- Implement rollup calculations (received_total, spent_total)
- Display data in grid

**Acceptance Criteria**:
- ✅ Grid loads budget instance category data
- ✅ Cells show received/spent totals
- ✅ Grid updates when data changes

**Likely Files**:
- `src-tauri/src/modules/commands/budget.rs` (new command: `get_grid_data`)
- `src/components/features/BudgetGrid/PeriodGrid.tsx` (implement)
- `src/services/budgetService.ts` (new function)

**Complexity**: L (Large)

---

### Step 4.3: Grid Interactions
**Goal**: Implement Excel-like grid interactions  
**Scope**:
- Cell selection (click, arrow keys)
- Sticky column headers (within a single budget instance grid)
- Keyboard navigation
- Double-click Received/Spent amount to open modal

**Acceptance Criteria**:
- ✅ User can select cells with mouse/keyboard
- ✅ Frozen columns/rows work
- ✅ Double-click opens transaction modal

**Likely Files**:
- `src/components/features/BudgetGrid/PeriodGrid.tsx` (modify)
- `src/components/features/BudgetGrid/GridCell.tsx` (new)

**Complexity**: M (Medium)

**Checkpoint**: Grid displays one period budget instance, basic interactions work

---

## Phase 5: Transactions - Double-Click Modal

### Step 5.1: Transaction Modal Integration
**Goal**: Open transaction modal on double-click  
**Scope**:
- Connect double-click event to modal
- Pass (budget instance id + category id) + column context (received vs spent) to modal
- Load line items for the selected category within the current budget instance

**Acceptance Criteria**:
- ✅ Double-click cell opens modal
- ✅ Modal shows line items for that category within the current budget instance
- ✅ Modal can add/edit/delete transactions

**Likely Files**:
- `src/components/features/BudgetGrid/PeriodGrid.tsx` (modify)
- `src/components/features/BudgetGrid/CategoryLedgerModal.tsx` (modify or reuse)

**Complexity**: M (Medium)

---

### Step 5.2: Transaction Entry
**Goal**: Add transactions via modal  
**Scope**:
- Line-item form (explicit date, optional time, description, amount)
- Save transaction to database
- Update grid cell after save

**Acceptance Criteria**:
- ✅ User can add transaction in modal
- ✅ Transaction saves to database
- ✅ Grid cell updates with new total

**Likely Files**:
- `src/components/features/BudgetGrid/CategoryLedgerModal.tsx` (modify)
- `src-tauri/src/modules/commands/expense.rs` (modify)

**Complexity**: M (Medium)

---

### Step 5.3: Rollup Updates
**Goal**: Grid cells update automatically when transactions change  
**Scope**:
- Refresh grid data after transaction save
- Update cell display (spent/remaining)
- Handle negative amounts (refunds)

**Acceptance Criteria**:
- ✅ Grid updates after transaction save
- ✅ Spent/remaining totals correct
- ✅ Negative amounts handled (refunds)

**Likely Files**:
- `src/components/features/BudgetGrid/PeriodGrid.tsx` (modify)
- `src/services/budgetService.ts` (modify)

**Complexity**: S (Small)

**Checkpoint**: Double-click opens modal, transactions save, grid updates

---

## Phase 6: Period Creation Flow

### Step 6.1: Period Creation UI
**Goal**: Create period from template UI  
**Scope**:
- Period creation modal/form
- Template selection dropdown
- Cadence selection (monthly/biweekly/weekly/daily/yearly/custom)
- Date picker (start date, end date if custom)

**Acceptance Criteria**:
- ✅ User can open period creation modal
- ✅ User can select template
- ✅ User can select cadence
- ✅ User can enter dates

**Likely Files**:
- `src/components/features/BudgetGrid/CreatePeriodForm.tsx` (new)
- `src/components/features/BudgetGrid/PeriodGrid.tsx` (modify)

**Complexity**: M (Medium)

---

### Step 6.2: Period Creation Backend
**Goal**: Create period with envelopes from template  
**Scope**:
- Create period command
- Copy envelopes from template
- Set default amounts

**Acceptance Criteria**:
- ✅ Period created in database
- ✅ Envelopes created from template
- ✅ Default amounts copied

**Likely Files**:
- `src-tauri/src/modules/commands/budget.rs` (new command: `create_period`)
- `src/services/budgetService.ts` (new function)

**Complexity**: M (Medium)

---

### Step 6.3: Period Display
**Goal**: Open/navigate to the new period budget instance grid  
**Scope**:
- Navigate to the created budget instance grid view
- Display period header (cadence, date range)
- Update grid data loading for that instance

**Acceptance Criteria**:
- ✅ App opens the budget instance grid view
- ✅ Period header shows cadence and dates
- ✅ Grid displays category rows for the budget instance

**Likely Files**:
- `src/components/features/BudgetGrid/PeriodGrid.tsx` (modify)

**Complexity**: S (Small)

**Checkpoint**: User can create periods from templates, periods display in grid

---

## Phase 7: Export & Backup

### Step 7.1: CSV Export Backend
**Goal**: Export data to CSV  
**Scope**:
- Create export command (periods, envelopes, transactions)
- Format data as CSV
- Return CSV string or write to file

**Acceptance Criteria**:
- ✅ Export command returns CSV data
- ✅ CSV includes all periods, envelopes, transactions
- ✅ CSV format is valid (can open in Excel)

**Likely Files**:
- `src-tauri/src/modules/commands/export.rs` (new)
- `src/services/exportService.ts` (new)

**Complexity**: M (Medium)

---

### Step 7.2: CSV Export UI
**Goal**: Export CSV via UI  
**Scope**:
- Export button in Settings
- File picker to save CSV
- Success/error messages

**Acceptance Criteria**:
- ✅ User can click "Export CSV"
- ✅ File picker opens
- ✅ CSV file saved
- ✅ Success message shown

**Likely Files**:
- `src/components/pages/Settings.tsx` (modify)
- `src/components/features/Settings/ExportSettings.tsx` (new)

**Complexity**: S (Small)

---

### Step 7.3: Backup Guidance
**Goal**: Show backup instructions  
**Scope**:
- Backup section in Settings
- Instructions text
- File location display (clickable)
- Copy file button

**Acceptance Criteria**:
- ✅ Backup section visible in Settings
- ✅ Instructions displayed
- ✅ File location shown (clickable)
- ✅ User can copy file

**Likely Files**:
- `src/components/features/Settings/BackupSettings.tsx` (new)

**Complexity**: S (Small)

**Checkpoint**: CSV export works, backup guidance displayed

---

## Phase 7.5: Licensing & App Modes (CONFIRMED from LICENSING.md)

> **Scope Note**: This phase implements ONLY the MVP-relevant licensing requirements. See `.cursor/LICENSING_MVP_IMPACTS.md` for the full breakdown of what's MVP vs deferred. All open licensing questions (LQ1-LQ5) remain deferred until post-MVP.

### Step 7.5.1: App Mode State Management
**Goal**: Implement Full Mode vs Read-Only Mode  
**Scope**:
- Create license state in Redux (mode, licenseType, licenseId, etc.)
- Implement mode switching logic
- Add mode indicator to UI

**Acceptance Criteria**:
- ✅ App tracks current mode (full / read-only)
- ✅ Mode indicator visible in header/footer
- ✅ Mode persists across sessions

**Likely Files**:
- `src/store/slices/licenseSlice.ts` (new)
- `src/components/common/ModeIndicator.tsx` (new)

**Complexity**: S (Small)

**MVP Priority**: HIGH - This is foundational for licensing

---

### Step 7.5.2: Read-Only Mode Behavior
**Goal**: Disable write operations in Read-Only mode  
**Scope**:
- Disable add/edit/delete buttons when read-only
- Show read-only banner
- Ensure export is ALWAYS available (UX non-negotiable)

**Acceptance Criteria**:
- ✅ Write operations disabled in Read-Only mode
- ✅ Clear visual indication of Read-Only state
- ✅ **Export works in Read-Only mode** (NON-NEGOTIABLE)
- ✅ View/search/filter works normally

**Likely Files**:
- All components with write actions (modify)
- `src/components/common/ReadOnlyBanner.tsx` (new)

**Complexity**: M (Medium)

---

### Step 7.5.3: License File Import
**Goal**: Import perpetual license file  
**Scope**:
- File picker to select license file
- Validate signature using embedded public key
- Activate Full Mode on valid license

**Acceptance Criteria**:
- ✅ User can import license file via Settings
- ✅ Valid license activates Full Mode
- ✅ Invalid license shows error, remains Read-Only
- ✅ License details shown in Settings

**Likely Files**:
- `src/components/features/Settings/LicenseSettings.tsx` (new)
- `src-tauri/src/modules/commands/license.rs` (new)
- `src-tauri/src/modules/security/license_verify.rs` (new)

**Complexity**: M (Medium)

---

### Step 7.5.4: Feature Gating Hook (CONFIRMED)
**Goal**: Gate features by build release date  
**Scope**:
- Add build metadata with release date
- Implement feature gating logic: `build_release_date <= feature_updates_until`
- NEVER use system clock for eligibility

**Acceptance Criteria**:
- ✅ Build includes release date metadata
- ✅ Feature gating uses build date (not system clock)
- ✅ Expired feature updates → base features only (no new features)

**Likely Files**:
- `src-tauri/build.rs` (modify for build metadata)
- `src-tauri/src/modules/license/feature_gate.rs` (new)

**Complexity**: S (Small)

**MVP Note**: For MVP, this is a "hook" - the metadata must exist, but actual gating can be minimal since MVP features are all "base" features.

**Checkpoint**: App modes work, license import works, feature gating hook in place

---

### Deferred Licensing (Post-MVP)

The following licensing items are **explicitly deferred** and NOT part of the MVP:

| Item | Reason |
|------|--------|
| Payment/purchase flow | Requires server + payment provider (LQ1 open) |
| Subscription lease tokens | Requires server infrastructure |
| Recovery secret flow | Requires purchase flow (LQ3 open) |
| Offline Mode toggle UI | Low priority; perpetual works offline by default |
| Old generation license banner | Requires server for status check |
| Bugfix distribution mechanics | Policy decision (LQ2 open) |
| Premium features | Explicitly out of scope |

See `.cursor/LICENSING_MVP_IMPACTS.md` for complete details.

---

## Phase 8: Polish & Testing

### Step 8.1: Error Handling
**Goal**: Comprehensive error handling  
**Scope**:
- Error messages for all failure cases
- User-friendly error dialogs
- Logging for debugging

**Acceptance Criteria**:
- ✅ All errors show user-friendly messages
- ✅ Errors logged for debugging
- ✅ User can recover from errors

**Likely Files**:
- All components (add error handling)

**Complexity**: M (Medium)

---

### Step 8.2: Internationalization (i18n)
**Goal**: Support English and German  
**Scope**:
- Set up i18n library (react-i18next)
- Translate UI strings
- Currency formatting (CHF/EUR)

**Acceptance Criteria**:
- ✅ UI supports English and German
- ✅ User can switch language
- ✅ Currency formatted correctly

**Likely Files**:
- `src/i18n/` (new folder)
- All components (add translations)

**Complexity**: M (Medium)

---

### Step 8.3: Automated Testing (CONFIRMED)
**Goal**: Write automated tests during development  
**Scope**:
- Write unit tests for Rust backend commands (CONFIRMED)
- Write integration tests for critical flows (CONFIRMED)
- Write frontend tests for key components (CONFIRMED)
- Manual testing by user for final verification (CONFIRMED)

**Acceptance Criteria**:
- ✅ Automated tests exist for each feature (CONFIRMED - write tests during development)
- ✅ Tests verify features work and prevent regressions
- ✅ All MVP features manually tested by user
- ✅ Critical bugs fixed
- ✅ Performance targets met: <100ms grid load, <500ms acceptable for large datasets (CONFIRMED)

**Likely Files**:
- `src-tauri/src/tests/` (Rust tests)
- `src/__tests__/` (Frontend tests)
- Test plan document

**Complexity**: L (Large)

**Checkpoint**: MVP complete, tested, ready for release

---

## Implementation Order

1. **Phase 1** (Foundation) - Must complete first
2. **Phase 2** (Data Model) - Must complete before UI
3. **Phase 3** (Templates) - Can do in parallel with Phase 4
4. **Phase 4** (Grid UI) - Depends on Phase 2
5. **Phase 5** (Transactions) - Depends on Phase 4
6. **Phase 6** (Period Creation) - Depends on Phase 3 and 4
7. **Phase 7** (Export) - Can do anytime after Phase 2; **NON-NEGOTIABLE for MVP**
8. **Phase 7.5** (Licensing) - Should be early; Read-Only mode + Export is baseline
9. **Phase 8** (Polish) - Final phase

**Note**: Phase 7 (Export) and Phase 7.5 (Licensing/Read-Only mode) are **non-negotiable** for MVP. Export must always work, and Read-Only mode is the default fallback.

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
✅ **App runs in Read-Only mode by default (no license)**  
✅ **User can import perpetual license file to unlock Full Mode**  
✅ **Export is ALWAYS available, even in Read-Only mode**  
✅ **Feature gating uses build date, not system clock**  

---

## References

- See **BACKLOG.md** for detailed task breakdown
- See **PRODUCT_REQUIREMENTS.md** for requirements
- See **DATA_MODEL.md** for schema details
- See **LICENSING.md** for authoritative licensing spec
