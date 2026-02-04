# Command: Plan MVP Step

## Purpose
Turn one MVP step from MVP_PLAN.md into a detailed implementation plan.

## When to Use
- Starting work on an MVP phase/step
- Need detailed plan before implementation
- Breaking down large step into smaller tasks

## Process

### Step 1: Read MVP Step
1. Read MVP_PLAN.md for step description
2. Read related PRODUCT_REQUIREMENTS.md sections
3. Read related UI_FLOWS.md sections
4. Understand acceptance criteria

### Step 2: Identify Components
1. **Data Model**: What schema changes needed?
2. **Backend**: What Tauri commands needed?
3. **Frontend**: What UI components needed?
4. **Integration**: How do components connect?

### Step 3: Break into Tasks
Use skill_mvp_decomposition.md to break into tasks:
- Create tasks following BACKLOG.md format
- Identify dependencies
- Estimate complexity

### Step 4: Create Implementation Plan
Document:
- Task order
- Dependencies
- Files to create/modify
- Testing strategy

## Output Format

```markdown
## Implementation Plan: [Step Name]

### Overview
[Brief description]

### Tasks
1. **TASK-X.1**: [Task name]
   - Goal: ...
   - Files: ...
   - Dependencies: ...

### Data Model Changes
- [Schema changes needed]

### Backend Changes
- [Commands to create/modify]

### Frontend Changes
- [Components to create/modify]

### Testing Strategy
- [How to test]

### Dependencies
- [Other steps/tasks that must complete first]
```

## Example

### Step: Create Period from Template

**Tasks**:
1. TASK-6.1: Create Period Creation Form (UI)
2. TASK-6.2: Implement Period Creation Backend
3. TASK-6.3: Update Grid to Show New Period

**Data Model**: Periods table exists (from Phase 2)

**Backend**: `create_period` command

**Frontend**: `CreatePeriodForm.tsx` component

**Testing**: Create period, verify envelopes copied, verify grid updates

## References
- **MVP_PLAN.md**: MVP steps
- **BACKLOG.md**: Task breakdown
- **skill_mvp_decomposition.md**: Task decomposition guide
