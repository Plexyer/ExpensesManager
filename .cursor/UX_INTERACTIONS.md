# UX Interactions - Excel-Like Behaviors

## Grid Interactions (Excel-Like)

### Cell Selection
- **Click**: Select cell (highlight border)
- **Double-click**: Open transaction modal
- **Arrow keys**: Navigate to adjacent cell (up/down/left/right)
- **Tab**: Move to next cell (right, wrap to next row)
- **Shift+Tab**: Move to previous cell (left, wrap to previous row)
- **Enter**: Move down (or open modal if double-clicked)
- **Escape**: Deselect cell / close modal

### Cell Editing (CONFIRMED - Modal Only)
- **Double-click**: Opens transaction modal (CONFIRMED - no inline editing for MVP)
- **F2**: Opens transaction modal (alternative to double-click)
- **Modal editing**: All transaction editing happens in modal, not inline (CONFIRMED)
- **Inline editing**: OUT OF SCOPE for MVP, may be added post-MVP

### Grid Navigation
- **Scroll**: Mouse wheel or scrollbar (vertical for categories)
- **Headers**: Column headers (Category / Received date / Received amount / Spent amount) stay visible while scrolling
- **Keyboard shortcuts**: 
  - `Ctrl+Home`: Go to first cell (first category, first column)
  - `Ctrl+End`: Go to last cell (last category, last column)
  - `Page Up/Down`: Scroll one page vertically

### Cell Display
- **Format**: "Spent / Remaining" (e.g., "$150.00 / $50.00")
- **Color coding**:
  - Green: Remaining > 0 (under budget)
  - Yellow: Remaining = 0 (at budget)
  - Red: Remaining < 0 (over budget)
- **Tooltip**: Hover shows detailed info (received date, transaction count)

---

## Modal Interactions

### Transaction Modal
- **Opening**: Double-click cell or F2 key
- **Closing**: 
  - "Close" button
  - "X" button (top right)
  - Escape key
  - Click outside modal (backdrop click)
- **Focus**: First input field focused on open
- **Tab navigation**: Tab moves through fields, Shift+Tab reverses
- **Enter**: Saves transaction (if form valid)
- **Escape**: Closes modal (discards unsaved changes with confirmation)

### Form Validation
- **Real-time**: Show errors as user types (or on blur)
- **Error display**: Red border + error message below field
- **Submit**: Disabled until all required fields valid
- **Error messages**:
  - "Description is required"
  - "Amount must be greater than 0"
  - "Date is required"

---

## Keyboard Shortcuts (Global)

### Navigation
- `Ctrl+N`: Create new period budget instance
- `Ctrl+T`: Create new template
- `Ctrl+O`: Open finance file
- `Ctrl+S`: Save (if applicable, or export)
- `Ctrl+E`: Export CSV

### Grid
- `Ctrl+F`: Focus search/filter (if implemented)
- `Ctrl+G`: Go to cell (if implemented)

### Modal
- `Enter`: Submit form / Save transaction
- `Escape`: Close modal / Cancel
- `Tab`: Next field
- `Shift+Tab`: Previous field

---

## Validation & Error States

### Input Validation

#### Amount Field
- **Type**: Number input (decimal allowed)
- **Validation**: 
  - Must be number
  - Can be negative (for refunds)
  - Max 2 decimal places
- **Error**: "Please enter a valid amount"

#### Date Field
- **Type**: Date picker
- **Validation**: 
  - Must be valid date
  - Can be future date (for planned expenses)
- **Error**: "Please enter a valid date"

#### Description Field
- **Type**: Text input
- **Validation**: 
  - Required (non-empty)
  - Max length: 255 characters
- **Error**: "Description is required" or "Description too long"

### Form-Level Validation
- **Required fields**: Highlighted with asterisk (*)
- **Submit button**: Disabled until all required fields valid
- **Error summary**: Show list of errors at top of form (if multiple)

---

## Loading States (CONFIRMED - REQUIRED)

**IMPORTANT**: Loading screens/indicators are REQUIRED for operations that may take time (CONFIRMED). Users should understand when something is loading rather than think the app is frozen.

### Grid Loading (CONFIRMED)
- **Initial load**: Skeleton grid or spinner (REQUIRED)
- **Refresh**: Subtle loading indicator (top right)
- **Cell update**: Brief highlight animation when cell updates
- **Performance target**: <100ms for grid load, <500ms acceptable for large datasets (CONFIRMED)

