# Data Model

> **Status**: IMPLEMENTED (Schema Version 5)  
> **Last Updated**: 2026-02-15  
> **Source of Truth**: `src-tauri/src/migrations.rs`

---

## Key Decisions

| Decision | Status | Details |
|----------|--------|---------|
| Time Storage | IMPLEMENTED | ISO 8601 datetime via `TEXT` columns; default `datetime('now')` |
| Received Date | IMPLEMENTED | DERIVED column — computed from line items' min/max `occurred_at` |
| Template Defaults | IMPLEMENTED | Become first received line item (flagged `is_template_default = 1`) when creating a period |
| Currency | IMPLEMENTED | Per-line-item currency (`CHF` default); template-level `default_currency` |
| Single File | IMPLEMENTED | One encrypted SQLite file per dataset; multi-dataset via separate files |
| Encryption | IMPLEMENTED | SQLCipher with Argon2id KDF; see ENCRYPTION_SPEC.md |
| Attachment Storage | IMPLEMENTED | BLOB columns in SQLCipher-encrypted DB; thumbnails for images |
| Schema Versioning | IMPLEMENTED | `_meta` table with `schema_version` key; auto-migration on open |

---

## Database Tables (9 tables at v5)

### 1. `_meta`

**Introduced:** Database creation (in `encrypted_db.rs`)  
**Purpose:** Key-value metadata store for schema versioning and file metadata.

```sql
CREATE TABLE IF NOT EXISTS _meta (
    key   TEXT PRIMARY KEY,
    value TEXT NOT NULL
);
```

| Column | Type | Constraints | Description |
|--------|------|------------|-------------|
| `key` | TEXT | PRIMARY KEY | Metadata key (e.g., `schema_version`, `created_at`, `format_version`) |
| `value` | TEXT | NOT NULL | Metadata value |

**Standard keys:**
- `schema_version` — current migration version (e.g., `"5"`)
- `created_at` — ISO 8601 datetime of file creation
- `format_version` — file format version (`"1"`)

---

### 2. `global_categories`

**Introduced:** Migration v1  
**Purpose:** Reusable category/envelope definitions, unique per dataset.

```sql
CREATE TABLE IF NOT EXISTS global_categories (
    global_category_id INTEGER PRIMARY KEY AUTOINCREMENT,
    name               TEXT    NOT NULL UNIQUE,
    description        TEXT,
    created_at         TEXT    NOT NULL DEFAULT (datetime('now')),
    updated_at         TEXT    NOT NULL DEFAULT (datetime('now'))
);
```

| Column | Type | Constraints | Description |
|--------|------|------------|-------------|
| `global_category_id` | INTEGER | PK, AUTOINCREMENT | Unique category ID |
| `name` | TEXT | NOT NULL, UNIQUE | Category name (globally unique per file) |
| `description` | TEXT | — | Optional description |
| `created_at` | TEXT | NOT NULL, DEFAULT now | Creation timestamp |
| `updated_at` | TEXT | NOT NULL, DEFAULT now | Last modification timestamp |

---

### 3. `budget_templates`

**Introduced:** Migration v1  
**Purpose:** Template definitions — define cadence (period length) and default currency for budget periods.

```sql
CREATE TABLE IF NOT EXISTS budget_templates (
    template_id      INTEGER PRIMARY KEY AUTOINCREMENT,
    name             TEXT    NOT NULL,
    description      TEXT,
    cadence          TEXT    NOT NULL DEFAULT 'monthly',
    default_currency TEXT    NOT NULL DEFAULT 'CHF',
    created_at       TEXT    NOT NULL DEFAULT (datetime('now')),
    updated_at       TEXT    NOT NULL DEFAULT (datetime('now'))
);
```

| Column | Type | Constraints | Description |
|--------|------|------------|-------------|
| `template_id` | INTEGER | PK, AUTOINCREMENT | Unique template ID |
| `name` | TEXT | NOT NULL | Template name |
| `description` | TEXT | — | Optional description |
| `cadence` | TEXT | NOT NULL, DEFAULT `'monthly'` | Period cadence: `monthly`, `biweekly`, `weekly`, `daily`, `yearly`, `custom` |
| `default_currency` | TEXT | NOT NULL, DEFAULT `'CHF'` | Default currency for new periods |
| `created_at` | TEXT | NOT NULL, DEFAULT now | Creation timestamp |
| `updated_at` | TEXT | NOT NULL, DEFAULT now | Last modification timestamp |

