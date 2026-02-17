# Command: Add Tauri Command

## Purpose
Pattern for adding a new Rust Tauri command to `src-tauri/src/encrypted_db.rs`.

## When to Use
- Need new backend functionality
- Exposing Rust function to frontend
- Adding a new database operation

## Command Pattern

### Step 1: Define Command Function
```rust
// Add to src-tauri/src/encrypted_db.rs

use serde::{Deserialize, Serialize};
use tauri::State;
use crate::DbState;

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MyReturnType {
    pub id: i64,
    pub name: String,
}

#[tauri::command]
pub fn my_command_name(
    db_state: State<'_, DbState>,
    arg1: String,
    arg2: i64,
) -> Result<MyReturnType, String> {
    let binding = db_state.0.lock().unwrap();
    let conn = binding.as_ref().ok_or("No database open")?;

    // Implementation using conn (rusqlite Connection)
    let mut stmt = conn.prepare(
        "SELECT id, name FROM my_table WHERE id = ?1"
    ).map_err(|e| format!("Query error: {}", e))?;

    let result = stmt.query_row(rusqlite::params![arg2], |row| {
        Ok(MyReturnType {
            id: row.get(0)?,
            name: row.get(1)?,
        })
    }).map_err(|e| format!("Not found: {}", e))?;

    Ok(result)
}
```

### Step 2: Register Command
```rust
// In src-tauri/src/lib.rs — add to the invoke_handler list

.invoke_handler(tauri::generate_handler![
    // ... existing 38 commands ...
    encrypted_db::my_command_name,
])
```

That's it. There is no module system — all commands are functions in `encrypted_db.rs`, registered in `lib.rs`.

## Examples

### Create Period From Template (actual pattern)
```rust
#[tauri::command]
pub fn create_period_from_template(
    db_state: State<'_, DbState>,
    template_id: i64,
    name: String,
    start_date: String,
    end_date: Option<String>,
) -> Result<i64, String> {
    let binding = db_state.0.lock().unwrap();
    let conn = binding.as_ref().ok_or("No database open")?;

    conn.execute(
        "INSERT INTO period_budget_instances (template_id, name, cadence, start_date, end_date)
         SELECT ?1, ?2, cadence, ?3, ?4 FROM templates WHERE id = ?1",
        rusqlite::params![template_id, name, start_date, end_date],
    ).map_err(|e| format!("Failed to create period: {}", e))?;

    let instance_id = conn.last_insert_rowid();
    // ... copy categories from template ...
    Ok(instance_id)
}
```

## Error Handling

### Pattern
```rust
// Use .map_err to convert errors to String
.map_err(|e| format!("Descriptive error: {}", e))?

// For the DB connection lock
let binding = db_state.0.lock().unwrap();
let conn = binding.as_ref().ok_or("No database open")?;
```

### Examples
```rust
// Query errors
conn.execute(/* ... */)
    .map_err(|e| format!("Failed to create period: {}", e))?;

// Not found
let result = stmt.query_row(params, |row| { /* ... */ })
    .map_err(|e| format!("Item not found: {}", e))?;
```

## Frontend Usage

### Service Function
```typescript
// In src/services/ (e.g., budgetService.ts)
import { invoke } from '@tauri-apps/api/core';

export const createPeriodFromTemplate = async (
  templateId: number,
  name: string,
  startDate: string,
  endDate?: string
): Promise<number> => {
  return await invoke<number>('create_period_from_template', {
    templateId,
    name,
    startDate,
    endDate,
  });
};
```

### Component Usage
```typescript
const handleCreatePeriod = async () => {
  try {
    const instanceId = await createPeriodFromTemplate(templateId, name, startDate, endDate);
    // Handle success (e.g., navigate to period, refresh grid)
  } catch (error) {
    // Handle error (show toast/message)
  }
};
```

## Best Practices

### Do's
- Use descriptive command names (snake_case)
- Use camelCase for JSON fields (`#[serde(rename_all = "camelCase")]`)
- Return `Result<T, String>` for all commands
- Use `State<'_, DbState>` for database access
- Use parameterized queries (`rusqlite::params![]`)
- Handle errors with descriptive messages via `.map_err()`

### Don'ts
- Don't expose internal errors to frontend (use descriptive wrappers)
- Don't use `unwrap()` on fallible operations (use `?` or `map_err`)
- Don't log sensitive data (passwords, keys)
- Don't create separate module files — all commands go in `encrypted_db.rs`

## References
- **`src-tauri/src/encrypted_db.rs`**: All 38 existing Tauri commands
- **`src-tauri/src/lib.rs`**: Command registration in invoke_handler
- **`.cursor/agents/tauri_rust_boundary.md`**: Command design guide
- **ARCHITECTURE_CURRENT.md**: Current architecture
