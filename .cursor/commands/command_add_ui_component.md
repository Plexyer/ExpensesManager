# Command: Add UI Component

## Purpose
Pattern for adding React/TypeScript UI components (grid, modal, form).

## When to Use
- Creating new UI component
- Adding grid/modal/form component
- Following existing patterns

## Component Patterns

### Functional Component Template
```typescript
import React, { useState, useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '@/store/store';

interface ComponentProps {
  prop1: string;
  prop2?: number;
}

const ComponentName: React.FC<ComponentProps> = ({ prop1, prop2 }) => {
  const dispatch = useAppDispatch();
  const data = useAppSelector((state) => state.budget.someData);
  const [localState, setLocalState] = useState<string>('');

  useEffect(() => {
    // Load data via Tauri invoke
  }, []);

  const handleAction = async () => {
    // Handle action
  };

  return (
    <div className="p-4">
      {/* Component JSX with Tailwind classes */}
    </div>
  );
};

export default ComponentName;
```

## Component Types

### Grid Component (Custom PeriodGrid pattern)
```typescript
// Custom HTML table with Tailwind — no external grid library
const MyGrid: React.FC<MyGridProps> = ({ instanceId }) => {
  const dispatch = useAppDispatch();
  const categories = useAppSelector((state) => state.budget.categories);
  const selectedCell = useAppSelector((state) => state.budget.selectedCell);

  useEffect(() => {
    invoke('get_grid_data', { instanceId })
      .then((data) => dispatch(setGridData(data)));
  }, [instanceId, dispatch]);

  const handleCellClick = (categoryId: number, field: string) => {
    dispatch(setSelectedCell({ categoryId, field }));
  };

  return (
    <div className="overflow-auto">
      <table className="w-full border-collapse" role="grid">
        <thead>
          <tr role="row">
            <th className="sticky top-0 bg-white z-10 p-2 text-left font-medium" role="columnheader">
              Category
            </th>
            {/* ... more column headers */}
          </tr>
        </thead>
        <tbody>
          {categories.map((cat) => (
            <tr key={cat.id} role="row">
              <td
                role="gridcell"
                className="sticky left-0 bg-white z-5 p-2 cursor-pointer"
                onClick={() => handleCellClick(cat.id, 'name')}
                tabIndex={0}
                aria-label={`${cat.name}, Category`}
              >
                {cat.name}
              </td>
              {/* ... more cells */}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
```

### Modal Component
```typescript
interface TransactionModalProps {
  open: boolean;
  onClose: () => void;
  categoryId: number;
  kind: 'received' | 'spent';
}

const TransactionModal: React.FC<TransactionModalProps> = ({ open, onClose, categoryId, kind }) => {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/30" onClick={onClose} aria-hidden="true" />
      <div className="relative bg-white rounded-lg shadow-xl p-6 max-w-lg w-full mx-4">
        <h2 className="text-xl font-bold mb-4">
          {kind === 'received' ? 'Received' : 'Spent'} Transactions
        </h2>
        {/* Modal content */}
        <button
          className="mt-4 px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
          onClick={onClose}
        >
          Close
        </button>
      </div>
    </div>
  );
};
```

### Form Component
```typescript
interface CreatePeriodFormProps {
  onSubmit: (data: FormData) => void;
  onCancel: () => void;
}

const CreatePeriodForm: React.FC<CreatePeriodFormProps> = ({ onSubmit, onCancel }) => {
  const [name, setName] = useState('');
  const [startDate, setStartDate] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({ name, startDate });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="name" className="block text-sm font-medium text-gray-700">
          Name
        </label>
        <input
          id="name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="mt-1 block w-full rounded border-gray-300 shadow-sm"
          required
        />
      </div>
      <div className="flex gap-2">
        <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
          Create
        </button>
        <button type="button" onClick={onCancel} className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300">
          Cancel
        </button>
      </div>
    </form>
  );
};
```

## Styling

### Tailwind CSS v4
Tailwind v4 is configured via `@tailwindcss/vite` plugin in `vite.config.ts`. No separate `tailwind.config.js` or `postcss.config.js` needed.

```typescript
<div className="bg-white rounded-lg shadow-md p-6">
  <h2 className="text-xl font-bold text-gray-900 mb-4">Title</h2>
  <button className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 focus:ring-2 focus:ring-blue-500">
    Button
  </button>
</div>
```

## State Management

### Redux (Global State — 4 slices)
```typescript
import { useAppDispatch, useAppSelector } from '@/store/store';
import { setSelectedCell } from '@/store/slices/budgetSlice';

const dispatch = useAppDispatch();
const data = useAppSelector((state) => state.budget.gridData);
const selectedCell = useAppSelector((state) => state.budget.selectedCell);

dispatch(setSelectedCell({ categoryId, field }));
```

Available slices: `fileSlice`, `budgetSlice`, `categorySlice`, `templateSlice`.

### Local State (UI Only)
```typescript
const [isOpen, setIsOpen] = useState(false);
const [selectedItem, setSelectedItem] = useState<number | null>(null);
```

## File Organization

### Location
```
src/components/features/FeatureName/
├── ComponentName.tsx
├── __tests__/
│   └── ComponentName.test.tsx
└── types.ts (if needed)
```

### Actual Example (BudgetGrid)
```
src/components/features/BudgetGrid/
├── PeriodGrid.tsx
├── PeriodGridHeader.tsx
├── PeriodGridTable.tsx
├── PeriodGridCell.tsx
├── CategoryLedgerModal.tsx
├── AttachmentIndicator.tsx
├── AttachmentPopover.tsx
├── AttachmentLightbox.tsx
└── __tests__/
    └── (test files)
```

## Best Practices

### Do's
- Use TypeScript for all components (`React.FC<Props>` or `const` with typed props)
- Use functional components with hooks
- Use Tailwind CSS for all styling (no separate CSS files)
- Handle loading and error states
- Use descriptive component names (PascalCase)
- Add accessibility attributes (`role`, `aria-label`, `tabIndex`)
- Use `useAppDispatch`/`useAppSelector` typed hooks

### Don'ts
- Don't use class components
- Don't use inline styles (use Tailwind)
- Don't forget error handling for Tauri invoke calls
- Don't forget loading states during async operations

## References
- **`.cursor/agents/react_grid_architect.md`**: Grid component guide
- **`.cursor/skills/ui-grid-patterns/SKILL.md`**: Grid patterns
- **UI_FLOWS.md**: User flows
- Existing components in `src/components/features/BudgetGrid/`