---

### 4. `template_categories`

**Introduced:** Migration v1  
**Purpose:** Links templates to global categories with default allocated amounts and sort order.

```sql
CREATE TABLE IF NOT EXISTS template_categories (
    template_category_id INTEGER PRIMARY KEY AUTOINCREMENT,
    template_id          INTEGER NOT NULL,
    global_category_id   INTEGER NOT NULL,
    allocated_amount     REAL    DEFAULT 0,
    category_type        TEXT    NOT NULL DEFAULT 'expense',
    sort_order           INTEGER DEFAULT 0,
    created_at           TEXT    NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (template_id)        REFERENCES budget_templates(template_id) ON DELETE CASCADE,
    FOREIGN KEY (global_category_id) REFERENCES global_categories(global_category_id) ON DELETE CASCADE,
    UNIQUE(template_id, global_category_id)
);
```

| Column | Type | Constraints | Description |
|--------|------|------------|-------------|
| `template_category_id` | INTEGER | PK, AUTOINCREMENT | Unique link ID |
| `template_id` | INTEGER | NOT NULL, FK CASCADE | Parent template |
| `global_category_id` | INTEGER | NOT NULL, FK CASCADE | Referenced global category |
| `allocated_amount` | REAL | DEFAULT 0 | Default budgeted amount for this category |
| `category_type` | TEXT | NOT NULL, DEFAULT `'expense'` | Category type |
| `sort_order` | INTEGER | DEFAULT 0 | Display order within template |
| `created_at` | TEXT | NOT NULL, DEFAULT now | Creation timestamp |

**Constraints:** `UNIQUE(template_id, global_category_id)` — one entry per category per template.

---

### 5. `period_budget_instances`

**Introduced:** Migration v1  
**Purpose:** One budget instance per explicit period. The main grid represents exactly one of these at a time.

```sql
CREATE TABLE IF NOT EXISTS period_budget_instances (
    budget_instance_id  INTEGER PRIMARY KEY AUTOINCREMENT,
    cadence             TEXT    NOT NULL,
    start_date          TEXT    NOT NULL,
    end_date            TEXT,
    template_id         INTEGER,
    income_arrival_date TEXT,
    created_at          TEXT    NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (template_id) REFERENCES budget_templates(template_id)
);
```

| Column | Type | Constraints | Description |
|--------|------|------------|-------------|
| `budget_instance_id` | INTEGER | PK, AUTOINCREMENT | Unique period ID |
| `cadence` | TEXT | NOT NULL | Period cadence (copied from template) |
| `start_date` | TEXT | NOT NULL | Period start date (ISO 8601) |
| `end_date` | TEXT | — | Period end date (required for `custom` cadence) |
| `template_id` | INTEGER | FK (no cascade) | Template used to create this period |
| `income_arrival_date` | TEXT | — | Default income arrival date for the period |
| `created_at` | TEXT | NOT NULL, DEFAULT now | Creation timestamp |

---

### 6. `budget_instance_categories`

**Introduced:** Migration v2  
**Purpose:** Envelope rows for each period's grid. Links a budget instance to global categories with default amounts copied from the template.

```sql
CREATE TABLE IF NOT EXISTS budget_instance_categories (
    budget_instance_category_id INTEGER PRIMARY KEY AUTOINCREMENT,
    budget_instance_id          INTEGER NOT NULL,
    global_category_id          INTEGER NOT NULL,
    default_amount              REAL    NOT NULL DEFAULT 0,
    default_currency            TEXT    NOT NULL DEFAULT 'CHF',
    sort_order                  INTEGER DEFAULT 0,
    created_at                  TEXT    NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (budget_instance_id) REFERENCES period_budget_instances(budget_instance_id) ON DELETE CASCADE,
    FOREIGN KEY (global_category_id) REFERENCES global_categories(global_category_id) ON DELETE CASCADE,
    UNIQUE(budget_instance_id, global_category_id)
);
```

