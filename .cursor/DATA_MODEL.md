# Data Model

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

#### `budget_instance_categories`
```sql
CREATE TABLE budget_instance_categories (
    budget_instance_category_id INTEGER PRIMARY KEY AUTOINCREMENT,
    budget_instance_id INTEGER NOT NULL,
    global_category_id INTEGER NOT NULL,
    received_date DATE, -- defaulted from income_arrival_date; editable per category
    default_amount DECIMAL(10,2) NOT NULL DEFAULT 0, -- from template for this period
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (budget_instance_id) REFERENCES period_budget_instances(budget_instance_id) ON DELETE CASCADE,
    FOREIGN KEY (global_category_id) REFERENCES global_categories(global_category_id) ON DELETE CASCADE,
    UNIQUE(budget_instance_id, global_category_id)
);
```
**Purpose**: Category rows for a budget instance (rows reference **global unique categories**)  
**Status**: DRAFT - needs implementation

#### `category_line_items`
```sql
CREATE TABLE category_line_items (
    line_item_id INTEGER PRIMARY KEY AUTOINCREMENT,
    budget_instance_category_id INTEGER NOT NULL,
    kind TEXT NOT NULL, -- 'received' | 'spent'
    occurred_at TEXT NOT NULL, -- ISO8601 datetime; time optional in UI
    description TEXT,
    amount DECIMAL(10,2) NOT NULL,
    notes TEXT,
    deleted_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (budget_instance_category_id) REFERENCES budget_instance_categories(budget_instance_category_id) ON DELETE CASCADE
);
```
**Purpose**: Dated line items that roll up into **Received amount** / **Spent amount** cells for the current budget instance grid  
**Status**: DRAFT - needs implementation

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

### Received/Distributed Date
- **Stored**: `budget_instance_categories.received_date` (defaults to `period_budget_instances.income_arrival_date`)
- **Display**: Format based on user locale (EN/DE)

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

## Currency & Locale (MVP)

### Initial Currencies
- **CHF** (Swiss Franc)
- **EUR** (Euro)

### Storage
- **Option 1**: Store currency per envelope
  ```sql
  ALTER TABLE envelopes ADD COLUMN currency TEXT NOT NULL DEFAULT 'CHF';
  ```
- **Option 2**: Store currency per finance file (global)
  ```sql
  ALTER TABLE finance_files ADD COLUMN default_currency TEXT NOT NULL DEFAULT 'CHF';
  ```

### Initial Languages
- **English** (EN) - default
- **German** (DE)

### Storage
- Store in finance file metadata or user preferences
- Use i18n library (e.g., react-i18next) for translations

---

## Migration Strategy

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
2. Migrate existing unencrypted database to encrypted

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
