# Skill: CSV Export Implementation

## Purpose
How to implement and extend CSV export functionality for finance data.

## Implementation Status
Two export commands already exist in `src-tauri/src/encrypted_db.rs`:
- `export_to_csv` — returns CSV string
- `export_csv_to_file` — writes CSV directly to a file path

## When to Use
- Extending CSV export feature
- Modifying export format or columns
- Testing CSV format compatibility

## Export Scope (MVP)

### Data to Export (from schema v5)
1. **Period budget instances** (`period_budget_instances`): id, template_id, cadence, start_date, end_date, name
2. **Global categories** (`global_categories`): id, name, sort_order
3. **Budget instance categories** (`budget_instance_categories`): id, instance_id, global_category_id, default_amount
4. **Line items** (`category_line_items`): id, category_id, kind (received/spent), amount, description, occurred_at, notes
5. **Attachments metadata** (`line_item_attachments`): id, line_item_id, filename, mime_type, size_bytes (binary data excluded)

### Format
- CSV with headers
- UTF-8 encoding
- Comma-separated values
- Quoted strings (if contain commas)

## Implementation Approach

### Backend: Generate CSV

#### Existing Commands (in `src-tauri/src/encrypted_db.rs`)
```rust
#[tauri::command]
pub fn export_to_csv(db_state: State<DbState>) -> Result<String, String> {
    let binding = db_state.0.lock().unwrap();
    let conn = binding.as_ref().ok_or("No database open")?;
    // Query all tables and generate CSV string
    // Returns the CSV as a String
    Ok(csv)
}

#[tauri::command]
pub fn export_csv_to_file(path: String, db_state: State<DbState>) -> Result<(), String> {
    let csv = export_to_csv_internal(db_state)?;
    std::fs::write(&path, csv).map_err(|e| format!("Failed to write file: {}", e))?;
    Ok(())
}
```

#### CSV Generation Pattern
```rust
let mut csv = String::new();
csv.push_str("PeriodBudgetInstances\n");
csv.push_str("id,template_id,cadence,start_date,end_date,name\n");
for instance in &instances {
    csv.push_str(&format!("{},{},{},{},{},{}\n",
        instance.id, instance.template_id, instance.cadence,
        instance.start_date, instance.end_date.as_deref().unwrap_or(""),
        instance.name));
}
// ... repeat for other tables
```

### Frontend: Save CSV File

```typescript
const handleExportCSV = async () => {
  try {
    const csvData = await invoke<string>('export_to_csv');
    
    // Use Tauri file dialog to save
    const filePath = await save({
      defaultPath: 'finance_export.csv',
      filters: [{ name: 'CSV', extensions: ['csv'] }],
    });
    
    if (filePath) {
      await writeTextFile(filePath, csvData);
      showSuccessMessage('CSV exported successfully');
    }
  } catch (error) {
    showErrorMessage('Failed to export CSV');
  }
};
```

## CSV Format Considerations

### Headers
- Include section headers (PeriodBudgetInstances, GlobalCategories, BudgetInstanceCategories, CategoryLineItems)
- Column headers for each section
- Clear separation between sections

### Data Formatting
- **Dates**: ISO format (YYYY-MM-DD) or locale-specific
- **Amounts**: Decimal format (e.g., 150.50)
- **Strings**: Quote if contain commas
- **Empty values**: Empty string or "NULL"

### Example CSV
```csv
PeriodBudgetInstances
id,template_id,cadence,start_date,end_date,name
1,1,monthly,2025-03-01,,March 2025
2,1,biweekly,2025-03-15,2025-03-29,Late March

GlobalCategories
id,name,sort_order
1,Groceries,0
2,Rent/Mortgage,1

BudgetInstanceCategories
id,instance_id,global_category_id,default_amount
1,1,1,500.00
2,1,2,1200.00

CategoryLineItems
id,category_id,kind,amount,description,occurred_at,notes
1,1,spent,150.50,Grocery shopping,2025-03-05,Weekly groceries
2,1,spent,5.00,Coffee,2025-03-06,
```

## Testing

### Test Cases
1. **Empty data**: Export empty finance file (should create CSV with headers only)
2. **Large dataset**: Export with 1000+ transactions (performance test)
3. **Special characters**: Test with commas, quotes, newlines in descriptions
4. **Excel compatibility**: Open CSV in Excel, verify formatting
5. **Locale formatting**: Test date/amount formatting for EN/DE

### Validation
- CSV is valid (can be parsed)
- All data included
- No data loss
- Excel can open file

## Error Handling

### Error Cases
- **Database error**: Show "Failed to export data"
- **File write error**: Show "Failed to save file"
- **Empty data**: Still export (with headers only)

### User Feedback
- Loading state while exporting
- Success message with file location
- Error message with retry option

## Performance Considerations

### Large Datasets
- Stream CSV generation (if possible)
- Show progress indicator
- Consider pagination (export in chunks)

### Memory Usage
- Generate CSV incrementally
- Don't load all data into memory at once

## References
- **`src-tauri/src/encrypted_db.rs`**: `export_to_csv` and `export_csv_to_file` commands
- **Tauri file dialog**: `@tauri-apps/plugin-dialog` (save dialog for file path)
- **PRODUCT_REQUIREMENTS.md**: Export requirements
- **DATA_MODEL.md**: Schema reference for export columns

## Output
Use these patterns when extending CSV export or modifying the export format.
