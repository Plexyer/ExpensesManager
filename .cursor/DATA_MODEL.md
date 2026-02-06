# Data Model

## Key Decisions (CONFIRMED from user answers)

| Decision | Status | Details |
|----------|--------|---------|
| Time Storage | CONFIRMED | ISO 8601 datetime, default 00:00:00 if time not provided |
| Received Date | CONFIRMED | DERIVED column (computed from line items' first/last dates) |
| Template Defaults | CONFIRMED | Become FIRST received line item when creating period |
| Currency | CONFIRMED | Multi-currency via additional columns, fixed conversion for MVP |
| Single File | CONFIRMED | One file per app instance for MVP |
| **Stub File Format** | CONFIRMED | Temporary JSON format for MVP testing (see below) |

---

## Temporary Stub File Format (MVP Testing Only)

> **⚠️ MVP STUB ONLY**: Before SQLCipher is implemented, we use a plaintext JSON stub file to test create/open/unlock flows.

**Full specification**: See `.cursor/FINANCEDB_STUB_SPEC.md`

### Schema Summary

```json
{
  "format": "financedb_stub",
  "version": 1,
  "created_at": "2026-02-06T14:30:00Z",
  "master_password": "<PLAINTEXT_FOR_MVP_ONLY>",
  "password_hint": "<optional string>",
  "metadata": {
    "app_version": "0.1.0",
    "platform": "windows"
  }
}
```

### Purpose
- Enable testing of UI flows before SQLCipher implementation
- Verify file picker → password modal → unlock flow works end-to-end
- Allow development of features that require an "open" file state

### Limitations
- **NO financial data storage** (just auth info)
- **Plaintext passwords** (insecure, testing only)
- **Will be replaced** by SQLCipher encrypted SQLite

### Migration
When SQLCipher is ready, stub files become obsolete. Users create new encrypted files. No data migration needed since stub files contain no financial data.

## Current Schema (CONFIRMED from database/mod.rs and migrations)

### Core Tables

#### `MonthlyBudgets`
```sql
CREATE TABLE MonthlyBudgets (
    budget_id INTEGER PRIMARY KEY AUTOINCREMENT,
    month INTEGER NOT NULL,
    year INTEGER NOT NULL,
    total_income REAL NOT NULL,
    template_id INTEGER REFERENCES budget_templates(template_id),
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    finished_at TEXT,
    name TEXT,
    last_edited TEXT,
    first_finished_at TEXT,
    UNIQUE(month, year)
);
```
**Purpose**: Stores monthly budgets (month/year based)  
**MVP Status**: Needs modification for period-based system

#### `budget_categories`
```sql
CREATE TABLE budget_categories (
    category_id INTEGER PRIMARY KEY AUTOINCREMENT,
    budget_id INTEGER NOT NULL,
    global_category_id INTEGER NOT NULL,
    category_name TEXT NOT NULL,
    allocated_amount DECIMAL(10,2) DEFAULT 0,
    category_type TEXT NOT NULL DEFAULT 'expense',
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (budget_id) REFERENCES MonthlyBudgets(budget_id) ON DELETE CASCADE,
    FOREIGN KEY (global_category_id) REFERENCES global_categories(global_category_id) ON DELETE CASCADE,
    UNIQUE(budget_id, global_category_id)
);
```
**Purpose**: Categories linked to budgets (envelopes)  
**MVP Status**: Can be adapted for envelope system

#### `expenses`
```sql
CREATE TABLE expenses (
    expense_id INTEGER PRIMARY KEY AUTOINCREMENT,
    category_id INTEGER NOT NULL,
    entry_type TEXT NOT NULL DEFAULT 'expense', -- 'expense'|'income'|'adjustment'
    description TEXT NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    date DATE NOT NULL,
    place TEXT,
    notes TEXT,
    deleted_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (category_id) REFERENCES budget_categories(category_id) ON DELETE CASCADE
);
```
**Purpose**: Transaction entries (expenses/income)  
**MVP Status**: Can be adapted, needs period_id link

#### `budget_templates`
```sql
CREATE TABLE budget_templates (
    template_id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT,
    -- GAP: corrected design requires cadence/period length per template; current schema does not include it
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```
**Purpose**: Template definitions  
**MVP Status**: ✅ Exists, needs cadence/period length added (GAP vs corrected design)

#### `template_categories`
```sql
CREATE TABLE template_categories (
    template_category_id INTEGER PRIMARY KEY AUTOINCREMENT,
    template_id INTEGER NOT NULL,
    global_category_id INTEGER NOT NULL,
    allocated_amount DECIMAL(10,2) DEFAULT 0,
    category_type TEXT NOT NULL DEFAULT 'expense',
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (template_id) REFERENCES budget_templates(template_id) ON DELETE CASCADE,
    FOREIGN KEY (global_category_id) REFERENCES global_categories(global_category_id) ON DELETE CASCADE,
    UNIQUE(template_id, global_category_id)
);
```
**Purpose**: Template → global category mappings  
**MVP Status**: ✅ Exists, aligned for defaults; cadence lives on template (GAP vs corrected design)

#### `global_categories`
```sql
CREATE TABLE global_categories (
    global_category_id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```
**Purpose**: Reusable category definitions  
**MVP Status**: ✅ Exists

#### `BudgetChangeHistory`
```sql
CREATE TABLE BudgetChangeHistory (
    change_id INTEGER PRIMARY KEY AUTOINCREMENT,
    budget_id INTEGER NOT NULL,
    change_type TEXT NOT NULL, -- 'field_change', 'status_change', 'creation'
    field_name TEXT,
    old_value TEXT,
    new_value TEXT,
    change_description TEXT,
    changed_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (budget_id) REFERENCES MonthlyBudgets(budget_id) ON DELETE CASCADE
);
```
**Purpose**: Audit trail for budget changes  
**MVP Status**: Can be adapted for period changes

---

## Proposed MVP Schema (DRAFT)

### New Tables

#### `period_budget_instances`
```sql
CREATE TABLE period_budget_instances (
    budget_instance_id INTEGER PRIMARY KEY AUTOINCREMENT,
    cadence TEXT NOT NULL, -- 'monthly', 'biweekly', 'weekly', 'daily', 'yearly', 'custom'
    start_date DATE NOT NULL,
    end_date DATE, -- required for 'custom'
    template_id INTEGER REFERENCES budget_templates(template_id),
    income_arrival_date DATE, -- used as default for per-category received_date (optional)
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```
**Purpose**: One **budget instance per explicit period** (the main grid represents exactly one of these at a time)  
**Status**: DRAFT - needs implementation

#### `budget_instance_categories` (CONFIRMED SCHEMA)
```sql
CREATE TABLE budget_instance_categories (
    budget_instance_category_id INTEGER PRIMARY KEY AUTOINCREMENT,
    budget_instance_id INTEGER NOT NULL,
    global_category_id INTEGER NOT NULL,
    -- NOTE: received_date is DERIVED (computed), not stored (CONFIRMED)
    -- It shows first/last dates from received line items
    default_amount DECIMAL(10,2) NOT NULL DEFAULT 0, -- from template for this period
    default_currency TEXT NOT NULL DEFAULT 'CHF', -- CONFIRMED: template main currency
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (budget_instance_id) REFERENCES period_budget_instances(budget_instance_id) ON DELETE CASCADE,
    FOREIGN KEY (global_category_id) REFERENCES global_categories(global_category_id) ON DELETE CASCADE,
    UNIQUE(budget_instance_id, global_category_id)
);
```
**Purpose**: Category rows for a budget instance (rows reference **global unique categories**)  
**Status**: CONFIRMED - ready for implementation

**Key Decisions (CONFIRMED)**:
- `received_date`: NOT stored in table. DERIVED from line items (CONFIRMED). Shows first and last dates from received line items. If only one line item, shows single date.
- `default_currency`: Template's main currency setting (CONFIRMED)

#### `category_line_items` (CONFIRMED SCHEMA)
```sql
CREATE TABLE category_line_items (
    line_item_id INTEGER PRIMARY KEY AUTOINCREMENT,
    budget_instance_category_id INTEGER NOT NULL,
    kind TEXT NOT NULL, -- 'received' | 'spent'
    occurred_at TEXT NOT NULL, -- ISO 8601 datetime (CONFIRMED: default time 00:00:00 if not provided)
    description TEXT,
    amount DECIMAL(10,2) NOT NULL,
    currency TEXT NOT NULL DEFAULT 'CHF', -- CONFIRMED: multi-currency support
    notes TEXT,
    is_template_default BOOLEAN DEFAULT FALSE, -- CONFIRMED: marks first auto-created received item from template
    deleted_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (budget_instance_category_id) REFERENCES budget_instance_categories(budget_instance_category_id) ON DELETE CASCADE
);
```
**Purpose**: Dated line items that roll up into **Received amount** / **Spent amount** cells for the current budget instance grid  
**Status**: CONFIRMED - ready for implementation

**Key Decisions (CONFIRMED)**:
- `occurred_at`: ISO 8601 datetime format. If user doesn't provide time, default to 00:00:00 (CONFIRMED)
- `is_template_default`: When creating period from template, first received line item is auto-created with template's default amount and this flag set to TRUE (CONFIRMED)
- `currency`: Each line item can have its own currency (CHF/EUR for MVP) (CONFIRMED)

### Modified Tables

#### `budget_templates` (add cadence/period length)
```sql
-- Migration: Add cadence to templates (corrected design requirement)
ALTER TABLE budget_templates ADD COLUMN cadence TEXT NOT NULL DEFAULT 'monthly';
```
**Purpose**: Templates define cadence/period length  
**Status**: DRAFT - needs migration

---

## Data Relationships (MVP)

### Finance File → Budget Instances → Category Rows → Line Items
```
finance file (the encrypted SQLite file)
  └── period_budget_instances (one budget instance per explicit period)
       └── budget_instance_categories (rows; reference global_categories)
            └── category_line_items (received/spent line items)
```

### Templates → Envelopes
```
budget_templates
  └── template_categories (envelopes in template)
       └── global_categories (reusable category definitions)
```

---

## Rollup Calculations (MVP)

### Received/Spent Totals (per category row in one budget instance)
```sql
SELECT 
    budget_instance_category_id,
    SUM(CASE WHEN kind = 'received' THEN amount ELSE 0 END) as received_total,
    SUM(CASE WHEN kind = 'spent' THEN amount ELSE 0 END) as spent_total
FROM category_line_items
WHERE budget_instance_category_id = ? AND deleted_at IS NULL
GROUP BY budget_instance_category_id;
```

### Remaining Amount
```sql
SELECT 
    bic.budget_instance_category_id,
    bic.default_amount,
    COALESCE(SUM(CASE WHEN li.kind = 'spent' THEN li.amount ELSE 0 END), 0) as spent_total,
    (bic.default_amount - COALESCE(SUM(CASE WHEN li.kind = 'spent' THEN li.amount ELSE 0 END), 0)) as remaining
FROM budget_instance_categories bic
LEFT JOIN category_line_items li ON li.budget_instance_category_id = bic.budget_instance_category_id
    AND li.deleted_at IS NULL
WHERE bic.budget_instance_id = ?
GROUP BY bic.budget_instance_category_id;
```

### Received Date (CONFIRMED - DERIVED)
- **NOT stored**: Computed from line items (CONFIRMED)
- **Query**: Get MIN and MAX occurred_at from received line items for this category
- **Display**: 
  - Single date if only one received line item: "YYYY-MM-DD"
  - Date range if multiple: "YYYY-MM-DD - YYYY-MM-DD"
  - Empty if no received line items
- **Format**: ISO format, displayed based on user locale (EN/DE)

```sql
-- Query to get received date range for a category
SELECT 
    budget_instance_category_id,
    MIN(DATE(occurred_at)) as first_received_date,
    MAX(DATE(occurred_at)) as last_received_date,
    COUNT(*) as received_count
FROM category_line_items
WHERE budget_instance_category_id = ? 
    AND kind = 'received' 
    AND deleted_at IS NULL
GROUP BY budget_instance_category_id;
```

---

## Indexes (Performance)

### Recommended Indexes
```sql
-- Budget instance lookups
CREATE INDEX idx_budget_instances_start_date ON period_budget_instances(start_date);
CREATE INDEX idx_budget_instances_cadence ON period_budget_instances(cadence);

-- Category row lookups
CREATE INDEX idx_bic_budget_instance_id ON budget_instance_categories(budget_instance_id);
CREATE INDEX idx_bic_global_category_id ON budget_instance_categories(global_category_id);

-- Line item lookups
CREATE INDEX idx_line_items_bic_id ON category_line_items(budget_instance_category_id);
CREATE INDEX idx_line_items_occurred_at ON category_line_items(occurred_at);
CREATE INDEX idx_line_items_not_deleted ON category_line_items(line_item_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_line_items_kind ON category_line_items(kind);
```

---

## Currency & Locale (CONFIRMED)

### Initial Currencies (MVP)
- **CHF** (Swiss Franc) - default
- **EUR** (Euro)

### Currency Storage (CONFIRMED)
- **Template main currency**: Stored in `budget_templates.default_currency` (CONFIRMED)
- **Line item currency**: Each line item can have its own currency (CONFIRMED)
- **Multi-currency columns**: Users can add columns like "Received amount (CHF)", "Received amount (EUR)" (CONFIRMED)
- **Conversion ratio**: FIXED number stored in app settings for MVP (CONFIRMED)
- **Post-MVP**: Live conversion rates via API

```sql
-- Template level currency
ALTER TABLE budget_templates ADD COLUMN default_currency TEXT NOT NULL DEFAULT 'CHF';

-- App settings for conversion (stored in localStorage or separate settings table)
-- Example: { "CHF_EUR": 0.95, "EUR_CHF": 1.05 }
```

### Initial Languages (MVP)
- **English** (EN) - default
- **German** (DE)

### Language Storage (CONFIRMED)
- **Location**: App settings (localStorage), NOT in finance file (CONFIRMED)
- Same finance file can be opened in different languages by different users
- Use react-i18next for translations

---

## Migration Strategy

### Phase 0: Stub File Format (MVP Testing Only)

Before real data storage, we use a temporary JSON stub file format for testing UI flows.

**Stub File Schema**:
```json
{
  "format": "financedb_stub",
  "version": 1,
  "created_at": "2026-02-06T14:30:00Z",
  "master_password": "plaintext_password",
  "password_hint": "optional hint"
}
```

**⚠️ WARNING**: Stub files store passwords in PLAINTEXT. For testing only.

**Stub → SQLCipher Migration**:
- Stub files contain no financial data (just auth info for testing)
- When SQLCipher is implemented (Phase 4), users create new real files
- Old stub files become obsolete (no data migration needed)
- See `.cursor/FINANCEDB_STUB_SPEC.md` for full specification

### Phase 1: Add Period System
1. Create `period_budget_instances` table
2. Create `budget_instance_categories` table
3. Migrate existing `MonthlyBudgets` → `period_budget_instances` (if data exists)
4. Migrate existing `budget_categories` → `budget_instance_categories`

### Phase 2: Template Cadence
1. Add `cadence` to `budget_templates` (corrected design requirement)

### Phase 3: Update Transactions
1. Create `category_line_items` table (received/spent)
2. Migrate existing `expenses` → `category_line_items` (as 'spent') if needed

### Phase 4: Encryption
1. Add encryption support (SQLCipher or app-level)
2. Replace stub file format with real encrypted SQLite
3. New files created as encrypted DB (not stub JSON)
4. Stub files from Phase 0 become obsolete

---

## Data Integrity Rules

### Invariants
1. **Envelope planned_amount** ≥ 0 (can be 0)
2. **Transaction amount** can be negative (for refunds)
3. **Period start_date** < end_date (if custom cadence)
4. **Transaction date** can be future (for planned expenses)
5. **Soft delete**: Transactions marked `deleted_at IS NOT NULL` don't count in rollups

### Constraints
- `UNIQUE(budget_instance_id, global_category_id)` on budget_instance_categories (one row per category per budget instance)
- `UNIQUE(template_id, global_category_id)` on template_categories
- Foreign keys with `ON DELETE CASCADE` for data consistency

---

## References

- See **ENCRYPTION_SPEC.md** for encryption details
- See **MVP_PLAN.md** for implementation roadmap
- See current schema in `src-tauri/src/modules/database/mod.rs`