### Modal Loading (CONFIRMED)
- **Opening**: Fade-in animation (200ms)
- **Saving**: Disable form, show "Saving..." text (REQUIRED)
- **Loading transactions**: Skeleton table rows (REQUIRED for large lists)
- **Virtualization**: Render only visible rows for performance (CONFIRMED)

### File Operations (CONFIRMED)
- **Creating file**: Progress bar or spinner (REQUIRED)
- **Opening file**: "Opening..." message with spinner (REQUIRED)
- **Decrypting**: Show "Unlocking file..." indicator (REQUIRED)
- **Exporting**: Progress bar with "Exporting... X%" (REQUIRED)

---

## Feedback & Confirmation

### Success Messages
- **Toast notification**: Brief message at top/bottom (auto-dismiss after 3s)
- **Examples**:
  - "Transaction added successfully"
  - "Period created successfully"
  - "Template saved successfully"
  - "File exported successfully"

### Error Messages
- **Toast notification**: Red background, stays until dismissed
- **Examples**:
  - "Failed to save transaction. Please try again."
  - "Incorrect password. Please try again."
  - "File is locked. Close other instances."

### Confirmations
- **Delete actions**: Confirmation dialog
  - "Are you sure you want to delete this [item]?"
  - "This action cannot be undone."
  - Buttons: "Cancel" (default) / "Delete" (destructive)

### Undo (Future Enhancement)
- **Not in MVP**: No undo functionality
- **Future**: Undo last action (Ctrl+Z)

---

## Accessibility

### Keyboard Navigation
- **All interactive elements**: Keyboard accessible
- **Focus indicators**: Visible outline (2px blue border)
- **Tab order**: Logical (top to bottom, left to right)

### Screen Reader Support
- **Labels**: All inputs have `aria-label` or associated `<label>`
- **Roles**: 
  - Grid: `role="grid"`
  - Cells: `role="gridcell"`
  - Modal: `role="dialog"`
- **Announcements**: 
  - "Transaction added: $50.00"
  - "Cell selected: Groceries, March 2025"

### Color Contrast
- **Text**: WCAG AA compliant (4.5:1 contrast ratio)
- **Interactive elements**: Clear hover/focus states
- **Color coding**: Not sole indicator (also uses text/icons)

---

## Responsive Design

### Desktop (Primary)
- **Grid**: Full width, scrollable
- **Modal**: Centered, max-width 600px
- **Sidebar**: Always visible (256px width)

### Tablet
- **Grid**: Full width, scrollable
- **Modal**: Centered, max-width 90%
- **Sidebar**: Collapsible (hamburger menu)

### Mobile (Future)
- **Grid**: Stacked view (categories as cards; open received/spent line items via tap)
- **Modal**: Full screen
- **Sidebar**: Drawer menu

---

## Performance Optimizations (CONFIRMED)

### Grid Virtualization (CONFIRMED)
- **Large datasets**: Only render visible cells (CONFIRMED - use virtualization)
- **Scroll performance**: Smooth scrolling with 1000+ rows
- **Lazy loading**: Load transaction data on-demand (when cell opened)
- **Target**: <100ms for grid load (CONFIRMED)

### List Virtualization (CONFIRMED)
- **Line item lists**: Use virtualization for large transaction lists (CONFIRMED)
- **Category lists**: Use virtualization if many categories
- **Render visible only**: Don't render off-screen items

### Debouncing
- **Search/filter**: Debounce input (300ms delay)
- **Auto-save**: Debounce form changes (if auto-save implemented)

### Caching
- **Grid data**: Cache in Redux, refresh on changes
- **Templates**: Cache in Redux, refresh on template changes

### Loading Indicators (CONFIRMED - REQUIRED)
- **Always show loading states**: Never leave user wondering if app is frozen (CONFIRMED)
- **<100ms**: No loading indicator needed
- **100ms-500ms**: Subtle spinner or skeleton
- **>500ms**: Full loading screen with message

---

## Excel-Like Features (Not in MVP, Future)

### Copy/Paste
- **Not in MVP**: No copy/paste support
- **Future**: Copy cell value, paste into other cells

### Drag & Drop
- **Not in MVP**: No drag & drop
- **Future**: Reorder categories by dragging (within a period budget instance)

### Formulas
- **Not in MVP**: No formula support
- **Future**: Custom calculated columns

### Multi-Select
- **Not in MVP**: Single cell selection only
- **Future**: Select multiple cells (Ctrl+Click)

---

## References

- See **UI_FLOWS.md** for user journey flows
- See **PRODUCT_REQUIREMENTS.md** for requirements
- See **MVP_PLAN.md** for implementation roadmap
