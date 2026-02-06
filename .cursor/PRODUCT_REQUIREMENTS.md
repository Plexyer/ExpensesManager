# Product Requirements - MVP

## MVP Scope (CONFIRMED from reset prompt)

### In Scope ✅

1. **Create/Open Encrypted Finance File**
   - User can create new encrypted finance file
   - User can open existing encrypted finance file
   - Master password creation/unlock flow
   - Portable file (can be moved/copied)

2. **Create Templates (Global Categories + Default Amounts + Cadence)**
   - User creates templates referencing **global categories** (unique per dataset)
   - Each template defines the **period length/cadence** (monthly / biweekly / weekly / daily / yearly / custom)
   - Each category in a template has a **default budgeted amount** for that period
   - Templates can be saved and reused

3. **Create Period from Template**
   - User selects template when creating new period
   - User chooses cadence: monthly / biweekly / weekly / daily / yearly / custom
   - Period is created with envelopes from template
   - Planned amounts copied from template

4. **Log Transactions via Double-Click Modal**
   - Main grid represents **exactly one period budget instance** at a time
   - Grid rows are **budget categories** within the current period budget instance
   - Double-click **Received amount** or **Spent amount** opens a small modal/table with dated line items
   - Each line item has an explicit date (and optionally time) of when money was received/spent
   - Totals roll up into the corresponding grid cell

5. **Rollups in Main Grid (Spent/Remaining Totals)**
   - Columns include: **Received date**, **Received amount total**, **Spent amount total** (and later fields; custom user-defined columns remain out of scope)
   - Rollups update automatically when received/spent line items change

6. **Basic Export (CSV) + Backup Guidance**
   - CSV export of all data
   - Backup guidance (how to backup finance file)

---

## Non-Goals (OUT OF SCOPE for MVP) ❌

1. **Custom User-Defined Columns** - Future feature
2. **Full Reconciliation** (matching bank statements) - Premium future feature
3. **CSV Import** - "Next" backlog
4. **PDF Reports** - "Next" backlog
5. **Advanced Reports** - Future feature
6. **Sync Engine** - Future feature
7. **Multi-User/Profile System** - MVP uses portable files instead
8. **Cloud Sync** - Premium future feature
9. **Bank Sync** - Premium future feature
10. **Receipt Scanning AI/OCR** - Premium future feature
11. **Payment/Purchase Flow** - MVP can use manual license file import
12. **Server Infrastructure** - MVP may use local license file only

---

## Licensing Requirements (CONFIRMED)

See `.cursor/LICENSING.md` for authoritative source and `.cursor/LICENSING_MVP_IMPACTS.md` for MVP scope details.

### MVP Licensing Scope

**In Scope for MVP** (see LICENSING_MVP_IMPACTS.md for details):
- Read-Only mode as default (fallback when no valid license)
- Export ALWAYS available, even in Read-Only (NON-NEGOTIABLE)
- Database open/unlock NEVER blocked by license (NON-NEGOTIABLE)
- Perpetual license file import/validation (offline)
- Full Mode activation with valid license
- Basic license status display in Settings
- App mode state management (Full vs Read-Only)

**Deferred (Post-MVP)** — All licensing questions (LQ1-LQ5) remain OPEN:
- In-app purchase flow (LQ1 open)
- Subscription lease token system (Basic Paid / Premium) (LQ4 open)
- Server-side license issuance
- Recovery secret flow (server-side) (LQ3 open)
- Offline Mode toggle UI
- Premium features (cloud sync, bank sync, receipt AI)
- Old generation license banner (requires server)
- Bugfix distribution mechanics (LQ2 open)

### Licensing User Stories (MVP)

#### LIC-1: Read-Only Mode Access
**As a** user without a valid license  
**I want to** open my encrypted database in Read-Only mode  
**So that** I can always access my data even without purchasing

**Acceptance Criteria**:
- App opens encrypted DB with correct password
- Full view/search/filter/print capabilities
- Export (CSV/JSON) always available
- All write operations disabled with clear messaging
- No "trap screens" that block data access

#### LIC-2: Import Perpetual License File
**As a** user who purchased a perpetual license  
**I want to** import my license file  
**So that** I can unlock Full Mode

**Acceptance Criteria**:
- User can select license file via file picker
- App validates signature using embedded public key
- Valid license → Full Mode enabled
- Invalid/tampered license → error message, remain in Read-Only
- License file can be imported on unlimited devices

#### LIC-3: Full Mode with Valid License
**As a** user with valid perpetual license  
**I want to** use all base features  
**So that** I can fully manage my budget

