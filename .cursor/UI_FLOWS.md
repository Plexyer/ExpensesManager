# UI Flows - User Journeys

## Flow 1: Onboarding - Create Finance File

### Step 1: App Launch (First Time)
1. User opens app
2. **Screen**: Empty state / welcome screen
3. **Options**: 
   - "Create New Finance File" button
   - "Open Existing Finance File" button

### Step 2: Create File
1. User clicks "Create New Finance File"
2. **Screen**: File picker dialog
3. User selects save location (e.g., `Documents/MyFinance.encrypted`)
4. User clicks "Save"

### Step 3: Set Master Password
1. **Screen**: Password creation modal
2. **Fields**:
   - "Master Password" (password input)
   - "Confirm Password" (password input)
   - "Password Hint" (optional text input)
3. User enters password twice
4. User clicks "Create File"

### Step 4: File Creation
1. System creates encrypted SQLite file at chosen location
2. System initializes database schema
3. System stores password hash + encryption key
4. **Screen**: Main grid (empty state)

---

## Flow 2: Onboarding - Open Finance File

### Step 1: App Launch (Returning User)
1. User opens app
2. **Screen**: Empty state / welcome screen
3. User clicks "Open Existing Finance File"

### Step 2: Select File
1. **Screen**: File picker dialog
2. User navigates to finance file location
3. User selects `.encrypted` file
4. User clicks "Open"

### Step 3: Unlock File
1. **Screen**: Password unlock modal
2. **Fields**:
   - "Master Password" (password input)
   - "Show Password" (checkbox, optional)
   - "Forgot Password?" (link, shows hint if available)
3. User enters password
4. User clicks "Unlock"

### Step 4: File Unlock
1. System verifies password
2. System decrypts database
3. System loads data
4. **Screen**: Main grid (with existing periods if any)

### Error Cases
- **Wrong password**: Show error "Incorrect password. Please try again."
- **File corrupted**: Show error "File is corrupted. Please restore from backup."

---

## Flow 3: Template Management

### Step 1: Navigate to Templates
1. User clicks "Templates" in sidebar
2. **Screen**: Templates page

### Step 2: Create Template
1. User clicks "Create Template" button
2. **Screen**: Template creation form
3. **Fields**:
   - "Template Name" (text input, required)
   - "Description" (text input, optional)
   - "Cadence" (dropdown: Monthly/Biweekly/Weekly/Daily/Yearly/Custom, required)
   - Categories list (empty initially; references global categories)

### Step 3: Add Envelopes
1. User clicks "Add Category" button
2. **Screen**: Category row form (inline or modal)
3. **Fields**:
   - "Global Category" (dropdown/search, required)
   - "Default Amount" (number input, required)
4. User clicks "Add"
5. Category appears in list
6. Repeat for each category

### Step 4: Save Template
1. User clicks "Save Template"
2. System validates (name + at least one envelope)
3. Template saved to database
4. **Screen**: Templates list (new template appears)

### Step 5: Edit Template (Optional)
1. User clicks "Edit" on template card
2. **Screen**: Template edit form (pre-filled)
3. User modifies envelopes/amounts
4. User clicks "Update Template"

### Step 6: Delete Template (Optional)
1. User clicks "Delete" on template card
2. **Screen**: Confirmation dialog "Are you sure? This cannot be undone."
3. User confirms
4. Template deleted

---

## Flow 4: Period Creation from Template

### Step 1: Navigate to Main Grid
1. User clicks "Budgets" in sidebar (or "Dashboard")
2. **Screen**: Budgets list (period budget instances)

### Step 2: Create Period
1. User clicks "Create Period" (new budget instance) button
2. **Screen**: Period budget instance creation modal

### Step 3: Select Template
1. **Fields**:
   - "Template" (dropdown, required)
   - "Cadence" (from template; editable if template cadence changed, as allowed)
   - "Start Date" (date picker, required)
   - "End Date" (date picker, required if Custom cadence)
2. User selects template from dropdown
3. System shows preview: "This template has X categories with total default amount Y"

### Step 4: Configure Period
1. User selects cadence (e.g., "Monthly")
2. User selects start date (e.g., "2025-03-01")
3. If Custom: User enters end date
4. User clicks "Create Period"

### Step 5: Period Created
1. System creates period budget instance from template
2. Default amounts and category set copied from template
3. **Screen**: App opens the **main grid for that period budget instance**
4. Grid shows categories (rows) and informational columns (received date/received amount/spent amount)

---

## Flow 5: Main Grid Interactions

### Step 1: View Grid
1. **Screen**: Main grid
2. **Layout**:
   - **Rows**: Global categories (e.g., Food, Rent, Fuel)
   - **Columns**: Category fields for the current period (MVP: Category name, Received date, Received amount, Spent amount)
   - **Cells**: Totals/fields for the selected category in the current period

