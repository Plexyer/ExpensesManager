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

### Global Category
- **Meaning**: A budget category like “Food”, “Rent”, “Fuel”.
- **Constraint**: **Unique per dataset** (the same name/category exists once per finance file).
- **Used by**: Templates and budget instances.

### Template
- **Meaning**: A reusable preset that defines:
  - **Cadence/period length** (monthly/biweekly/weekly/daily/yearly/custom)
  - A set of **references to global categories**
  - A **default amount** per referenced category for that cadence
- **Creates**: A new period budget instance when applied.

### Period Budget Instance (aka “Budget Instance”)
- **Meaning**: A concrete budget for one explicit period (e.g., “January 2026”, “Biweekly #3”).
- **UI**: The **main grid represents exactly one of these at a time**.
- **Period overlap**: Not a special problem (line items are timestamped; each instance has explicit boundaries).

### Budget Category Row (Category-in-Instance)
- **Meaning**: A category row within a specific budget instance.
- **References**: One global category.
- **Columns/fields (MVP)**:
  - Category name (from global category)
  - **Received date** (defaults to the period’s income arrival date)
  - **Received amount** (rollup total of received line items)
  - **Spent amount** (rollup total of spent line items)

### Line Item
- **Meaning**: A dated entry that contributes to Received or Spent amount totals.
- **Kinds**:
  - **Received** line items (money budgeted/saved into the category during the period)
  - **Spent** line items (money spent from the category during the period)
- **Fields**:
  - Date (required)
  - Time (optional)
  - Amount
  - Description/notes (optional)

---

## Relationships (CONFIRMED DESIGN)

```
Finance file (dataset)
  ├── Global Categories (unique)
  ├── Templates
  │     └── TemplateCategoryDefaults (refs global categories + default amounts + cadence)
  └── Period Budget Instances
        └── Budget Category Rows (ref global categories)
              └── Line Items (received/spent; timestamped)
```

---

## Main Grid Mental Model (CONFIRMED DESIGN)

### What the grid is
- A **single** period budget instance view.

### What rows are
- Global categories, as used in the current budget instance (one row per category-in-instance).

### What columns are (MVP)
- Category name
- Received date
- Received amount (double-click opens received line items modal)
- Spent amount (double-click opens spent line items modal)

### Double-click rules
- Double-click **Received amount** → modal shows received line items for that category in the current budget instance.
- Double-click **Spent amount** → modal shows spent line items for that category in the current budget instance.

---

## Mapping to Current Repo (CONFIRMED + GAP)

### CONFIRMED (current repo has)
- A monthly budget concept (`MonthlyBudgets`) in the Rust DB layer.
- Global categories (`global_categories`) and templates (`budget_templates`, `template_categories`) exist.

### GAP (mismatch vs corrected design)
- Templates in current repo schema do not clearly encode cadence/period length (needs confirmation/extension).
- Current UI/data model does not clearly separate **received** vs **spent** line items per category within a budget instance.
- Some existing `.cursor/` docs previously assumed “envelopes × periods” (now corrected).

---

## Open Notes (INTENTIONALLY OPEN)
- Whether template default amounts become initial received line items or remain as targets/reference is documented in `QUESTIONS_FOR_USER.md` (NQ1).
- Whether received date is stored vs derived is documented in `QUESTIONS_FOR_USER.md` (NQ2).
- How to store optional time is documented in `QUESTIONS_FOR_USER.md` (NQ3).

---

## References
- `d:\Projekt\ExpensesManager\.cursor\PRODUCT_REQUIREMENTS.md`
- `d:\Projekt\ExpensesManager\.cursor\UI_FLOWS.md`
- `d:\Projekt\ExpensesManager\.cursor\UX_INTERACTIONS.md`
- `d:\Projekt\ExpensesManager\.cursor\DATA_MODEL.md`
- `d:\Projekt\ExpensesManager\.cursor\QUESTIONS_FOR_USER.md`

