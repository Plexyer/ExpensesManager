# Domain Model — IMPLEMENTED

## Goal
Define the **domain concepts** and their relationships for the app:
- **One period budget instance per main grid view**
- **Columns are category fields/rollups within that period**
- **Double-click Received/Spent amount opens dated line items**
- **Categories are global & unique per dataset**
- **Templates define cadence + default amounts and reference global categories**
- **Line items can have file attachments (images, PDFs, etc.)**

All entities below are fully implemented. Database schema is at migration v5 (`src-tauri/src/migrations.rs`).

---

## Core Entities (IMPLEMENTED)

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
- **DB Table**: `category_line_items`
- **Kinds**:
  - **Received** line items (money budgeted/saved into the category during the period)
  - **Spent** line items (money spent from the category during the period)
- **Fields**:
  - Date (required, ISO 8601 format)
  - Time (optional, defaults to 00:00:00 if not provided)
  - Amount
  - Currency (CHF or EUR for MVP)
  - Description/notes (optional)
  - is_template_default (boolean, marks first auto-created received item)
- **Attachments**: Each line item can have 0..N file attachments (see Attachment entity)

### Attachment
- **Meaning**: A file attached to a specific line item (receipts, invoices, photos, etc.)
- **DB Table**: `line_item_attachments` (migration v5)
- **Fields**:
  - `id` (INTEGER PRIMARY KEY)
  - `line_item_id` (FK → `category_line_items.id`)
  - `file_name` (TEXT NOT NULL — original filename)
  - `mime_type` (TEXT NOT NULL — detected via `infer` crate)
  - `file_size` (INTEGER NOT NULL — bytes)
  - `file_data` (BLOB NOT NULL — full file content stored in DB)
  - `thumbnail` (BLOB — auto-generated for images via Rust `image` crate; NULL for non-images)
  - `created_at` (TEXT NOT NULL — ISO 8601)
  - `deleted_at` (TEXT — soft-delete timestamp; NULL = active)
- **Indexes**: `idx_attachments_line_item` (line_item_id), `idx_attachments_deleted` (deleted_at)
- **Soft Delete**: Rows with `deleted_at IS NOT NULL` are hidden from queries but retained in the DB
- **Size Limit**: 25 MB soft warning (user can proceed); no hard limit

### UI Settings
- **Meaning**: Key-value store for user preferences (column widths, display options, etc.)
- **DB Table**: `ui_settings` (migration v4)
- **Fields**:
  - `key` (TEXT PRIMARY KEY — e.g., `"column_widths"`, `"show_spent_minus"`)
  - `value` (TEXT NOT NULL — JSON-encoded value)
  - `updated_at` (TEXT NOT NULL — ISO 8601)
- **Accessed via**: `get_ui_setting` / `set_ui_setting` Tauri commands

---

## Relationships (IMPLEMENTED)

```
Finance file (dataset)
  ├── _meta (schema version)
  ├── Global Categories (unique per file)
  ├── Templates
  │     └── Template Categories (refs global categories + default amounts + cadence + currency)
  ├── Period Budget Instances
  │     └── Budget Instance Categories (ref global categories)
  │           └── Line Items (received/spent; timestamped; with currency)
  │                 └── Attachments (0..N per line item; soft-deletable)
  └── UI Settings (key-value pairs for user preferences)
```

### Database Tables (Migration v5)

| Table | Entity | Key Relationships |
|-------|--------|-------------------|
| `_meta` | Schema metadata | `schema_version = 5` |
| `global_categories` | Global Category | Referenced by template_categories + budget_instance_categories |
| `templates` | Template | Has many template_categories |
| `template_categories` | Template Category | FK → templates, FK → global_categories |
| `period_budget_instances` | Period Budget Instance | FK → templates; has many budget_instance_categories |
| `budget_instance_categories` | Budget Category Row | FK → period_budget_instances, FK → global_categories |
| `category_line_items` | Line Item | FK → budget_instance_categories; has many line_item_attachments |
| `line_item_attachments` | Attachment | FK → category_line_items |
| `ui_settings` | UI Settings | Standalone key-value store |

---

## Main Grid Mental Model (IMPLEMENTED)

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

## Implementation Status

All domain entities are fully implemented:

