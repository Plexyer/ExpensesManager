# Command: Add Tests

## Purpose
Test checklist and patterns for MVP features.

## When to Use
- Testing MVP features
- Creating test plans
- Verifying acceptance criteria
- Adding automated tests alongside new features

## Test Infrastructure

### Frontend: Vitest + React Testing Library
- **Test runner:** Vitest (configured in `vitest.config.ts`)
- **Component testing:** `@testing-library/react`
- **Redux wrapper:** `renderWithProviders` from `src/test/test-utils.tsx`
- **Test location:** Co-located `__tests__/` directories (e.g., `src/components/features/BudgetGrid/__tests__/`)
- **Run tests:** `npx vitest run` (all) or `npx vitest run path/to/test` (single)

### Backend: Inline Rust Tests
- **Test framework:** Built-in `#[cfg(test)]` modules
- **Location:** Inline at the bottom of each `.rs` file
- **Run tests:** `cargo test` from `src-tauri/`

## Frontend Test Patterns

### Component Test with Redux (renderWithProviders)
```typescript
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '@/test/test-utils';
import ComponentName from '../ComponentName';

describe('ComponentName', () => {
  it('renders with default state', () => {
    renderWithProviders(<ComponentName />);
    expect(screen.getByText('Expected Text')).toBeInTheDocument();
  });

  it('renders with preloaded state', () => {
    renderWithProviders(<ComponentName />, {
      preloadedState: {
        budget: {
          gridData: [{ id: 1, name: 'Test Category' }],
          selectedCell: null,
        },
      },
    });
    expect(screen.getByText('Test Category')).toBeInTheDocument();
  });

  it('handles user interaction', async () => {
    const user = userEvent.setup();
    renderWithProviders(<ComponentName />);

    await user.click(screen.getByRole('button', { name: /create/i }));
    expect(screen.getByText('Created')).toBeInTheDocument();
  });
});
```

### Mocking Tauri Invoke
```typescript
import { vi } from 'vitest';

vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn(),
}));

import { invoke } from '@tauri-apps/api/core';

beforeEach(() => {
  vi.mocked(invoke).mockReset();
});

it('calls Tauri command', async () => {
  vi.mocked(invoke).mockResolvedValue({ id: 1, name: 'Test' });

  renderWithProviders(<ComponentName />);
  // ... trigger action ...

  expect(invoke).toHaveBeenCalledWith('command_name', { arg1: 'value' });
});
```

### Testing Accessibility
```typescript
it('has correct ARIA attributes', () => {
  renderWithProviders(<ComponentName />);

  const button = screen.getByRole('button', { name: /save/i });
  expect(button).toBeEnabled();

  const grid = screen.getByRole('grid');
  expect(grid).toBeInTheDocument();
});
```

## Backend Test Patterns (Rust)

### Inline Module Tests
```rust
// At the bottom of src-tauri/src/migrations.rs (or other .rs file)

#[cfg(test)]
mod tests {
    use super::*;
    use rusqlite::Connection;

    #[test]
    fn test_migrations_apply_cleanly() {
        let conn = Connection::open_in_memory().unwrap();
        conn.execute_batch(
            "CREATE TABLE _meta (schema_version INTEGER NOT NULL DEFAULT 0);
             INSERT INTO _meta (schema_version) VALUES (0);"
        ).unwrap();
        run_migrations(&conn).unwrap();

        let version: i64 = conn.query_row(
            "SELECT schema_version FROM _meta", [], |row| row.get(0)
        ).unwrap();
        assert_eq!(version, 5);
    }

    #[test]
    fn test_table_exists_after_migration() {
        let conn = Connection::open_in_memory().unwrap();
        conn.execute_batch(
            "CREATE TABLE _meta (schema_version INTEGER NOT NULL DEFAULT 0);
             INSERT INTO _meta (schema_version) VALUES (0);"
        ).unwrap();
        run_migrations(&conn).unwrap();

        let count: i64 = conn.query_row(
            "SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name='category_line_items'",
            [],
            |row| row.get(0),
        ).unwrap();
        assert_eq!(count, 1);
    }
}
```

## Test Checklist

### Automated Tests
- [ ] Component renders correctly with `renderWithProviders`
- [ ] Redux state changes reflected in UI
- [ ] User interactions trigger expected behavior
- [ ] Error states handled and displayed
- [ ] Tauri invoke mocked and verified
- [ ] Accessibility attributes present

### Manual Testing (when automated not feasible)
- [ ] Test success case
- [ ] Test error cases (wrong password, missing data)
- [ ] Test edge cases (empty state, large dataset, special characters)
- [ ] Test on target platforms (Windows primarily)

## Manual Test Plan Template

### Feature: [Feature Name]

**Acceptance Criteria**:
- [ ] [Criterion 1]
- [ ] [Criterion 2]

**Test Cases**:

#### 1. Success Case
- **Steps**:
  1. [Step 1]
  2. [Step 2]
- **Expected**: [Expected result]
- **Result**: Pass/Fail
- **Notes**: [Any notes]

#### 2. Error Case
- **Steps**:
  1. [Step 1]
  2. [Step 2]
- **Expected**: [Error message displayed]
- **Result**: Pass/Fail

#### 3. Edge Case
- **Steps**:
  1. [Step 1]
- **Expected**: [Expected result]
- **Result**: Pass/Fail

## Test File Location Convention

```
src/components/features/FeatureName/
├── ComponentName.tsx
└── __tests__/
    └── ComponentName.test.tsx

src/hooks/
├── useMyHook.ts
└── __tests__/
    └── useMyHook.test.ts

src/services/
├── myService.ts
└── __tests__/
    └── myService.test.ts
```

## References
- **`.cursor/agents/testing_qa.md`**: Testing strategy guide
- **`src/test/test-utils.tsx`**: `renderWithProviders` helper
- **`.cursor/skills/run-tests/SKILL.md`**: Test execution playbook
- **GitHub Issues**: Acceptance criteria for each task