| Column | Type | Constraints | Description |
|--------|------|------------|-------------|
| `budget_instance_category_id` | INTEGER | PK, AUTOINCREMENT | Unique envelope row ID |
| `budget_instance_id` | INTEGER | NOT NULL, FK CASCADE | Parent period |
| `global_category_id` | INTEGER | NOT NULL, FK CASCADE | Referenced global category |
| `default_amount` | REAL | NOT NULL, DEFAULT 0 | Budgeted amount (from template) |
| `default_currency` | TEXT | NOT NULL, DEFAULT `'CHF'` | Currency for default amount |
| `sort_order` | INTEGER | DEFAULT 0 | Display order in grid |
| `created_at` | TEXT | NOT NULL, DEFAULT now | Creation timestamp |

**Constraints:** `UNIQUE(budget_instance_id, global_category_id)` — one row per category per period.

**Note:** `received_date` is NOT stored. It is DERIVED (computed) from `category_line_items` where `kind = 'received'`.

---

### 7. `category_line_items`

**Introduced:** Migration v3  
**Purpose:** Received/spent transaction entries per category envelope. These roll up into the "Received Amount" and "Spent Amount" columns in the main grid.

```sql
CREATE TABLE IF NOT EXISTS category_line_items (
    line_item_id                INTEGER PRIMARY KEY AUTOINCREMENT,
    budget_instance_category_id INTEGER NOT NULL,
    kind                        TEXT    NOT NULL CHECK (kind IN ('received', 'spent')),
    occurred_at                 TEXT    NOT NULL,
    description                 TEXT,
    amount                      REAL    NOT NULL,
    currency                    TEXT    NOT NULL DEFAULT 'CHF',
    notes                       TEXT,
    is_template_default         INTEGER NOT NULL DEFAULT 0,
    deleted_at                  TEXT    NULL,
    created_at                  TEXT    NOT NULL DEFAULT (datetime('now')),
    updated_at                  TEXT    NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (budget_instance_category_id)
        REFERENCES budget_instance_categories(budget_instance_category_id) ON DELETE CASCADE
);
```

| Column | Type | Constraints | Description |
|--------|------|------------|-------------|
| `line_item_id` | INTEGER | PK, AUTOINCREMENT | Unique line item ID |
| `budget_instance_category_id` | INTEGER | NOT NULL, FK CASCADE | Parent envelope row |
| `kind` | TEXT | NOT NULL, CHECK `('received'\|'spent')` | Transaction type |
| `occurred_at` | TEXT | NOT NULL | Transaction date/time (ISO 8601; default time 00:00:00 if not provided) |
| `description` | TEXT | — | Transaction description |
| `amount` | REAL | NOT NULL | Transaction amount |
| `currency` | TEXT | NOT NULL, DEFAULT `'CHF'` | Transaction currency |
| `notes` | TEXT | — | Optional notes |
| `is_template_default` | INTEGER | NOT NULL, DEFAULT 0 | `1` if auto-created from template default amount |
| `deleted_at` | TEXT | NULL | Soft-delete timestamp (ISO 8601); `NULL` = active |
| `created_at` | TEXT | NOT NULL, DEFAULT now | Creation timestamp |
| `updated_at` | TEXT | NOT NULL, DEFAULT now | Last modification timestamp |

---

### 8. `ui_settings`

**Introduced:** Migration v4  
**Purpose:** Key-value store for persisting user interface preferences (e.g., grid column widths) across app restarts.

```sql
CREATE TABLE IF NOT EXISTS ui_settings (
    key        TEXT PRIMARY KEY NOT NULL,
    value      TEXT NOT NULL,
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
```

| Column | Type | Constraints | Description |
|--------|------|------------|-------------|
| `key` | TEXT | PK, NOT NULL | Setting key (e.g., `column_widths`) |
| `value` | TEXT | NOT NULL | Setting value (typically JSON string) |
| `updated_at` | TEXT | NOT NULL, DEFAULT now | Last modification timestamp |

---

### 9. `line_item_attachments`

