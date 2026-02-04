# Skill: CSV Export Implementation

## Purpose
How to implement CSV export functionality for finance data.

## When to Use
- Implementing CSV export feature
- Exporting budget instances, categories, and line items
- Testing CSV format compatibility

## Export Scope (MVP)

### Data to Export
1. **Budget instances**: budget_instance_id, cadence, start_date, end_date, template_id
2. **Global categories**: global_category_id, name, description
3. **Budget instance categories**: budget_instance_id, global_category_id, received_date, default_amount
4. **Line items**: line_item_id, budget_instance_category_id, kind(received/spent), occurred_at, description, amount, notes

### Format
- CSV with headers
- UTF-8 encoding
- Comma-separated values
- Quoted strings (if contain commas)

## Implementation Approach

### Backend: Generate CSV

#### Option 1: Generate CSV in Rust
```rust
#[tauri::command]
pub fn export_to_csv(db: State<DbState>) -> Result<String, String> {
    let conn = db.get_conn()?;
    
    // Query data
    let budget_instances = get_all_budget_instances(&conn)?;
    let global_categories = get_all_global_categories(&conn)?;
    let instance_categories = get_all_budget_instance_categories(&conn)?;
    let line_items = get_all_line_items(&conn)?;
    
    // Generate CSV
    let mut csv = String::new();
    csv.push_str("BudgetInstances\n");
    csv.push_str("budget_instance_id,cadence,start_date,end_date,template_id\n");
    for period in budget_instances {
        csv.push_str(&format!("{},{},{},{},{}\n", 
            period.id, period.cadence, period.start_date, 
            period.end_date.unwrap_or_default(), period.template_id));
    }
    
    csv.push_str("\nGlobalCategories\n");
    csv.push_str("global_category_id,name,description\n");
    // ... add global category rows
    
    csv.push_str("\nBudgetInstanceCategories\n");
    csv.push_str("budget_instance_id,global_category_id,received_date,default_amount\n");
    // ... add per-instance category rows
    
    csv.push_str("\nLineItems\n");
    csv.push_str("line_item_id,budget_instance_category_id,kind,occurred_at,description,amount,notes\n");
    // ... add line item rows
    
    Ok(csv)
}
```

#### Option 2: Use CSV Crate
```toml
# Cargo.toml
[dependencies]
csv = "1.3"
```

```rust
use csv::Writer;

let mut wtr = Writer::from_writer(vec![]);
wtr.write_record(&["period_id", "cadence", "start_date"])?;
wtr.write_record(&[period.id.to_string(), period.cadence, period.start_date])?;
let data = String::from_utf8(wtr.into_inner()?)?;
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
- Include section headers (BudgetInstances, GlobalCategories, BudgetInstanceCategories, LineItems)
- Column headers for each section
- Clear separation between sections

### Data Formatting
- **Dates**: ISO format (YYYY-MM-DD) or locale-specific
- **Amounts**: Decimal format (e.g., 150.50)
- **Strings**: Quote if contain commas
- **Empty values**: Empty string or "NULL"

### Example CSV
```csv
BudgetInstances
budget_instance_id,cadence,start_date,end_date,template_id
1,monthly,2025-03-01,,1
2,biweekly,2025-03-15,2025-03-29,1

GlobalCategories
global_category_id,name,description
1,Groceries,Food and household items
2,Rent/Mortgage,Monthly housing payment

BudgetInstanceCategories
budget_instance_id,global_category_id,received_date,default_amount
1,1,2025-03-01,500.00
1,2,2025-03-01,1200.00

LineItems
line_item_id,budget_instance_category_id,kind,occurred_at,description,amount,notes
1,1,spent,2025-03-05,Grocery shopping,150.50,Weekly groceries
2,1,spent,2025-03-06,Coffee,5.00,
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
- **Rust CSV crate**: https://docs.rs/csv/
- **Tauri file dialog**: https://tauri.app/api/js/dialog/
- **PRODUCT_REQUIREMENTS.md**: Export requirements

## Output
Implement CSV export following this pattern.
