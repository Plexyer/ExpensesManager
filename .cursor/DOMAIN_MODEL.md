# Domain Model (Corrected Design)

## Goal
Define the **domain concepts** and their relationships for the corrected app design:
- **One period budget instance per main grid view**
- **Columns are category fields/rollups within that period**
- **Double-click Received/Spent amount opens dated line items**
- **Categories are global & unique per dataset**
- **Templates define cadence + default amounts and reference global categories**

This file is documentation only. If the repo models things differently today, we call it out as a **GAP** without changing code.

---

## Core Entities (CONFIRMED DESIGN)

### Finance File / Dataset
- **Meaning**: One portable encrypted SQLite file.
- **Contains**: Global categories, templates, and period budget instances.
- **Encryption**: SQLCipher via rusqlite (CONFIRMED)
- **Target Platform**: Windows 11 only for MVP (CONFIRMED)

### Global Category
- **Meaning**: A budget category like "Food", "Rent", "Fuel".
- **Constraint**: **Unique per dataset** (the same name/category exists once per finance file).
- **Used by**: Templates and budget instances.

### Template
- **Meaning**: A reusable preset that defines:
  - **Cadence/period length** (monthly/biweekly/weekly/daily/yearly/custom)
  - **Main currency** (CHF or EUR for MVP) (CONFIRMED)
  - A set of **references to global categories**
  - A **default amount** per referenced category for that cadence
- **Creates**: A new period budget instance when applied.

### Period Budget Instance (aka "Budget Instance")
- **Meaning**: A concrete budget for one explicit period (e.g., "January 2026", "Biweekly #3").
- **UI**: The **main grid represents exactly one of these at a time**.
- **Period overlap**: Not a special problem (line items are timestamped; each instance has explicit boundaries) (CONFIRMED).

### Budget Category Row (Category-in-Instance)
- **Meaning**: A category row within a specific budget instance.
- **References**: One global category.
- **Columns/fields (MVP)**:
  - Category name (from global category)
  - **Received date** (DERIVED - computed from line items, not stored) (CONFIRMED)
  - **Received amount** (rollup total of received line items)
  - **Spent amount** (rollup total of spent line items)

### Line Item
- **Meaning**: A dated entry that contributes to Received or Spent amount totals.
- **Kinds**:
  - **Received** line items (money budgeted/saved into the category during the period)
  - **Spent** line items (money spent from the category during the period)
- **Fields**:
  - Date (required, ISO 8601 format) (CONFIRMED)
  - Time (optional, defaults to 00:00:00 if not provided) (CONFIRMED)
  - Amount
  - Currency (CHF or EUR for MVP) (CONFIRMED)
  - Description/notes (optional)
  - is_template_default (boolean, marks first auto-created received item) (CONFIRMED)

---

## Relationships (CONFIRMED DESIGN)

```
Finance file (dataset)
  ├── Global Categories (unique)
  ├── Templates
  │     └── TemplateCategoryDefaults (refs global categories + default amounts + cadence + currency)
  └── Period Budget Instances
        └── Budget Category Rows (ref global categories)
              └── Line Items (received/spent; timestamped; with currency)
```

---

## Main Grid Mental Model (CONFIRMED DESIGN)

### What the grid is
- A **single** period budget instance view.

### What rows are
- Global categories, as used in the current budget instance (one row per category-in-instance).

### What columns are (MVP)
- Category name
- Received date (DERIVED - shows first/last dates from received line items) (CONFIRMED)
- Received amount (double-click opens received line items modal)
- Spent amount (double-click opens spent line items modal)
- Note: Users can add multi-currency columns like "Received amount (EUR)" (CONFIRMED)

### Double-click rules (CONFIRMED)
- Double-click **Received amount** → modal shows received line items table for that category in the current budget instance.
  - First row is auto-created from template default amount (CONFIRMED)
  - Each row represents money received from various sources
- Double-click **Spent amount** → modal shows spent line items for that category in the current budget instance.

---

## Mapping to Current Repo (CONFIRMED + GAP)

### CONFIRMED (current repo has)
- A monthly budget concept (`MonthlyBudgets`) in the Rust DB layer.
- Global categories (`global_categories`) and templates (`budget_templates`, `template_categories`) exist.

### GAP (implementation needed to match confirmed design)
- Templates need `cadence` and `default_currency` columns added (migration required).
- Need `category_line_items` table with `kind` = 'received' | 'spent' and `currency` field (migration required).
- Need derived "Received date" column (computed from line items, not stored).
- Need multi-currency support with fixed conversion ratio for MVP (API-based rates post-MVP).
- Replace SHA256 with Argon2id for password hashing.
- Need SQLCipher integration for database encryption.

---

## Resolved Decisions (CONFIRMED from user answers)

### NQ1: Template Default Amounts ✅ RESOLVED
**Decision**: Template default amount becomes the FIRST received line item automatically when creating a period from template. Double-clicking "Received amount" opens a small table where each row represents an amount received. The first row (automatic) is the template default.

### NQ2: Received Date Semantics ✅ RESOLVED
**Decision**: "Received date" is a DERIVED column (not stored). It shows the first and last dates when money was received for that budget category, computed from the received line items. If only one line item exists, shows a single date. Format: "YYYY-MM-DD" or "YYYY-MM-DD - YYYY-MM-DD" for range.

### NQ3: Time Storage ✅ RESOLVED
**Decision**: Store as ISO 8601 datetime (e.g., "2026-01-15T00:00:00"). If user doesn't provide time, default to 00:00:00. Time is editable later by the user.

---

## References
- `.cursor/PRODUCT_REQUIREMENTS.md`
- `.cursor/UI_FLOWS.md`
- `.cursor/UX_INTERACTIONS.md`
- `.cursor/DATA_MODEL.md`
- `.cursor/QUESTIONS_FOR_USER.md`