**Introduced:** Migration v5  
**Purpose:** File attachments (receipts, PDFs, images) linked to individual transaction line items. Files are stored as BLOBs and are automatically encrypted by SQLCipher at the page level.

```sql
CREATE TABLE IF NOT EXISTS line_item_attachments (
    attachment_id INTEGER PRIMARY KEY AUTOINCREMENT,
    line_item_id  INTEGER NOT NULL,
    file_name     TEXT    NOT NULL,
    mime_type     TEXT    NOT NULL,
    file_size     INTEGER NOT NULL,
    thumbnail     BLOB,
    file_data     BLOB    NOT NULL,
    created_at    TEXT    NOT NULL DEFAULT (datetime('now')),
    deleted_at    TEXT,
    FOREIGN KEY (line_item_id)
        REFERENCES category_line_items(line_item_id) ON DELETE CASCADE
);
```

| Column | Type | Constraints | Description |
|--------|------|------------|-------------|
| `attachment_id` | INTEGER | PK, AUTOINCREMENT | Unique attachment ID |
| `line_item_id` | INTEGER | NOT NULL, FK CASCADE | Parent line item |
| `file_name` | TEXT | NOT NULL | Original filename (e.g., `receipt.jpg`) |
| `mime_type` | TEXT | NOT NULL | MIME type (detected via `infer` crate, e.g., `image/jpeg`, `application/pdf`) |
| `file_size` | INTEGER | NOT NULL | File size in bytes |
| `thumbnail` | BLOB | NULL | Small preview image (~120x120 JPEG) for image attachments; `NULL` for non-images |
| `file_data` | BLOB | NOT NULL | Full file content |
| `created_at` | TEXT | NOT NULL, DEFAULT now | Creation timestamp |
| `deleted_at` | TEXT | NULL | Soft-delete timestamp; `NULL` = active |

---

## BLOB Storage Strategy

Attachments are stored **directly in the SQLCipher-encrypted database** as BLOB columns:

| Aspect | Implementation |
|--------|---------------|
| **Storage location** | `file_data` BLOB column in `line_item_attachments` table |
| **Encryption** | Automatic — SQLCipher encrypts all DB pages including BLOBs |
| **Thumbnails** | `thumbnail` BLOB column — ~120x120 JPEG preview generated by Rust `image` crate for image files; `NULL` for non-image attachments |
| **MIME detection** | Rust `infer` crate detects MIME type from file magic bytes |
| **Soft delete** | `deleted_at` timestamp; soft-deleted attachments excluded from queries |
| **Cascade delete** | `ON DELETE CASCADE` from `category_line_items` — deleting a line item removes all its attachments |
| **File size limit** | 25 MB soft limit enforced in frontend via `FileSizeWarningDialog`; user can override |
| **Portability** | All data (including attachments) travels in one `.efm` file |

---

## Indexes (16 total)

### Migration v1 Indexes (6)

| Index | Table | Columns | Purpose |
|-------|-------|---------|---------|
| `idx_budget_instances_start_date` | `period_budget_instances` | `start_date` | Period date lookups |
| `idx_budget_instances_cadence` | `period_budget_instances` | `cadence` | Filter by cadence type |
| `idx_period_budget_instances_template_id` | `period_budget_instances` | `template_id` | Find periods by template |
| `idx_template_categories_template_id` | `template_categories` | `template_id` | Get categories for a template |
| `idx_template_categories_global_category_id` | `template_categories` | `global_category_id` | Find templates using a category |
| `idx_global_categories_name` | `global_categories` | `name` | Category name lookups |

### Migration v2 Indexes (3)

| Index | Table | Columns | Purpose |
|-------|-------|---------|---------|
| `idx_bic_budget_instance_id` | `budget_instance_categories` | `budget_instance_id` | Get all envelopes for a period (main grid view) |
| `idx_bic_global_category_id` | `budget_instance_categories` | `global_category_id` | Find all periods using a category |
| `idx_bic_instance_sort` | `budget_instance_categories` | `budget_instance_id, sort_order` | Sorted category list within a period |

### Migration v3 Indexes (5)

