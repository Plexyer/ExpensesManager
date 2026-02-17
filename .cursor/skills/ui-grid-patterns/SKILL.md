# Skill: Grid UI Patterns

## Purpose
How to implement and extend the Excel-like grid UI for the **single-period main grid** (one period budget instance at a time).

## When to Use
- Modifying the main budget grid
- Adding grid interactions (selection, navigation)
- Optimizing grid performance

## Grid Implementation: Custom PeriodGrid

The budget grid is a **custom HTML table** styled with Tailwind CSS — no external grid library is used.

### Why Custom (not AG Grid)
- Smaller bundle size
- Full control over rendering and interactions
- Tailored to envelope budgeting needs
- Tailwind CSS integration

## Component Architecture

### Component Hierarchy
```
PeriodGrid (container — loads data, manages layout)
├── PeriodGridHeader (column headers: Category / Received / Spent / Remaining / Account)
└── PeriodGridTable (scrollable table body)
    └── PeriodGridCell[] (row = category; col = field/rollup)
```

### File Locations
```
src/components/features/BudgetGrid/
├── PeriodGrid.tsx          (main grid container)
├── PeriodGridHeader.tsx    (column header row)
├── PeriodGridTable.tsx     (table body with category rows)
├── PeriodGridCell.tsx      (individual cell rendering)
├── CategoryLedgerModal.tsx (transaction modal — double-click opens)
├── AttachmentIndicator.tsx (attachment icon in cells)
├── AttachmentPopover.tsx   (attachment preview popup)
└── AttachmentLightbox.tsx  (full-size attachment viewer)
```

### Data Flow
1. Load grid data via `get_grid_data` Tauri command (in `encrypted_db.rs`)
2. Store in Redux (`budgetSlice`)
3. Render grid with data
4. Cell selection tracked in Redux (`budgetSlice.selectedCell`)
5. Update on data changes (re-fetch after mutations)

## Key Patterns

### Cell Selection (Redux-managed)
```typescript
// Selection is in Redux budgetSlice, NOT local useState
const selectedCell = useAppSelector((state) => state.budget.selectedCell);
const dispatch = useAppDispatch();

const handleCellClick = (categoryId: number, field: string) => {
  dispatch(setSelectedCell({ categoryId, field }));
};
```

### Double-Click to Open Modal
```typescript
const handleCellDoubleClick = (categoryId: number, columnKey: 'received' | 'spent') => {
  // Opens CategoryLedgerModal for the selected category + kind
  setLedgerModalOpen(true);
  setSelectedCategoryId(categoryId);
  setSelectedKind(columnKey);
};
```

### Frozen Columns/Rows
- Use CSS `position: sticky` for the category name column and header row
- No external library needed

```css
/* Header row stays fixed at top */
thead th { position: sticky; top: 0; z-index: 10; }
/* Category column stays fixed at left */
td:first-child { position: sticky; left: 0; z-index: 5; }
```

## Performance Optimizations

### Lazy Loading
- Load transaction data only when modal opened (via `list_line_items` command)
- Load attachment data only on demand (via `list_attachments`, `get_attachment_data`)
- Cache grid data in Redux (refresh on changes)

### Memoization
```typescript
const PeriodGridCell = React.memo<PeriodGridCellProps>(({ categoryId, field, value }) => {
  // Render cell
}, (prev, next) => {
  return prev.value === next.value && prev.categoryId === next.categoryId;
});
```

### Virtual Scrolling (future)
- Not implemented yet for MVP (category count is typically small)
- Consider `react-window` if category lists grow beyond ~100 rows

## Cell Display Format

### Spent/Remaining
```
$150.00 / $50.00
```
- Format: `spent / remaining`
- Color: Green (remaining > 0), Yellow (remaining = 0), Red (remaining < 0)
- Currency formatting via locale-aware `Intl.NumberFormat`

### Tooltip on Hover
- Transaction count
- Last transaction date
- Detailed breakdown

## Keyboard Navigation

### Supported Keys
- **Arrow keys**: Navigate cells
- **Tab**: Next cell (right, wrap to next row)
- **Shift+Tab**: Previous cell
- **Enter**: Open modal (or move down)
- **Escape**: Deselect cell / close modal
- **F2**: Open modal (alternative to double-click)

### Implementation
```typescript
useEffect(() => {
  const handleKeyDown = (e: KeyboardEvent) => {
    if (!selectedCell) return;
    if (e.key === 'ArrowRight') {
      dispatch(moveSelectedCell('right'));
    } else if (e.key === 'ArrowDown') {
      dispatch(moveSelectedCell('down'));
    }
    // ... other keys
  };

  window.addEventListener('keydown', handleKeyDown);
  return () => window.removeEventListener('keydown', handleKeyDown);
}, [selectedCell, dispatch]);
```

## Accessibility

### ARIA Roles
```tsx
<table role="grid" aria-label="Budget grid">
  <thead>
    <tr role="row">
      <th role="columnheader">Category</th>
      <th role="columnheader">Received</th>
      <th role="columnheader">Spent</th>
    </tr>
  </thead>
  <tbody>
    <tr role="row">
      <td role="gridcell" aria-label="Groceries, Spent amount">
        $150.00 / $50.00
      </td>
    </tr>
  </tbody>
</table>
```

### Keyboard Navigation
- All cells keyboard accessible
- Focus indicators visible (Tailwind `ring` utility)
- Tab order logical
- `aria-selected` on active cell

## Tauri Commands Used by Grid
| Command | Purpose |
|---|---|
| `get_grid_data` | Load full grid data for a period instance |
| `list_line_items` | Load transactions for modal |
| `create_line_item` | Add transaction from modal |
| `update_line_item` | Edit transaction from modal |
| `delete_line_item` | Remove transaction from modal |
| `list_attachments` | Load attachments for a line item |
| `add_attachment` | Upload attachment |

## References
- **UI_FLOWS.md**: User journey flows
- **`src/components/features/BudgetGrid/`**: All grid components
- **`src/store/slices/budgetSlice.ts`**: Grid state management
- **react-window** (future): https://github.com/bvaughn/react-window

## Output
Use these patterns when modifying or extending the budget grid.
