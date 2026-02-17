# Command: Add Database Migration

## Purpose
Pattern for adding a new database migration to `src-tauri/src/migrations.rs`.

## When to Use
- Adding new table
- Modifying existing table
- Adding indexes
- Schema changes

## Migration Architecture
All migrations are defined as Rust functions in a single file: `src-tauri/src/migrations.rs`. The current schema version is **v5**, meaning the next migration should be `migrate_v5_to_v6`.

### How Migrations Work
1. `_meta` table stores the current `schema_version` (integer).
2. `run_migrations(conn)` reads the version and applies each upgrade function sequentially.
3. Each migration function receives a `&Connection` reference and returns `rusqlite::Result<()>`.
4. After all upgrades, `schema_version` is updated to the latest.

## Migration Pattern (v5 format)

### Step 1: Add Migration Function
```rust
// In src-tauri/src/migrations.rs

fn migrate_v5_to_v6(conn: &Connection) -> rusqlite::Result<()> {
    // Add new table
    conn.execute_batch("
        CREATE TABLE IF NOT EXISTS new_table (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL DEFAULT '',
            parent_id INTEGER,
            created_at TEXT NOT NULL DEFAULT (datetime('now')),
            FOREIGN KEY (parent_id) REFERENCES parent_table(id) ON DELETE CASCADE
        );

        CREATE INDEX IF NOT EXISTS idx_new_table_parent_id ON new_table(parent_id);
    ")?;

    Ok(())
}
```

### Step 2: Register in run_migrations
```rust
// In src-tauri/src/migrations.rs — update run_migrations()

pub fn run_migrations(conn: &Connection) -> rusqlite::Result<()> {
    let version = get_schema_version(conn)?;

    if version < 1 { migrate_v0_to_v1(conn)?; }
    if version < 2 { migrate_v1_to_v2(conn)?; }
    if version < 3 { migrate_v2_to_v3(conn)?; }
    if version < 4 { migrate_v3_to_v4(conn)?; }
    if version < 5 { migrate_v4_to_v5(conn)?; }
    // ADD NEW MIGRATION HERE:
    if version < 6 { migrate_v5_to_v6(conn)?; }

    // Update schema version to latest
    conn.execute("UPDATE _meta SET schema_version = ?1", rusqlite::params![6])?;

    Ok(())
}
```

### Step 3: Update Version Constant
Update the final version number in the `UPDATE _meta SET schema_version = ?1` call.

## Current Schema (v5) — 9 Tables

| Table | Purpose |
|---|---|
| `_meta` | Schema version tracking |
| `global_categories` | Shared category definitions |
| `templates` | Budget templates (cadence, currency) |
| `template_categories` | Categories within a template |
| `period_budget_instances` | Budget instances from templates |
| `budget_instance_categories` | Categories within an instance |
| `category_line_items` | Individual transactions |
| `line_item_attachments` | File attachments (base64 in DB) |
| `ui_settings` | User interface preferences |

### Current Indexes (16 total)
```sql
-- Examples from existing migrations
CREATE INDEX idx_template_categories_template_id ON template_categories(template_id);
CREATE INDEX idx_budget_instance_categories_instance_id ON budget_instance_categories(instance_id);
CREATE INDEX idx_category_line_items_bic_id ON category_line_items(budget_instance_category_id);
CREATE INDEX idx_line_item_attachments_line_item_id ON line_item_attachments(line_item_id);
```

## Common Patterns

### Adding a Column to Existing Table
```rust
fn migrate_v5_to_v6(conn: &Connection) -> rusqlite::Result<()> {
    conn.execute_batch("
        ALTER TABLE category_line_items ADD COLUMN notes TEXT NOT NULL DEFAULT '';
    ")?;
    Ok(())
}
```

### Adding a New Table with Foreign Key
```rust
fn migrate_v5_to_v6(conn: &Connection) -> rusqlite::Result<()> {
    conn.execute_batch("
        CREATE TABLE IF NOT EXISTS tags (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL DEFAULT '',
            color TEXT NOT NULL DEFAULT '#808080'
        );

        CREATE TABLE IF NOT EXISTS line_item_tags (
            line_item_id INTEGER NOT NULL,
            tag_id INTEGER NOT NULL,
            PRIMARY KEY (line_item_id, tag_id),
            FOREIGN KEY (line_item_id) REFERENCES category_line_items(id) ON DELETE CASCADE,
            FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
        );

        CREATE INDEX IF NOT EXISTS idx_line_item_tags_tag_id ON line_item_tags(tag_id);
    ")?;
    Ok(())
}
```

## Important Notes

- SQLite ALTER TABLE is limited — you cannot drop or rename columns in older SQLite versions. For complex column changes, create a new table, copy data, drop old, rename new.
- Always use `IF NOT EXISTS` for tables and indexes.
- Foreign keys use `ON DELETE CASCADE` to maintain referential integrity.
- Default values: `''` for text, `0` for integers, `datetime('now')` for timestamps.
- Don't create separate `.sql` files — all migration SQL lives in Rust functions.
- Database is encrypted with SQLCipher, but migrations run on an already-opened (decrypted) connection, so no encryption handling is needed within migration code.

## Testing a Migration

### Inline Rust Tests
```rust
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_migration_v5_to_v6() {
        let conn = Connection::open_in_memory().unwrap();
        // Set up schema v5 first
        conn.execute_batch("CREATE TABLE _meta (schema_version INTEGER NOT NULL DEFAULT 0);").unwrap();
        conn.execute("INSERT INTO _meta (schema_version) VALUES (0)", []).unwrap();
        // Run all migrations up to v5
        run_migrations(&conn).unwrap();
        // Verify new table exists
        let count: i64 = conn.query_row(
            "SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name='new_table'",
            [],
            |row| row.get(0),
        ).unwrap();
        assert_eq!(count, 1);
    }
}
```

## References
- **`src-tauri/src/migrations.rs`**: All migration functions (v0→v1 through v4→v5)
- **`src-tauri/src/encrypted_db.rs`**: Database lifecycle commands (`create_encrypted_db`, `open_encrypted_db`)
- **`.cursor/agents/data_modeler.md`**: Data model guide
- **DATA_MODEL.md**: Schema documentation