| Entity | DB Table | Tauri Commands | Status |
|--------|----------|----------------|--------|
| Global Category | `global_categories` | CRUD commands | IMPLEMENTED |
| Template | `templates` + `template_categories` | CRUD + reorder | IMPLEMENTED |
| Period Budget Instance | `period_budget_instances` | Create/delete/list | IMPLEMENTED |
| Budget Category Row | `budget_instance_categories` | Auto-created from template | IMPLEMENTED |
| Line Item | `category_line_items` | CRUD via ledger modal | IMPLEMENTED |
| Attachment | `line_item_attachments` | Add/list/get/delete/export | IMPLEMENTED |
| UI Settings | `ui_settings` | get/set key-value | IMPLEMENTED |
| Encryption | SQLCipher + Argon2id | create/open/close DB | IMPLEMENTED |

---

## Resolved Decisions (CONFIRMED from user answers)

### NQ1: Template Default Amounts ✅ RESOLVED
**Decision**: Template default amount becomes the FIRST received line item automatically when creating a period from template. Double-clicking "Received amount" opens a small table where each row represents an amount received. The first row (automatic) is the template default.

### NQ2: Received Date Semantics ✅ RESOLVED
**Decision**: "Received date" is a DERIVED column (not stored). It shows the first and last dates when money was received for that budget category, computed from the received line items. If only one line item exists, shows a single date. Format: "YYYY-MM-DD" or "YYYY-MM-DD - YYYY-MM-DD" for range.

### NQ3: Time Storage ✅ RESOLVED
**Decision**: Store as ISO 8601 datetime (e.g., "2026-01-15T00:00:00"). If user doesn't provide time, default to 00:00:00. Time is editable later by the user.

---

## Licensing Entities (CONFIRMED from LICENSING.md)

### App Mode
- **Meaning**: Current operating mode of the application
- **Values**: `full` | `read-only`
- **Determined by**: License state validation on startup and runtime

### Perpetual License File
- **Meaning**: Portable signed file that grants Full Mode access
- **Fields**:
  - `license_id` (public identifier)
  - `generation` (integer, increments on reissue)
  - `plan_type` = "perpetual"
  - `feature_updates_until` (date)
  - `issued_at` (date)
  - `signature` (Ed25519 or equivalent)
- **Storage**: User-selected location (imported via file picker)
- **Validation**: Offline signature verification using embedded public key

### Recovery Secret
- **Meaning**: Privacy-first mechanism to recover/reissue license without account
- **User receives**: Plaintext secret at purchase time
- **Server stores**: `hash(recovery_secret)` only (Argon2/bcrypt)
- **Flow**: User provides `license_id + recovery_secret` → Server reissues license

### Lease Token (Post-MVP, for Subscriptions)
- **Meaning**: Server-issued token for subscription plans
- **Fields**:
  - `account_id`
  - `subscription_paid_until`
  - `offline_allowed_until` (issued_at + 30 days + grace)
  - `issued_at`
  - `signature`
- **Storage**: OS secure storage (keychain)
- **Refresh**: Required periodically for Full Mode

### Feature Update Eligibility
- **Meaning**: Whether a feature/build is available to a license
- **Logic**: `build_release_date <= feature_updates_until`
- **Constraint**: NEVER use system clock; use build metadata's release date

---

## Relationships (Licensing)

```
App Instance
  ├── License State
  │     ├── Perpetual License File (imported)
  │     │     └── signature verified → Full Mode
  │     └── Lease Token (subscription, post-MVP)
  │           └── valid + not expired → Full Mode
  └── App Mode
        ├── Full Mode → all base features
        └── Read-Only Mode → view + export only
```

---

## References
- `.cursor/PRODUCT_REQUIREMENTS.md`
- `.cursor/UI_FLOWS.md` — User journeys and attachment flows (Flows 13–15)
- `.cursor/UX_INTERACTIONS.md` — Interaction patterns
- `.cursor/DATA_MODEL.md` — SQL schema details and query patterns
- `.cursor/ENCRYPTION_SPEC.md` — File header format, KDF parameters
- `.cursor/GRID_ARCHITECTURE.md` — Grid component hierarchy and column types
- `.cursor/LICENSING.md` — Licensing entity details
- `.cursor/LICENSING_SUMMARY.md`
- `src-tauri/src/migrations.rs` — Database schema migrations v1–v5
