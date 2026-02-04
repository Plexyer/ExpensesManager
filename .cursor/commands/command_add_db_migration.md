# Command: Add Database Migration

## Purpose
How to handle schema changes for SQLite via migrations.

## When to Use
- Adding new tables
- Adding new columns
- Modifying schema
- Data migrations

## Migration File Naming

### Format
```
YYYY_MM_description.sql
```

### Examples
- `2025_03_create_periods.sql`
- `2025_03_add_account_to_templates.sql`
- `2025_03_update_transactions.sql`

## Migration Structure

### Basic Template
```sql
-- Description of migration
-- Date: YYYY-MM-DD

-- Create table
CREATE TABLE IF NOT EXISTS table_name (
    column1 INTEGER PRIMARY KEY AUTOINCREMENT,
    column2 TEXT NOT NULL,
    -- ... other columns
    FOREIGN KEY (column2) REFERENCES other_table(id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_table_column ON table_name(column);

-- Data migration (if needed)
-- UPDATE table_name SET column = value WHERE condition;
```

## Migration Process

### Step 1: Create Migration File
1. Create file in `src-tauri/migrations/`
2. Use naming convention
3. Write SQL statements

### Step 2: Update Database Module
1. Add migration call in `run_migrations()` function
2. Order migrations chronologically
3. Handle errors

### Step 3: Test Migration
1. Test on fresh database
2. Test on existing database (if data migration)
3. Test rollback (if needed)

## Examples

### Create Table
```sql
-- Create periods table
CREATE TABLE IF NOT EXISTS periods (
    period_id INTEGER PRIMARY KEY AUTOINCREMENT,
    cadence TEXT NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE,
    template_id INTEGER REFERENCES budget_templates(template_id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_periods_start_date ON periods(start_date);
CREATE INDEX IF NOT EXISTS idx_periods_cadence ON periods(cadence);
```

### Add Column
```sql
-- Add cadence column to budget_templates (corrected design requirement)
ALTER TABLE budget_templates ADD COLUMN cadence TEXT NOT NULL DEFAULT 'monthly';
```

### Data Migration
```sql
-- Migrate existing data
UPDATE budget_templates SET cadence = 'monthly' WHERE cadence IS NULL;
```

## Best Practices

### Do's
- ✅ Use `IF NOT EXISTS` for tables
- ✅ Use `IF NOT EXISTS` for indexes
- ✅ Add default values for new columns (if needed)
- ✅ Test migrations thoroughly
- ✅ Document migration purpose

### Don'ts
- ❌ Don't drop tables without backup
- ❌ Don't modify existing data without migration
- ❌ Don't skip error handling

## Integration

### In Database Module
```rust
pub fn run_migrations(state: &DbState) -> Result<(), DbError> {
    let conn = state.get_conn()?;
    
    // Run migrations in order
    conn.execute_batch(include_str!("../migrations/2025_03_create_periods.sql"))?;
    conn.execute_batch(include_str!("../migrations/2025_03_add_account.sql"))?;
    
    Ok(())
}
```

## References
- **DATA_MODEL.md**: Schema documentation
- **data_modeler agent**: Schema design
- Existing migrations in `src-tauri/migrations/`
