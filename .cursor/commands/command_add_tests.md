# Command: Add Tests

## Purpose
Test checklist and patterns for MVP features.

## When to Use
- Testing MVP features
- Creating test plans
- Verifying acceptance criteria

## Test Checklist

### Unit Tests (Future)
- [ ] Test business logic functions
- [ ] Test utility functions
- [ ] Test data transformations

### Integration Tests (Future)
- [ ] Test Tauri commands
- [ ] Test database operations
- [ ] Test API integration

### Manual Testing (MVP)
- [ ] Test success case
- [ ] Test error cases
- [ ] Test edge cases
- [ ] Test on target platforms

## Manual Test Plan Template

### Feature: [Feature Name]

**Acceptance Criteria**:
- ✅ [Criterion 1]
- ✅ [Criterion 2]

**Test Cases**:

#### 1. Success Case
- **Steps**:
  1. [Step 1]
  2. [Step 2]
- **Expected**: [Expected result]
- **Result**: ✅/❌
- **Notes**: [Any notes]

#### 2. Error Case
- **Steps**:
  1. [Step 1]
  2. [Step 2]
- **Expected**: [Error message]
- **Result**: ✅/❌
- **Notes**: [Any notes]

#### 3. Edge Case
- **Steps**:
  1. [Step 1]
- **Expected**: [Expected result]
- **Result**: ✅/❌
- **Notes**: [Any notes]

## Test Scenarios

### Common Scenarios
1. **Empty State**: Test with no data
2. **Large Dataset**: Test with 1000+ items
3. **Error Handling**: Test wrong password, network errors
4. **Edge Cases**: Negative amounts, future dates, empty strings

### Platform Testing
- [ ] Windows
- [ ] macOS
- [ ] Linux

## Test Documentation

### Test Results Format
```markdown
## Test Results: [Feature Name]

**Date**: YYYY-MM-DD
**Tester**: [Name]
**Platform**: Windows/macOS/Linux

### Results
- ✅ Success case: PASS
- ✅ Error case: PASS
- ❌ Edge case: FAIL (issue: ...)

### Issues Found
1. [Issue description]
2. [Issue description]

### Notes
[Any additional notes]
```

## Future: Automated Tests

### Frontend Tests (Jest + React Testing Library)
```typescript
import { render, screen } from '@testing-library/react';
import ComponentName from './ComponentName';

test('renders component', () => {
  render(<ComponentName />);
  expect(screen.getByText('Expected Text')).toBeInTheDocument();
});
```

### Backend Tests (Rust)
```rust
#[cfg(test)]
mod tests {
    use super::*;
    
    #[test]
    fn test_function() {
        // Test implementation
    }
}
```

## References
- **testing_qa agent**: Testing guide
- **BACKLOG.md**: Acceptance criteria
- **PRODUCT_REQUIREMENTS.md**: Requirements
