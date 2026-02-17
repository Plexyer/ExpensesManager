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
3. User selects save location (e.g., `Documents/MyFinance.financedb`)
4. User clicks "Save"

### Step 3: Set Master Password
1. **Screen**: Password creation modal
2. **Fields**:
   - "Master Password" (password input)
   - "Confirm Password" (password input)
   - "Password Hint" (optional text input)
3. User enters password twice
4. User clicks "Create File"

### Step 4: File Creation (IMPLEMENTED — SQLCipher)
1. System creates encrypted SQLite file (`.financedb`) at chosen location
2. System writes custom file header (magic bytes `EFM1`, random salt, Argon2id KDF params, password hint)
3. System derives 256-bit encryption key from password via Argon2id (64 MB memory, 3 iterations, 4 threads)
4. System initializes database schema (migrations v1–v5) inside the encrypted SQLCipher database
5. Password is NOT stored — it is implicit in the encryption key
6. System marks file as "open" in app state
7. **Screen**: Main grid (empty state — no periods yet)

---

## Flow 2: Onboarding - Open Finance File

### Step 1: App Launch (Returning User)
1. User opens app
2. **Screen**: Empty state / welcome screen
3. User clicks "Open Existing Finance File"

### Step 2: Select File
1. **Screen**: File picker dialog
2. User navigates to finance file location
3. User selects `.financedb` file
4. User clicks "Open"

### Step 3: Read File & Show Unlock Modal (IMPLEMENTED)
1. System reads the custom file header from the `.financedb` file (magic bytes, salt, KDF params, hint)
2. System extracts password hint (if present)
3. **Screen**: Password unlock modal (with hint available via "Show Hint" button)

### Step 4: Unlock File
1. **Screen**: Password unlock modal
2. **Fields**:
   - "Master Password" (password input)
   - "Show Password" (toggle)
   - "Show Hint" (button, shows hint if available)
3. User enters password
4. User clicks "Unlock"

### Step 5: Verify Password & Open (IMPLEMENTED)
1. System derives encryption key from password using Argon2id (with salt and KDF params from file header)
2. System attempts to decrypt and open the SQLCipher database
3. If success → file unlocked, data loaded, app navigates to main grid
4. If failure → show error, allow retry
5. **Screen**: Main grid (with existing periods if any, or empty state)

### Error Cases
- **Wrong password**: Show error "Incorrect password. Please try again."
- **File corrupted / invalid header**: Show error "Unable to read file. The file may be corrupted."
- **Not a valid finance file**: Show error "This file is not a valid finance file."
- **Too many attempts**: After 5 failures, show lockout message (session-based)

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
2. **Screen**: Category row form (inline)
3. **Fields**:
   - "Global Category" (dropdown/search, required)
   - "Default Amount" (number input, required)
4. User clicks "Add"
5. Category appears in list
6. Repeat for each category

### Step 3b: Reorder Categories (Drag-and-Drop)
1. User grabs the drag handle on any category item
2. User drags the item to a new position in the list
3. Visual feedback shows the drop target location
4. User releases — category order updates immediately
5. New order persists to database
6. **Library**: `@hello-pangea/dnd` (implemented in `TemplateCategoryList.tsx`)

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
3. **Column Details (CONFIRMED)**:
   - **Received date**: DERIVED column showing first/last dates from received line items
     - Single date format: "YYYY-MM-DD" (if only one received line item)
     - Date range format: "YYYY-MM-DD - YYYY-MM-DD" (if multiple received line items)
     - Empty if no received line items
   - **Received amount**: Sum of all received line items (includes template default as first entry)
   - **Spent amount**: Sum of all spent line items

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
4. **Content**: Line-item table (CONFIRMED behavior below)

### Step 2: View Existing Transactions (CONFIRMED)
1. **Table columns**:
   - Date (required, locale-formatted)
   - Description
   - Amount
   - Currency (CHF/EUR for MVP) (CONFIRMED)
   - Attachment indicator (shows count badge / "+" icon for each line item)
   - Actions (Edit/Delete)
2. **For Received amount modal** (CONFIRMED):
   - First row is auto-created from template default amount (marked as template default)
   - Each subsequent row represents money received from various sources