### Step 2: Navigate Grid
1. User can:
   - Click cell to select (focus ring)
   - Arrow keys to navigate
   - Scroll vertically (categories)

### Step 3: View Cell Data
1. User clicks a received/spent cell in a category row (e.g., "Groceries" → "Spent amount")
2. **Tooltip or sidebar** shows:
   - Received date
   - Received amount total
   - Spent amount total
   - Line item count (received/spent, depending on column)

### Step 4: Double-Click to Edit
1. User double-clicks cell
2. **Screen**: Received/Spent line-item modal opens (depending on which column was double-clicked)

---

## Flow 6: Transaction Entry (Double-Click Modal)

### Step 1: Open Modal
1. User double-clicks **Received amount** or **Spent amount** cell (e.g., "Groceries" → "Spent amount")
2. **Screen**: Line-item modal
3. **Header**: "Groceries - [Current Period]" + "Received" or "Spent"
4. **Content**: Line-item table (empty or with existing line items)

### Step 2: View Existing Transactions
1. **Table columns**:
   - Date (required)
   - Time (optional)
   - Description
   - Amount
   - Actions (Edit/Delete)
2. User can scroll if many transactions

### Step 3: Add Transaction
1. User clicks "Add Transaction" button
2. **Screen**: Transaction form (inline or sub-modal)
3. **Fields**:
   - "Date" (date picker, defaults to today)
   - "Time" (optional time input)
   - "Description" (text input, required)
   - "Amount" (number input, required)
   - "Notes" (text input, optional)
4. User fills fields
5. User clicks "Save"

### Step 4: Transaction Saved
1. Transaction added to table
2. Table updates: new row appears
3. **Footer** shows: "Total: $X.XX" (sum of all transactions)
4. User can add more transactions or close modal

### Step 5: Close Modal
1. User clicks "Close" or "X" button
2. Modal closes
3. **Screen**: Main grid updates
4. Cell shows new total (spent amount updated)

### Step 6: Edit Transaction (Optional)
1. User clicks "Edit" on transaction row
2. **Screen**: Transaction form (pre-filled)
3. User modifies fields
4. User clicks "Update"
5. Table updates

### Step 7: Delete Transaction (Optional)
1. User clicks "Delete" on transaction row
2. **Screen**: Confirmation "Are you sure?"
3. User confirms
4. Transaction removed from table
5. Total updates

---

## Flow 7: CSV Export

### Step 1: Navigate to Export
1. User clicks "Settings" in sidebar
2. **Screen**: Settings page
3. User clicks "Export" tab/section

### Step 2: Export CSV
1. User clicks "Export to CSV" button
2. **Screen**: File picker dialog
3. User selects save location (e.g., `Documents/MyFinance_export.csv`)
4. User clicks "Save"

### Step 3: Export Processing
1. System generates CSV with all data:
   - Budget instances (cadence, start_date, end_date, template)
   - Categories (global categories + per-instance received date/defaults as applicable)
   - Line items (received/spent; occurred_at, description, amount)
2. **Screen**: Success message "Export completed. File saved to [location]"
3. User can click "Open File" to view CSV

---

## Flow 8: Backup Guidance

### Step 1: Navigate to Backup
1. User clicks "Settings" in sidebar
2. **Screen**: Settings page
3. User clicks "Backup" tab/section

### Step 2: View Backup Instructions
1. **Screen**: Backup section
2. **Content**:
   - Heading: "Backup Your Finance File"
   - Instructions: "To backup your data, copy your finance file to a safe location (external drive, cloud storage, etc.)"
   - File location: "Current file: [path]" (clickable to open in file explorer)
   - "Copy File" button (opens file picker to copy)

### Step 3: Copy File (Optional)
1. User clicks "Copy File" button
2. **Screen**: File picker dialog (save as)
3. User selects backup location
4. User clicks "Save"
5. **Screen**: Success message "File copied successfully"

---

## Error States & Edge Cases

### Empty Finance File
- **Screen**: Empty grid with message "No periods yet. Create your first period to get started."
- **Action**: "Create Period" button

### No Templates
- **Screen**: Templates page with message "No templates yet. Create your first template."
- **Action**: "Create Template" button

### Wrong Password
- **Screen**: Error message "Incorrect password. Please try again."
- **Action**: Retry password input

### File Locked
- **Screen**: Error message "File is locked. Another instance may be using it."
- **Action**: Close other instances, retry

### Network Error (if applicable)
- **Screen**: Error message "Unable to save. Please try again."
- **Action**: Retry button

---

## References

- See **PRODUCT_REQUIREMENTS.md** for detailed requirements
- See **UX_INTERACTIONS.md** for interaction patterns
- See **MVP_PLAN.md** for implementation roadmap