| Index | Table | Columns | Type | Purpose |
|-------|-------|---------|------|---------|
| `idx_line_items_bic_id` | `category_line_items` | `budget_instance_category_id` | Standard | Get all line items for an envelope |
| `idx_line_items_occurred_at` | `category_line_items` | `occurred_at` | Standard | Date-based queries |
| `idx_line_items_kind` | `category_line_items` | `kind` | Standard | Filter by received vs spent |
| `idx_line_items_bic_kind_deleted` | `category_line_items` | `budget_instance_category_id, kind, deleted_at` | Composite | Rollup queries (sum by kind, exclude deleted) |
| `idx_line_items_bic_occurred_active` | `category_line_items` | `budget_instance_category_id, occurred_at` | Partial (`WHERE deleted_at IS NULL`) | Date range queries on active items |

### Migration v5 Indexes (2)

| Index | Table | Columns | Purpose |
|-------|-------|---------|---------|
| `idx_attachments_line_item` | `line_item_attachments` | `line_item_id` | Get all attachments for a line item |
| `idx_attachments_active` | `line_item_attachments` | `line_item_id, deleted_at` | Get non-deleted attachments for a line item |

---

## Migration History

| Version | Description | Tables Added | Indexes Added |
|---------|------------|-------------|---------------|
| **v1** | Base MVP tables | `global_categories`, `budget_templates`, `template_categories`, `period_budget_instances` | 6 indexes |
| **v2** | Envelope rows for periods | `budget_instance_categories` | 3 indexes |
| **v3** | Transaction line items | `category_line_items` | 5 indexes (incl. 1 partial, 1 composite) |
| **v4** | UI settings persistence | `ui_settings` | — |
| **v5** | File attachments | `line_item_attachments` | 2 indexes |

### Migration Strategy
- Schema version tracked in `_meta` table (`schema_version` key)
- Migrations run automatically on both create and open paths via `migrations::run_pending()`
- Each migration wrapped in a transaction for atomicity
- All tables use `CREATE TABLE IF NOT EXISTS` for idempotency
- Version only updated after successful migration
- `CURRENT_SCHEMA_VERSION` constant in `migrations.rs` (currently `5`)

---

## Entity Relationships

```
┌─────────────────────┐
│      _meta          │  (standalone key-value store)
│  key TEXT PK        │
│  value TEXT          │
└─────────────────────┘

┌─────────────────────┐
│  global_categories  │◄─────────────────────────────────┐
│  global_category_id │  PK                              │
│  name (UNIQUE)      │                                  │
└──────────┬──────────┘                                  │
           │ FK                                          │ FK
           ▼                                             ▼
┌─────────────────────┐         ┌───────────────────────────────┐
│ template_categories │────────►│       budget_templates        │
│ template_category_id│  FK     │  template_id PK               │
│ allocated_amount    │         │  cadence, default_currency     │
│ sort_order          │         └──────────────┬────────────────┘
└─────────────────────┘                        │ FK (no cascade)
  UNIQUE(template_id,                          ▼
         global_category_id)    ┌───────────────────────────────┐
                                │   period_budget_instances     │
                                │   budget_instance_id PK       │
                                │   cadence, start_date         │
                                └──────────────┬────────────────┘
                                               │ FK CASCADE
                                               ▼
                                ┌───────────────────────────────┐
                                │  budget_instance_categories   │◄── FK from global_categories
                                │  budget_instance_category_id  │     (CASCADE)
                                │  default_amount, sort_order   │
                                │  UNIQUE(instance, category)   │
                                └──────────────┬────────────────┘
                                               │ FK CASCADE
                                               ▼
                                ┌───────────────────────────────┐
                                │     category_line_items       │
                                │     line_item_id PK           │
                                │     kind: received | spent    │
                                │     occurred_at, amount       │
                                │     deleted_at (soft delete)  │
                                └──────────────┬────────────────┘
                                               │ FK CASCADE
                                               ▼
                                ┌───────────────────────────────┐
                                │    line_item_attachments      │
                                │    attachment_id PK           │
                                │    file_data BLOB, thumbnail  │
                                │    deleted_at (soft delete)   │
                                └───────────────────────────────┘

┌─────────────────────┐
│     ui_settings     │  (standalone key-value store)
│  key TEXT PK        │
│  value TEXT (JSON)  │
└─────────────────────┘
```