3. User can scroll if many transactions (virtualization for large lists) (CONFIRMED)
4. **Attachment indicator** on each row: see **Flow 13–15** for attachment workflows

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
   - Instructions: Step-by-step guidance to copy the finance file to a safe location
   - File location: "Current file: [path]" displayed
   - "Copy Path" button (copies file path to clipboard)
   - "Show in Explorer" button (opens the file's directory in the system file manager)

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

### No Attachments on Line Item
- **Screen**: Attachment indicator shows "+" icon
- **Action**: Click to open popover, then click "Add" to attach files

### Large Attachment Warning
- **Screen**: FileSizeWarningDialog showing filename, size, and 25 MB soft limit
- **Action**: "Upload Anyway" to proceed or "Cancel" to skip the file

---

## Flow 9: Read-Only Mode Experience (CONFIRMED from LICENSING.md) — DEFERRED

> **DEFERRED**: App Mode Plumbing (#61) was moved to `out-of-scope` for MVP. The non-negotiable safeguards are implemented: Export Always Available (#62) and DB Open/Unlock Never Blocked (#63). Full Read-Only mode with license-based gating is deferred to post-MVP.

### Scenario: User without valid license

#### Step 1: App Launch
1. User opens app
2. System checks for license file
3. No valid license found → **Read-Only Mode**

#### Step 2: Open Database
1. User can still open any encrypted database file
2. User enters password
3. **Screen**: Main grid with **Read-Only banner** at top
4. Banner text: "Read-Only Mode - Viewing only. Purchase a license to enable editing."
5. Banner actions: "Purchase License" button · "Import License" button

#### Step 3: View Data
1. User can view all data normally
2. User can search, filter, navigate
3. User can print views

#### Step 4: Export Data (ALWAYS AVAILABLE)
1. User can click "Export" in menu
2. Full export functionality works
3. CSV/JSON export completes normally
4. **UX Non-negotiable**: Export NEVER blocked

#### Disabled Features (Read-Only)
- Add/edit/delete transactions
- Create/modify periods
- Create/modify templates
- Import data
- Any write operations

---

## Flow 10: Import License File (CONFIRMED from LICENSING.md) — DEFERRED

> **DEFERRED**: License import depends on App Mode Plumbing (#61), which was moved to `out-of-scope` for MVP. The app currently runs in Full Mode for all users. License import will be implemented post-MVP.

### Step 1: Navigate to License
1. User clicks "Settings" in sidebar
2. **Screen**: Settings page
3. User clicks "License" tab/section

### Step 2: View License Status
1. **Screen**: License section showing current status
2. **If no license**: "No license. Running in Read-Only Mode."
3. **If valid license**: License details (plan type, feature updates until, etc.)

### Step 3: Import License
1. User clicks "Import License" button
2. **Screen**: File picker dialog
3. User selects license file (`.json` or `.lic`)
4. User clicks "Open"

### Step 4: License Validation
1. System validates signature using embedded public key
2. **If valid**: 
   - Show success: "License activated! Full Mode enabled."
   - App switches to Full Mode
   - License details shown
3. **If invalid**:
   - Show error: "Invalid license file. Please check and try again."
   - Remain in Read-Only Mode

---

## Flow 11: Offline Mode Toggle (CONFIRMED from LICENSING.md) — DEFERRED

> **Post-MVP**: This flow is DEFERRED. Perpetual licenses work fully offline by default; the explicit toggle is a nice-to-have for post-MVP.

### Prerequisite: Valid Perpetual License

### Step 1: Navigate to Settings
1. User clicks "Settings" in sidebar
2. **Screen**: Settings page
3. User sees "Offline Mode" toggle

### Step 2: Enable Offline Mode
1. User clicks "Offline Mode" toggle to ON
2. **Screen**: Warning dialog
3. **Warning text**: "Offline Mode disables all internet access, including update checks and license verification. Continue?"
4. User clicks "Enable"

### Step 3: Offline Mode Active
1. Toggle shows ON state
2. **Indicator**: "Offline Mode" badge visible in header/footer
3. No server calls made for any reason
4. All base features work normally

### Step 4: Disable Offline Mode
1. User clicks toggle to OFF
2. App resumes normal online behavior
3. May check for updates and license status

---

## Flow 12: Old Generation License Banner (CONFIRMED from LICENSING.md) — DEFERRED

> **Post-MVP**: This flow is DEFERRED. It requires server infrastructure for license status checks, which is out of scope for MVP.

### Scenario: User has valid license but newer generation exists on server

### Step 1: License Check (when online)
1. App performs optional license status check
2. Server responds: "outdated_generation"

### Step 2: Show Banner
1. **Banner**: Non-intrusive, dismissible
2. **Text**: "A newer license version exists. Import it to continue receiving updates."
3. **Actions**: "Restore / Import" button · "Dismiss" button

### Step 3: User Actions
- **Import**: Opens license import flow
- **Dismiss**: Banner hidden (may reappear on next app launch)

### Behavior
- **NO disruption to Full Mode** - user continues working normally
- Only feature-update downloads blocked
- Offline use continues normally

---

## Flow 13: Attachment Upload — IMPLEMENTED

> **Phase 11**: Attachments are stored as encrypted BLOBs inside the SQLCipher database. They travel with the portable `.financedb` file.

### Prerequisites
- A finance file is open
- A period exists with at least one category
- The CategoryLedgerModal is open (double-click a received/spent cell)

### Step 1: Open Attachment Popover
1. User sees an **attachment indicator** on each line item row in the CategoryLedgerModal
   - No attachments: shows "+" icon
   - Has attachments: shows thumbnail (for images) or file icon, with emerald count badge if count > 1
2. User clicks the attachment indicator
3. **Screen**: AttachmentPopover opens (320px wide, max 400px tall), anchored to the indicator

### Step 2: Add Attachment
1. User clicks the "Add" button in the popover
2. **Screen**: Native file picker dialog opens (multi-select enabled)
3. **File filters**: Images, Documents, All Files
4. User selects one or more files
5. User clicks "Open"

### Step 3: File Size Check
1. System checks each selected file's size (lightweight stat — no content read)
2. **If file > 25 MB**: FileSizeWarningDialog appears
   - Shows: warning icon, filename, formatted file size
   - Note about the 25 MB soft limit
   - **Options**: "Upload Anyway" (proceed) or "Cancel" (skip this file)
3. **If file <= 25 MB**: upload proceeds immediately
4. Files are processed sequentially

### Step 4: Upload Complete
1. Each approved file is uploaded via `add_attachment` Tauri command
2. File data stored as encrypted BLOB in `line_item_attachments` table
3. Image files get auto-generated thumbnails (Rust backend, `image` crate)
4. MIME type auto-detected via `infer` crate
5. Attachment indicator updates: count badge refreshes, thumbnail updates
6. Popover refreshes to show the new attachment(s)

### Error Cases
- User cancels file picker → no action
- File read error → error message shown, other files continue
- Zero-byte file → allowed (uploaded normally)

---

## Flow 14: Attachment View — IMPLEMENTED

> Attachments use a **unified popover-then-lightbox flow**: the popover provides quick access and management, while the lightbox offers full-screen image viewing. There is no separate Settings toggle — the two modes complement each other.

### Step 1: Open Popover
1. User clicks the attachment indicator on a line item row
2. **Screen**: AttachmentPopover opens
3. Popover shows a list of attachments, each with:
   - Thumbnail (for images) or file type icon (for non-images)
   - Filename (truncated if long)
   - File size (human-readable)
   - Action buttons: View, Export, Delete

### Step 2a: View Image Attachment
1. User clicks "View" (eye icon) on an image attachment
2. **Screen**: AttachmentLightbox opens (full-screen gallery)
3. Lightbox features:
   - Full-resolution image loaded on demand
   - Zoom (mouse wheel or pinch)
   - Arrow key navigation (prev/next) if multiple attachments
   - Thumbnail strip at bottom
   - Slide info bar: filename and file size
   - Export button in toolbar
4. User presses Escape or clicks close button → lightbox closes, returns to popover

### Step 2b: View Non-Image Attachment
1. User clicks "View" (eye icon) on a non-image attachment (PDF, DOC, etc.)
2. System exports the file to a temporary directory
3. System opens the file in the default system application (via `openPath`)

### Step 3: Close Popover
1. User clicks outside the popover → popover closes
2. Or user presses Escape → popover closes

### Edge Cases
- Single image → lightbox opens with no navigation arrows
- No attachments → indicator shows "+" icon; popover opens with empty state and "Add files" prompt
- Non-image in lightbox → large file icon with "Open in system app" and "Save to disk" buttons

> **Note**: The original plan included a separate Settings toggle for popover vs. lightbox mode (TASK-11.10 / #95). This was removed in favor of the unified flow described above.

---

## Flow 15: Attachment Export & Delete — IMPLEMENTED

### Export Attachment

#### Step 1: Initiate Export
1. User clicks the export (download) icon on an attachment in the popover
2. Or: User clicks the export button in the lightbox toolbar (exports current slide)

#### Step 2: Save Dialog
1. **Screen**: Native save dialog with the original filename as default
2. User selects save location
3. User clicks "Save"

#### Step 3: Export Complete
1. System reads the attachment BLOB from the encrypted database
2. System writes the file to the chosen location
3. Success/error feedback provided
4. If user cancels save dialog → no file written, no error

### Delete Attachment

#### Step 1: Initiate Delete
1. User clicks the delete (trash) icon on an attachment in the popover

#### Step 2: Confirm Delete
1. **Screen**: Inline confirmation appears within the popover row ("Yes" / "No" buttons)
2. User clicks "Yes" to confirm or "No" to cancel

#### Step 3: Delete Complete
1. System performs a soft delete — sets `deleted_at` timestamp on the attachment record
2. Attachment disappears from the popover list
3. Attachment count badge updates immediately
4. If all attachments deleted → indicator reverts to "+" icon

### Error Cases
- Disk full on export → error message shown
- Write permission denied → error message shown
- Cancel delete confirmation → no action taken

---

## References

- See **PRODUCT_REQUIREMENTS.md** for detailed requirements (including US-9 through US-12 for attachments)
- See **UX_INTERACTIONS.md** for interaction patterns
- See **MVP_PLAN.md** for implementation roadmap and phase details
- See **TEST_PLAN.md** for manual and automated test coverage
- See **LICENSING.md** for authoritative licensing spec
- See **LICENSING_MVP_IMPACTS.md** for MVP vs deferred licensing breakdown
