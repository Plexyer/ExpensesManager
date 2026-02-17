# UX Interactions - Excel-Like Behaviors

## Grid Interactions (Excel-Like)

### Cell Selection (IMPLEMENTED)
- **Click**: Select cell (blue focus ring: `ring-2 ring-inset ring-blue-500 bg-blue-500/10`)
- **Double-click**: Open transaction modal (only for openable cells: received_amount, spent_amount)
- **Arrow keys**: Navigate to adjacent cell (up/down/left/right), clamped to grid bounds
- **Tab**: Move to next cell (right, wraps to first cell of next row)
- **Shift+Tab**: Move to previous cell (left, wraps to last cell of previous row)
- **Enter**: Open ledger modal for openable cells (received_amount, spent_amount)
- **Escape**: Clear cell selection
- **Openable cells**: Shown with `underline decoration-dotted`, tooltip "Double-click to view"

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

## Attachment Interactions — IMPLEMENTED (Phase 11)

### AttachmentIndicator (on each line item row in CategoryLedgerModal)

#### Visual States
- **No attachments** (`count === 0`): Plus icon (slate-500), hover transitions to emerald-400
- **Has image attachment**: Rounded thumbnail (w-5 h-5), hover shows emerald ring
- **Has non-image attachment**: File icon (slate-400), hover transitions to emerald-400
- **Count badge**: Emerald badge (top-right) when `count > 1`; shows "99+" if over 99

#### Interactions
- **Click**: Opens AttachmentPopover anchored to the indicator
- **Keyboard**: Enter or Space triggers same click action (synthesizes mouse event from keyboard target)
- **Hover**: Color transitions (slate to emerald), ring on image thumbnails

#### Accessibility
- `aria-label`: "Attach file" when no attachments; "View X attachments" when present
- `tabIndex={0}`: Keyboard focusable
- `aria-hidden="true"` on decorative icons/images

---

### AttachmentPopover (floating dialog)

#### Opening & Positioning
- Triggered by clicking the AttachmentIndicator
- Fixed positioning relative to anchor element
- Default: below and left-aligned to anchor
- Clamps to viewport edges (8px gap); flips above if insufficient space below
- Width: 320px; max-height: 400px with scroll

#### Content
- List of attachments, each showing: thumbnail (or file icon), filename (truncated), file size, action buttons
- Loading state: skeleton rows (3 items, pulse animation)
- Empty state: camera icon with "Add files" prompt

#### Actions
- **View** (eye icon): Opens lightbox for images; opens system app for non-images
- **Export** (download icon): Opens native save dialog with original filename
- **Delete** (trash icon): Shows inline confirmation (Yes/No buttons within the row)
- **Add** (plus button): Opens native file picker (multi-select enabled), file filters: Images, Documents, All Files

#### Closing
- Click outside the popover
- Press Escape (or cancels inline delete confirmation if active)

#### Keyboard
- Escape: Closes popover, or cancels active delete confirmation
- Tab: Navigates through action buttons within the popover
- All action buttons have `tabIndex={0}`

#### Accessibility
- `role="dialog"`, `aria-modal="false"`
- `aria-label`: "X attachments"
- `role="list"` on attachment list

---

### AttachmentLightbox (full-screen gallery)

#### Opening
- Triggered by clicking "View" on an image attachment in the popover
- Library: `yet-another-react-lightbox` with Zoom and Thumbnails plugins

#### Navigation
- **Arrow Left/Right keys**: Navigate between attachments
- **Thumbnail strip** at bottom (80x60px, 8px gap, emerald border on active slide)
- **Thumbnail toggle button**: Show/hide the strip

#### Zoom
- **Mouse wheel**: Scroll-to-zoom (enabled, `scrollToZoom: true`)
- **Max zoom**: 5x pixel ratio (`maxZoomPixelRatio: 5`)

#### Non-Image Files
- Custom slide renderer with large file icon
- "Open in system app" button (emerald) and "Save to disk" button (slate)
- Displays filename, MIME type, and file size

