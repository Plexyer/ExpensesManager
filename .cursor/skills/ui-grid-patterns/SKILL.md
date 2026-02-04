# Skill: Grid UI Patterns

## Purpose
How to implement Excel-like grid UI patterns for the **single-period main grid** (one period budget instance at a time).

## When to Use
- Implementing the main budget grid
- Adding grid interactions (selection, navigation)
- Optimizing grid performance

## Grid Library Options

### Option 1: AG Grid (Currently Used)
**Pros**:
- ✅ Already in codebase (`ag-grid-community`, `ag-grid-react`)
- ✅ Virtualization built-in
- ✅ Excel-like features (selection, keyboard nav)
- ✅ Frozen columns/rows support

**Cons**:
- ❌ Large bundle size
- ❌ Learning curve
- ❌ May be overkill for MVP

**Usage**: Continue using AG Grid if already familiar, or switch to custom

### Option 2: Custom Grid (React)
**Pros**:
- ✅ Full control
- ✅ Smaller bundle size
- ✅ Tailored to needs

**Cons**:
- ❌ More code to write
- ❌ Need to implement virtualization
- ❌ Need to implement frozen columns

**Usage**: Consider if AG Grid is too heavy or doesn't fit needs

## Grid Architecture

### Component Structure
```
BudgetInstanceGrid (container)
├── GridHeader (column headers: Category / Received date / Received amount / Spent amount)
└── GridBody (scrollable content area)
    └── GridCell[] (row = category; col = field/rollup)
```

### Data Flow
1. Load grid data via `get_grid_data` command
2. Store in Redux (`budget.gridData`)
3. Render grid with data
4. Update on data changes

## Key Patterns

### Cell Selection
```typescript
const [selectedCell, setSelectedCell] = useState<{rowId: number; columnKey: string} | null>(null);

const handleCellClick = (rowId: number, columnKey: string) => {
  setSelectedCell({ rowId, columnKey });
};

const handleKeyDown = (e: KeyboardEvent) => {
  if (e.key === 'ArrowRight') {
    // Move to next column (field)
  } else if (e.key === 'ArrowDown') {
    // Move to next category row
  }
};
```

### Double-Click to Open Modal
```typescript
const handleCellDoubleClick = (rowId: number, columnKey: 'received' | 'spent') => {
  setLedgerModalOpen(true);
  setSelectedRowId(rowId);
  setSelectedKind(columnKey);
};
```

### Frozen Columns/Rows
- **AG Grid**: Use `pinned` property
- **Custom**: Use CSS `position: sticky`

### Virtualization
- **AG Grid**: Built-in (enable `rowBuffer`, `rowModelType: 'viewport'`)
- **Custom**: Use `react-window` or `react-virtualized`

## Performance Optimizations

### Lazy Loading
- Load transaction data only when cell opened (modal)
- Cache grid data in Redux
- Refresh on data changes

### Virtual Scrolling
- Only render visible cells
- Use windowing library if custom grid

### Memoization
```typescript
const GridCell = React.memo(({ envelopeId, periodId, data }) => {
  // Render cell
}, (prev, next) => {
  // Custom comparison
  return prev.data === next.data;
});
```

## Cell Display Format

### Spent/Remaining
```
$150.00 / $50.00
```
- Format: `spent / remaining`
- Color: Green (remaining > 0), Yellow (remaining = 0), Red (remaining < 0)

### Tooltip on Hover
- Received/distributed date
- Transaction count
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
    if (e.key === 'ArrowRight' && selectedCell) {
      // Move to next column (field)
    }
    // ... other keys
  };
  
  window.addEventListener('keydown', handleKeyDown);
  return () => window.removeEventListener('keydown', handleKeyDown);
}, [selectedCell]);
```

## Accessibility

### ARIA Roles
```tsx
<div role="grid" aria-label="Budget grid">
  <div role="row">
    <div role="gridcell" aria-label="Groceries, Current period, Spent amount">
      $150.00 / $50.00
    </div>
  </div>
</div>
```

### Keyboard Navigation
- All cells keyboard accessible
- Focus indicators visible
- Tab order logical

## References
- **UX_INTERACTIONS.md**: Detailed interaction patterns
- **UI_FLOWS.md**: User journey flows
- **AG Grid Docs**: https://www.ag-grid.com/
- **react-window**: https://github.com/bvaughn/react-window

## Output
Implement grid component following these patterns.
