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
import { useDispatch, useSelector } from 'react-redux';

interface ComponentProps {
  prop1: string;
  prop2?: number;
}

function ComponentName({ prop1, prop2 }: ComponentProps) {
  const dispatch = useDispatch();
  const data = useSelector((state) => state.slice.data);
  const [localState, setLocalState] = useState<string>('');
  
  useEffect(() => {
    // Load data
  }, []);
  
  const handleAction = async () => {
    // Handle action
  };
  
  return (
    <div className="container">
      {/* Component JSX */}
    </div>
  );
}

export default ComponentName;
```

## Component Types

### Grid Component
```typescript
// Use AG Grid or custom grid
import { AgGridReact } from 'ag-grid-react';

function PeriodGrid() {
  const [rowData, setRowData] = useState([]);
  const [columnDefs, setColumnDefs] = useState([]);
  
  return (
    <div className="ag-theme-alpine" style={{ height: 400 }}>
      <AgGridReact
        rowData={rowData}
        columnDefs={columnDefs}
        onCellDoubleClicked={handleCellDoubleClick}
      />
    </div>
  );
}
```

### Modal Component
```typescript
import { Dialog } from '@headlessui/react';

function TransactionModal({ open, onClose, envelopeId, periodId }) {
  return (
    <Dialog open={open} onClose={onClose}>
      <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
      <div className="fixed inset-0 flex items-center justify-center">
        <Dialog.Panel className="bg-white rounded-lg p-6">
          {/* Modal content */}
        </Dialog.Panel>
      </div>
    </Dialog>
  );
}
```

### Form Component
```typescript
import { useForm } from 'react-hook-form';

function CreatePeriodForm({ onSubmit, onCancel }) {
  const { register, handleSubmit, formState: { errors } } = useForm();
  
  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <input {...register('name', { required: true })} />
      {errors.name && <span>Name is required</span>}
      <button type="submit">Create</button>
      <button type="button" onClick={onCancel}>Cancel</button>
    </form>
  );
}
```

## Styling

### Tailwind CSS
```typescript
<div className="bg-white rounded-lg shadow-md p-6">
  <h2 className="text-xl font-bold text-gray-900 mb-4">Title</h2>
  <button className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
    Button
  </button>
</div>
```

## State Management

### Redux (Global State)
```typescript
import { useDispatch, useSelector } from 'react-redux';
import { loadData } from '../store/slices/budgetSlice';

const dispatch = useDispatch();
const data = useSelector((state) => state.budget.data);

useEffect(() => {
  dispatch(loadData());
}, [dispatch]);
```

### Local State (UI Only)
```typescript
const [isOpen, setIsOpen] = useState(false);
const [selectedItem, setSelectedItem] = useState(null);
```

## File Organization

### Location
```
src/components/features/FeatureName/
├── ComponentName.tsx
├── ComponentName.test.tsx (if tests)
└── types.ts (if needed)
```

### Example
```
src/components/features/BudgetGrid/
├── PeriodGrid.tsx
├── CreatePeriodForm.tsx
└── GridCell.tsx
```

## Best Practices

### Do's
- ✅ Use TypeScript for all components
- ✅ Use functional components with hooks
- ✅ Use Tailwind CSS for styling
- ✅ Use Headless UI for accessible components
- ✅ Handle loading and error states
- ✅ Use descriptive component names (PascalCase)

### Don'ts
- ❌ Don't use class components
- ❌ Don't use inline styles (use Tailwind)
- ❌ Don't forget error handling
- ❌ Don't forget loading states

## References
- **react_grid_architect agent**: Grid component guide
- **skill_ui_grid_patterns.md**: Grid patterns
- **UX_INTERACTIONS.md**: Interaction patterns
- Existing components in `src/components/features/`
