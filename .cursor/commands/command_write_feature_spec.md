# Command: Write Feature Specification

## Purpose
Create a feature specification document for a new MVP feature.

## When to Use
- Starting a new feature
- Need to document feature requirements
- Clarifying feature scope

## Template

```markdown
# Feature Specification: [Feature Name]

## Overview
[Brief description of feature]

## User Stories
[As a... I want to... So that...]

## Acceptance Criteria
- ✅ [Criterion 1]
- ✅ [Criterion 2]
- ✅ [Criterion 3]

## UI/UX Requirements
- [UI components needed]
- [Interaction patterns]
- [Error states]

## Data Model
- [Schema changes]
- [New tables/columns]

## Backend Requirements
- [Tauri commands]
- [Business logic]

## Frontend Requirements
- [Components]
- [State management]
- [API calls]

## Edge Cases
- [Edge case 1]
- [Edge case 2]

## Dependencies
- [Other features/tasks]

## Testing
- [Test scenarios]

## References
- [Related docs]
```

## Example

### Feature: Create Period from Template

**User Story**: As a user, I want to create a period from a template so I don't have to recreate envelope distributions.

**Acceptance Criteria**:
- ✅ User can select template
- ✅ User can choose cadence
- ✅ Period created with envelopes from template
- ✅ Default amounts copied

**UI**: Period creation modal/form

**Data Model**: Use existing `periods` table

**Backend**: `create_period` command

**Frontend**: `CreatePeriodForm.tsx`

## References
- **PRODUCT_REQUIREMENTS.md**: Feature requirements
- **UI_FLOWS.md**: User flows
- **BACKLOG.md**: Task structure