### Cascade Chain
Deleting a `period_budget_instances` row cascades through:
1. `budget_instance_categories` (all envelope rows for that period)
2. `category_line_items` (all transactions in those envelopes)
3. `line_item_attachments` (all attachments on those transactions)

---

## Rollup Calculations

### Received/Spent Totals (per envelope row in one period)

```sql
SELECT
    budget_instance_category_id,
    SUM(CASE WHEN kind = 'received' THEN amount ELSE 0 END) AS received_total,
    SUM(CASE WHEN kind = 'spent'    THEN amount ELSE 0 END) AS spent_total
FROM category_line_items
WHERE budget_instance_category_id = ?
  AND deleted_at IS NULL
GROUP BY budget_instance_category_id;
```

### Remaining Amount

```sql
SELECT
    bic.budget_instance_category_id,
    bic.default_amount,
    COALESCE(SUM(CASE WHEN li.kind = 'spent' THEN li.amount ELSE 0 END), 0) AS spent_total,
    (bic.default_amount
     - COALESCE(SUM(CASE WHEN li.kind = 'spent' THEN li.amount ELSE 0 END), 0)) AS remaining
FROM budget_instance_categories bic
LEFT JOIN category_line_items li
    ON  li.budget_instance_category_id = bic.budget_instance_category_id
    AND li.deleted_at IS NULL
WHERE bic.budget_instance_id = ?
GROUP BY bic.budget_instance_category_id;
```

### Received Date (DERIVED — not stored)

Computed from line items where `kind = 'received'`:
- Single date if one received line item: shows that date
- Date range if multiple: shows `min .. max`
- Empty if no received line items

```sql
SELECT
    budget_instance_category_id,
    MIN(DATE(occurred_at)) AS first_received_date,
    MAX(DATE(occurred_at)) AS last_received_date,
    COUNT(*)               AS received_count
FROM category_line_items
WHERE budget_instance_category_id = ?
  AND kind = 'received'
  AND deleted_at IS NULL
GROUP BY budget_instance_category_id;
```

---

## Data Integrity Rules

### Invariants
1. **Default amount** >= 0 (can be 0 for tracking-only categories)
2. **Transaction amount** can be negative (for refunds)
3. **Period `start_date` < `end_date`** when custom cadence is used
4. **Transaction date** can be in the future (for planned expenses)
5. **Soft delete**: Items with `deleted_at IS NOT NULL` are excluded from rollup calculations

### Constraints
- `UNIQUE(budget_instance_id, global_category_id)` on `budget_instance_categories` — one envelope per category per period
- `UNIQUE(template_id, global_category_id)` on `template_categories` — one entry per category per template
- `UNIQUE` on `global_categories.name` — category names are globally unique per file
- `CHECK (kind IN ('received', 'spent'))` on `category_line_items` — enforces valid transaction types
- Foreign keys with `ON DELETE CASCADE` on all child tables (except `period_budget_instances.template_id`)

---

## Currency & Locale

### Currencies (MVP)
- **CHF** (Swiss Franc) — default
- **EUR** (Euro)

### Currency Storage
- **Template level:** `budget_templates.default_currency` — default for new periods
- **Envelope level:** `budget_instance_categories.default_currency` — copied from template
- **Line item level:** `category_line_items.currency` — each transaction can have its own currency

### Languages (MVP)
- **English** (en) — default
- **German** (de)
- **Hungarian** (hu)

Language preference stored in `localStorage` (not in the finance file). The same finance file can be opened in different languages.

---

## References

- See **ENCRYPTION_SPEC.md** for SQLCipher + Argon2id encryption details
- See **ARCHITECTURE_CURRENT.md** for overall architecture documentation
- See **DOMAIN_MODEL.md** for entity relationship overview
- See **REPO_MAP.md** for file structure
- Source of truth for schema SQL: `src-tauri/src/migrations.rs`
- `_meta` table creation: `src-tauri/src/encrypted_db.rs`