#### Toolbar
- Export button (saves current slide to disk via native save dialog)
- Close button (built-in)
- Labels are internationalized

#### Closing
- Escape key
- Close button in toolbar

#### Visual Feedback
- Slide info bar: filename + file size at top (semi-transparent black background)
- Dark slate background (`rgba(15, 23, 42, 0.97)`)

#### Accessibility
- All buttons have `aria-label` with filename context
- `tabIndex={0}` on action buttons
- `aria-hidden="true"` on decorative icons

---

### File Size Warning Dialog

#### Trigger
- Shown when a selected file exceeds 25 MB soft limit
- Files are checked sequentially; each large file prompts individually

#### Content
- Amber warning icon (triangle SVG)
- Filename and formatted file size displayed
- Note about the 25 MB soft limit

#### Actions
- **"Upload Anyway"** (emerald button): Proceeds with upload (no hard limit enforced)
- **"Cancel"** (slate button): Skips this file, moves to next

#### Keyboard
- Escape: Triggers Cancel action
- Focus trap: Dialog captures focus on open

#### Accessibility
- `role="alertdialog"`, `aria-modal="true"`
- `aria-labelledby` and `aria-describedby` for title and description
- Click outside (backdrop) also closes dialog

---

## Column Resize Interactions — IMPLEMENTED (Phase 10, Bug Fixes #81–85)

### Resizable Columns
- Only **Received Amount** and **Spent Amount** columns are resizable (`resizable: true` in `GridColumnConfig`)
- **Frozen columns** (Category, Received Date): auto-sized, non-resizable, no resize handles
- **Remaining column**: auto-sized to fill, non-resizable, fixed-width

### Paired Resize Behavior (Excel-Style)
- Resizing one column adjusts its neighbor — total width is preserved (zero-sum)
- A single resize handle exists between "Received Amount" (col 2) and "Spent Amount" (col 3)
- Minimum column width: 60px (`MIN_COLUMN_WIDTH`) — each column clamped to this minimum
- Right column computed as: `totalWidth - leftWidth`

### Mouse Interaction
- **Mousedown** on resize handle: Starts drag
- **Mousemove** on document: Updates both column widths in real-time
- **Mouseup** on document: Ends drag, persists new widths to database via `settingsService`
- Cursor changes to `col-resize` during drag
- `user-select: none` applied during drag to prevent text selection

### Keyboard Interaction
- **ArrowLeft/ArrowRight** on focused resize handle: Adjusts width by 10px steps
- Same paired resize logic as mouse (both columns adjust)
- Widths persist to database immediately on key press

### Snap-to-Content
- Magnetic snap threshold: 8px from optimal content width
- Snaps to `optimalWidth` when within threshold (stored in Redux `optimalWidths`)
- Priority: left column snaps first, then right if left didn't snap

