# Skill: MVP Task Decomposition

## Purpose
How to break down MVP features into small, implementable tasks following the GitHub Issues structure.

## When to Use
- Planning a new MVP feature
- Breaking down a large feature into tasks
- Creating new GitHub Issues

## Process

### Step 1: Understand the Feature
1. Read PRODUCT_REQUIREMENTS.md for feature requirements
2. Read UI_FLOWS.md for user journey
3. Read UX_INTERACTIONS.md for interaction patterns
4. Identify acceptance criteria

### Step 2: Identify Dependencies
1. What data model changes are needed?
2. What backend commands are needed?
3. What UI components are needed?
4. What existing code needs modification?

### Step 3: Break into Tasks
Break feature into tasks using this structure:

**Task Format**:
- **Goal**: One sentence describing what needs to be accomplished
- **Scope**: What's included/excluded
- **Acceptance Criteria**: How to verify completion (3-5 bullet points)
- **Likely Areas/Files**: Where changes will be made
- **Complexity**: S (1-2 days), M (3-5 days), L (1+ weeks)
- **Dependencies**: Other tasks that must complete first

### Step 4: Order Tasks
1. **Foundation first**: Data model → Backend → Frontend
2. **Dependencies**: Tasks that depend on others come after
3. **Parallel work**: Identify tasks that can be done in parallel

### Step 5: Estimate Complexity
- **S (Small)**: 1-2 days, straightforward implementation
- **M (Medium)**: 3-5 days, moderate complexity, some research
- **L (Large)**: 1+ weeks, complex, requires research or major refactoring

## Example: Breaking Down "Create Period from Template"

### Feature Requirements
- User selects template
- User chooses cadence (monthly/biweekly/etc.)
- User enters dates
- Period created with categories from template

### Tasks Created

#### TASK-6.1: Create Period Creation Form (UI)
**Goal**: UI for creating period from template  
**Scope**: Form with template dropdown, cadence selection, date picker  
**Acceptance Criteria**:
- ✅ User can open period creation form
- ✅ User can select template
- ✅ User can select cadence
- ✅ User can enter dates
**Likely Areas/Files**: `CreatePeriodForm.tsx` (new)  
**Complexity**: M  
**Dependencies**: TASK-3.2 (template → period backend)

#### TASK-6.2: Implement Period Creation Backend
**Goal**: Create period budget instance from template  
**Scope**: Command to create budget instance, copy categories, set default amounts + cadence  
**Acceptance Criteria**:
- ✅ Period created in database
- ✅ Categories created from template
- ✅ All data copied correctly
**Likely Areas/Files**: `src-tauri/src/encrypted_db.rs` (new command)  
**Complexity**: M  
**Dependencies**: TASK-2.2 (categories table), TASK-3.2 (template application)

#### TASK-6.3: Update Grid to Show New Period
**Goal**: Open / navigate to the new period budget instance grid  
**Scope**: Navigate after create, refresh grid data for that instance, display header  
**Acceptance Criteria**:
- ✅ App opens the new budget instance grid view
- ✅ Period header shows cadence and dates
- ✅ Grid displays category data
**Likely Areas/Files**: `PeriodGrid.tsx` (modify)  
**Complexity**: S  
**Dependencies**: TASK-6.2, TASK-4.2 (grid data loading)

## Guidelines

### Task Size
- Keep tasks small (1-5 days)
- One task = one PR
- Tasks should be independently testable

### Acceptance Criteria
- 3-5 specific, testable criteria
- Use checkboxes (✅) format
- Focus on user-visible outcomes

### Dependencies
- List specific task IDs (e.g., TASK-2.1)
- Order tasks by dependencies
- Identify parallel work opportunities

## Output Format

Add tasks as GitHub Issues with appropriate phase labels.

## References
- See **GitHub Issues** for existing task examples
- See **MVP_PLAN.md** for phase structure
- See **PRODUCT_REQUIREMENTS.md** for feature requirements