**Acceptance Criteria**:
- All base features enabled (add/edit/delete data)
- Works fully offline
- License status shown in Settings
- Feature update eligibility checked by build date (not system clock)

#### LIC-4: Export Always Available
**As a** user in any mode  
**I want to** export my data to CSV  
**So that** my data is never locked in

**Acceptance Criteria**:
- Export available in Full Mode
- Export available in Read-Only Mode
- Clear, non-blocking export flow
- **This is a UX non-negotiable**

### Plan Boundaries (CONFIRMED)

| Plan | Base Features | Premium Features | Account Required |
|------|---------------|------------------|------------------|
| Free Viewer | Read-Only | ❌ | ❌ |
| Perpetual Base | Full | ❌ | ❌ |
| Basic Paid | Full | ❌ | ✅ |
| Premium | Full | ✅ (cloud/bank/OCR) | ✅ |

### Feature Gating Rule (CONFIRMED)
- Gate features by `build_release_date <= feature_updates_until`
- **NEVER use system clock** for eligibility (prevents manipulation)
- Build metadata must include deterministic release date

---

## User Stories

### US-1: Create Finance File
**As a** user  
**I want to** create a new encrypted finance file  
**So that** I can start managing my budget securely

**Acceptance Criteria**:
- User clicks "Create New Finance File"
- File picker opens to choose save location
- User enters master password (with confirmation)
- Encrypted SQLite file is created at chosen location
- File opens automatically after creation

**Edge Cases**:
- User cancels file picker → no file created
- Password mismatch → show error, don't create file
- File already exists at location → prompt to overwrite or choose new location

---

### US-2: Open Finance File
**As a** user  
**I want to** open an existing encrypted finance file  
**So that** I can continue managing my budget

**Acceptance Criteria**:
- User clicks "Open Finance File"
- File picker opens to select finance file
- User enters master password
- File unlocks and opens
- Main grid displays (or empty state if no periods)

**Edge Cases**:
- Wrong password → show error, allow retry
- File doesn't exist → show error
- File corrupted → show error with recovery guidance

---

### US-3: Create Template
**As a** user  
**I want to** create a template with envelopes and planned amounts  
**So that** I can reuse it when creating new period budget instances

**Acceptance Criteria**:
- User navigates to Templates page
- User clicks "Create Template"
- User enters template name
- User selects a period cadence/length for the template
- User adds categories (global category, default amount)
- User saves template
- Template appears in template list

**Edge Cases**:
- Empty template name → validation error
- No envelopes added → validation error
- Duplicate envelope name → allow (or show warning)

---

### US-4: Create Period from Template
**As a** user  
**I want to** create a new period from a template  
**So that** I don't have to recreate envelope distributions

**Acceptance Criteria**:
- User clicks "Create Period"
- User selects template from dropdown
- User chooses cadence (monthly/biweekly/weekly/daily/yearly/custom)
- User enters period start date (and end date if custom)
- Period is created with envelopes from template
- Planned amounts copied from template
- App opens the **main grid view for that period budget instance**

**Edge Cases**:
- No templates exist → show message, link to create template
- Custom cadence → user enters start/end dates
- Overlapping periods → allow (or show warning)

---

### US-5: Add Transaction via Double-Click
**As a** user  
**I want to** add transactions by double-clicking a grid cell  
**So that** I can quickly log expenses/income

**Acceptance Criteria**:
- User double-clicks a **Received amount** or **Spent amount** cell in the current period grid
- Modal opens showing a line-item table for that **category within the current period budget instance**
- User can add line items (amount, description, explicit date, optional time)
- Transactions save and modal closes
- Grid cell updates with new total

**Edge Cases**:
- Empty cell (no transactions yet) → modal opens with empty table
- Negative amounts → allow (for refunds/adjustments)
- Future dates → allow (for planned expenses)

---

### US-6: View Rollups in Grid
**As a** user  
**I want to** see rollups (spent/remaining) in the main grid  
**So that** I can track my budget at a glance

**Acceptance Criteria**:
- Main grid shows **categories** as rows
- Columns display at least:
  - Received date (defaults to the period’s income arrival date)
  - Received amount total (sum of received line items)
  - Spent amount total (sum of spent line items)
- Rollups update automatically when line items change

**Edge Cases**:
- Negative remaining → show in red (over budget)
- Zero remaining → show in yellow (at limit)
- No transactions → show 0 spent, full remaining

---

### US-7: Export to CSV
**As a** user  
**I want to** export my data to CSV  
**So that** I can backup or analyze in Excel

**Acceptance Criteria**:
- User clicks "Export CSV"
- File picker opens to choose save location
- CSV file is created with all data (periods, envelopes, transactions)
- User can open CSV in Excel/Google Sheets

