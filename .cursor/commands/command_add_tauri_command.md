# Command: Add Tauri Command

## Purpose
Pattern for adding a new Rust Tauri command.

## When to Use
- Need new backend functionality
- Exposing Rust function to frontend
- Creating API endpoint

## Command Pattern

### Step 1: Define Command Function
```rust
// In src-tauri/src/modules/commands/module_name.rs

use serde::{Deserialize, Serialize};
use tauri::State;
use crate::modules::database::{DbState, DbError};

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CommandArgs {
    pub field1: String,
    pub field2: i32,
}

#[tauri::command]
pub fn command_name(
    args: CommandArgs,
    db: State<DbState>
) -> Result<ReturnType, String> {
    // Get database connection
    let conn = db.get_conn().map_err(|e| e.to_string())?;
    
    // Implementation
    // ...
    
    Ok(result)
}
```

### Step 2: Register Command
```rust
// In src-tauri/src/lib.rs

use modules::commands::{module_name::command_name, /* other commands */};

.invoke_handler(tauri::generate_handler![
    // ... existing commands
    command_name,
])
```

### Step 3: Export Command
```rust
// In src-tauri/src/modules/commands/mod.rs

pub mod module_name;
pub use module_name::command_name;
```

## Examples

### Create Period Command
```rust
#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreatePeriodArgs {
    pub template_id: i64,
    pub cadence: String,
    pub start_date: String,
    pub end_date: Option<String>,
}

#[tauri::command]
pub fn create_period(
    args: CreatePeriodArgs,
    db: State<DbState>
) -> Result<i64, String> {
    let conn = db.get_conn().map_err(|e| e.to_string())?;
    
    // Insert period
    conn.execute(
        "INSERT INTO periods (template_id, cadence, start_date, end_date) VALUES (?1, ?2, ?3, ?4)",
        rusqlite::params![args.template_id, args.cadence, args.start_date, args.end_date],
    ).map_err(|e| e.to_string())?;
    
    let period_id = conn.last_insert_rowid();
    Ok(period_id)
}
```

## Error Handling

### Pattern
```rust
.map_err(|e| format!("Error message: {}", e))
```

### Examples
```rust
let conn = db.get_conn().map_err(|e| format!("Database error: {}", e))?;

conn.execute(/* ... */)
    .map_err(|e| format!("Failed to create period: {}", e))?;
```

## Frontend Usage

### Service Function
```typescript
// In src/services/budgetService.ts

export const createPeriod = async (
  templateId: number,
  cadence: string,
  startDate: string,
  endDate?: string
): Promise<number> => {
  return await invoke<number>('create_period', {
    templateId,
    cadence,
    startDate,
    endDate,
  });
};
```

### Component Usage
```typescript
const handleCreatePeriod = async () => {
  try {
    const periodId = await createPeriod(templateId, cadence, startDate, endDate);
    // Handle success
  } catch (error) {
    // Handle error
  }
};
```

## Best Practices

### Do's
- ✅ Use descriptive command names (snake_case)
- ✅ Use camelCase for JSON fields (`#[serde(rename_all = "camelCase")]`)
- ✅ Return `Result<T, String>` for errors
- ✅ Use `State<DbState>` for database access
- ✅ Use prepared statements for queries
- ✅ Handle errors gracefully

### Don'ts
- ❌ Don't expose internal errors to frontend
- ❌ Don't use `unwrap()` (use `?` or `map_err`)
- ❌ Don't log sensitive data

## References
- **tauri_rust_boundary agent**: Command design guide
- **ARCHITECTURE_CURRENT.md**: Current architecture
- Existing commands in `src-tauri/src/modules/commands/`
