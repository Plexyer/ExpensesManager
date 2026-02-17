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

**User Story**: As a user, I want to create a period from a template so I don't have to recreate category distributions.

**Acceptance Criteria**:
- User can select template
- User can choose cadence
- Period created with categories from template
- Default amounts copied

**UI**: Period creation modal/form

**Data Model**: Uses `period_budget_instances` and `budget_instance_categories` tables (schema v5)

**Backend**: `create_period_from_template` command in `src-tauri/src/encrypted_db.rs`

**Frontend**: `CreatePeriodForm.tsx` component

## References
- **UI_FLOWS.md**: User flows
- **GitHub Issues**: Task breakdown (labeled `mvp` + `enhancement`)
- **MVP_PLAN.md**: Feature phases