### Scale Factor Correction
- Accounts for CSS width vs rendered width mismatch (`scaleFactor = tableRenderedWidth / totalCssWidth`)
- Mouse delta divided by scale factor for accurate 1:1 mouse-to-column movement
- Fixes amplified resize bug (#84)

### Visual Feedback
- Handle: `w-1 h-full` absolute positioned at column right edge
- Hover: `bg-blue-500/60`
- Active (dragging): `bg-blue-500/80`
- Transition: `transition-colors`

### Accessibility
- `role="separator"`, `aria-orientation="vertical"`
- `aria-label="Resize column border"`
- `tabIndex={0}`: Keyboard focusable

---

## Template Drag-and-Drop — IMPLEMENTED (Phase 3)

### Library
- `@hello-pangea/dnd` (react-beautiful-dnd fork)
- `DragDropContext` wraps category list; each item is a `Draggable` inside a `Droppable`

### Drag Handle
- 6-dot grip icon (SVG) on each category item
- `cursor-grab` at rest; `active:cursor-grabbing` during drag
- Color: `text-slate-500`, hover: `text-slate-300`

### Drag Behavior
- Drag handle only — cannot drag from other parts of the row
- `provided.placeholder` renders at the drop target location during drag
- `snapshot.isDragging` drives visual feedback on the dragged item

### Visual Feedback During Drag
- Dragged item: `shadow-lg shadow-black/30`, `border-blue-500/50`, `bg-slate-700`
- Transition: `transition-shadow`
- Drop placeholder shown at target position

### Drop Behavior
- Dropped outside list: no-op (drag cancelled)
- Dropped at same position: no-op
- Dropped at new position: array reordered via `splice()`, new order persists to database

### Other Row Interactions
- **Amount editing**: Click edit icon opens inline number input; Enter saves, Escape cancels
- **Remove category**: Click X icon removes category from template
- All buttons have hover states and `aria-label`

### Empty State
- "No categories yet" message if list is empty

### Accessibility
- Drag handle: `aria-label` with category name context
- Edit/Remove buttons: descriptive `aria-label`
- Input: `aria-label` for amount editing

---

## Keyboard Shortcuts

### Grid Navigation (IMPLEMENTED)
- **Arrow keys**: Move selection to adjacent cell (up/down/left/right)
- **Tab / Shift+Tab**: Move to next/previous cell (wraps to next/previous row)
- **Home / End**: Move to first/last column in current row
- **Ctrl+Home / Ctrl+End**: Move to first/last cell in grid
- **Enter**: Open ledger modal for openable cells (received_amount, spent_amount)
- **Escape**: Clear cell selection

### Modal (IMPLEMENTED)
- **Enter**: Submit form / Save transaction
- **Escape**: Close modal / Cancel
- **Tab / Shift+Tab**: Navigate between form fields

### Attachment Shortcuts (IMPLEMENTED)
- **Enter / Space** on AttachmentIndicator: Open popover
- **Escape** in AttachmentPopover: Close popover (or cancel delete confirmation)
- **Arrow Left/Right** in AttachmentLightbox: Navigate between slides
- **Escape** in AttachmentLightbox: Close gallery
- **Mouse wheel** in AttachmentLightbox: Zoom in/out

### Column Resize (IMPLEMENTED)
- **ArrowLeft / ArrowRight** on focused resize handle: Adjust column width by 10px

### Global Shortcuts (PLANNED — not yet implemented)
> The following shortcuts are planned for future implementation but are NOT currently wired up in the application:

- `Ctrl+N`: Create new period budget instance
- `Ctrl+T`: Create new template
- `Ctrl+O`: Open finance file
- `Ctrl+S`: Save / export
- `Ctrl+E`: Export CSV
- `Ctrl+F`: Focus search/filter
- `Ctrl+G`: Go to cell

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
  - Grid: `role="grid"` (table wrapper: `role="region"`)
  - Cells: `role="gridcell"` with `aria-selected`
  - Modal: `role="dialog"`
  - Attachment popover: `role="dialog"` with `aria-label`
  - File size warning: `role="alertdialog"` with `aria-modal="true"`
  - Column resize handle: `role="separator"` with `aria-orientation="vertical"`
  - Attachment list: `role="list"`
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

### Drag & Drop (Grid-Level)
- **Template categories**: IMPLEMENTED — drag-and-drop reordering via `@hello-pangea/dnd` (see Template Drag-and-Drop section above)
- **Grid-level reorder**: Not in MVP — reordering categories within a period budget instance grid is a future enhancement

### Formulas
- **Not in MVP**: No formula support
- **Future**: Custom calculated columns

### Multi-Select
- **Not in MVP**: Single cell selection only
- **Future**: Select multiple cells (Ctrl+Click)

---

## References

- See **UI_FLOWS.md** for user journey flows (Flows 13–15 for attachment journeys)
- See **PRODUCT_REQUIREMENTS.md** for requirements (US-9 through US-12 for attachments)
- See **MVP_PLAN.md** for implementation roadmap
- See **TEST_PLAN.md** for manual and automated test coverage
- See **GRID_ARCHITECTURE.md** for grid component hierarchy
- See **COLUMN_RESIZE_SPEC.md** for column resize specification details
