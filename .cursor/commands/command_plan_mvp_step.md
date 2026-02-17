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
2. Read the relevant GitHub Issues for the phase
3. Read related UI_FLOWS.md sections
4. Understand acceptance criteria

### Step 2: Identify Components
1. **Data Model**: What schema changes needed?
2. **Backend**: What Tauri commands needed?
3. **Frontend**: What UI components needed?
4. **Integration**: How do components connect?

### Step 3: Break into Tasks
Use `.cursor/skills/mvp-decomposition/SKILL.md` to break into tasks:
- Create tasks as GitHub Issues (labeled `mvp` + `enhancement`)
- Identify dependencies between issues
- Estimate complexity (S / M / L)

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

**Data Model**: `period_budget_instances` and `budget_instance_categories` tables exist (schema v5)

**Backend**: `create_period_from_template` command in `src-tauri/src/encrypted_db.rs`

**Frontend**: `CreatePeriodForm.tsx` component using Tailwind CSS and `useAppDispatch`/`useAppSelector`

**Testing**: Create period, verify categories copied from template, verify PeriodGrid updates

## References
- **MVP_PLAN.md**: MVP steps and phase descriptions
- **GitHub Issues**: Task tracking (labeled `mvp` + `enhancement`)
- **`.cursor/skills/mvp-decomposition/SKILL.md`**: Task decomposition guide
- **`.cursor/agents.md`**: Task picking flow and conventions