**Edge Cases**:
- Empty finance file → export empty CSV (or show message)
- Large dataset → export may take a moment (show progress)

---

### US-8: Backup Guidance
**As a** user  
**I want to** know how to backup my finance file  
**So that** I don't lose my data

**Acceptance Criteria**:
- Settings page has "Backup" section
- Instructions shown: "Copy your finance file to a safe location"
- File location displayed (clickable to open in file explorer)

---

## Edge Cases & Special Scenarios

### Refunds
- **Scenario**: User receives refund for expense
- **Solution**: Add transaction with negative amount (or separate "refund" type)
- **Display**: Negative amount reduces spent total

### Negative Amounts
- **Scenario**: User enters negative transaction
- **Solution**: Allow negative amounts (for refunds, adjustments)
- **Validation**: Warn if negative amount exceeds spent total

### Mixed Currencies
- **Scenario**: User has CHF and EUR envelopes
- **Solution**: MVP supports CHF + EUR (hardcoded)
- **Display**: Show currency symbol in grid (CHF/EUR)
- **Future**: Multi-currency conversion (out of scope for MVP)

### Changing Cadence
- **Scenario**: User wants to change period cadence mid-year
- **Solution**: Template cadence can be changed; each budget instance is one explicit period, so overlap is not an issue
- **Display**: User navigates between period budget instances (one grid view at a time)

### Deleting Items
- **Scenario**: User wants to delete period/envelope/transaction
- **Solution**: 
  - Soft delete transactions (mark as deleted, don't show in grid)
  - Hard delete periods/envelopes (with confirmation)
- **Validation**: Warn if deleting period with transactions

### Empty States
- **No finance file**: Show onboarding (create/open file)
- **No templates**: Show message, link to create template
- **No periods**: Show empty grid with "Create Period" button
- **No transactions**: Show 0 in grid cells

---

## Internationalization (i18n) (CONFIRMED)

### Initial Languages (MVP)
- **English** (EN) - default
- **German** (DE)

### Language Storage (CONFIRMED)
- Language preference stored in **app settings (localStorage)**, NOT in finance file
- Same finance file can be opened in different languages by different users
- UI strings (columns, labels) are translated based on user's language setting

### Initial Currencies (MVP)
- **CHF** (Swiss Franc) - default
- **EUR** (Euro)

### Currency Architecture (CONFIRMED)
- **Template main currency**: Set in template settings (default CHF)
- **Multi-currency per period**: Users can add columns like "Received amount (CHF)", "Received amount (EUR)"
- **Conversion ratio**: FIXED number for MVP (configurable in settings)
- **Post-MVP**: Live conversion rates via API

---

## Performance Requirements (CONFIRMED)

### Grid Performance (CONFIRMED)
- **Target**: Smooth scrolling with large category lists (many rows)
- **Solution**: Virtualization for large lists - render only visible rows (CONFIRMED)
- **Lazy loading**: Load transactions on-demand (when cell opened)

### Database Performance (CONFIRMED)
- **Target**: < 100ms for grid data load (CONFIRMED)
- **Acceptable**: < 500ms for large datasets (CONFIRMED)
- **Loading screens**: REQUIRED for operations that may take time (CONFIRMED)
- **Solution**: Indexes on key columns (period_id, envelope_id, date)
- **Caching**: Cache grid data in Redux, refresh on changes

---

## Security Requirements (CONFIRMED)

### Encryption (CONFIRMED)
- **Database**: SQLCipher via rusqlite feature flag (CONFIRMED)
- **Password**: Master password with Argon2id KDF exclusively (CONFIRMED - no SHA256)
- **Storage**: Salt + KDF params stored in file metadata
- **Target Platform**: Windows 11 only for MVP (CONFIRMED)

### Threat Model
- **Wrong password**: Show error, don't reveal if file exists
- **Brute force**: Rate limiting on unlock attempts
- **Memory exposure**: Clear sensitive data from memory when possible

---

## Accessibility Requirements

### Keyboard Navigation
- **Grid**: Arrow keys to navigate cells
- **Modal**: Tab to navigate fields, Enter to save, Esc to cancel
- **Focus**: Visible focus indicators

### Screen Readers
- **Labels**: All inputs have aria-labels
- **Roles**: Grid has role="grid", cells have role="gridcell"
- **Announcements**: Changes announced (e.g., "Transaction added")

---

## References

- See **UI_FLOWS.md** for user journey flows
- See **UX_INTERACTIONS.md** for interaction patterns
- See **MVP_PLAN.md** for implementation roadmap
