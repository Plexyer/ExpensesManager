# Start Here - Cursor Workspace Setup

## What Was Created

This `.cursor/` workspace contains comprehensive documentation, agents, skills, and commands to guide the implementation of the ExpensesManager MVP according to the reset prompt requirements.

### Documentation Structure

#### 1. Repo Understanding
- **PROJECT_OVERVIEW.md** - High-level project summary and confirmed facts
- **REPO_MAP.md** - File structure and entry points
- **ARCHITECTURE_CURRENT.md** - Current implementation details (React, Tauri, Rust, SQLite)
- **BUILD_AND_RUN.md** - How to build, run, and test the application

#### 2. Product & UX
- **PRODUCT_REQUIREMENTS.md** - MVP user stories, non-goals, edge cases
- **UI_FLOWS.md** - User journey flows (onboarding, templates, periods, transactions)
- **UX_INTERACTIONS.md** - Excel-like behaviors and interaction patterns

#### 3. Data & Encryption
- **DATA_MODEL.md** - Database schema (current + proposed MVP schema)
- **ENCRYPTION_SPEC.md** - Encryption strategy (SQLCipher plan, fallbacks)

#### 4. MVP Execution
- **MVP_PLAN.md** - Step-by-step MVP implementation plan with checkpoints
- **BACKLOG.md** - Decomposed tasks with acceptance criteria and complexity

#### 5. Rules & Guidelines
- **RULES.md** - Project rules, coding standards, security, performance

#### 6. Skills (`.cursor/skills/`)
Reusable mini-playbooks for common tasks:
- `skill_repo_scan.md` - How to map repo & entry points
- `skill_mvp_decomposition.md` - How to break MVP into tasks
- `skill_sqlite_sqlcipher.md` - Encrypted SQLite design approach
- `skill_ui_grid_patterns.md` - Grid + modal editing patterns
- `skill_export_csv.md` - CSV export boundaries + testing
- `skill_i18n_currency.md` - EN/DE + CHF/EUR scaffolding

#### 7. Agents (`.cursor/agents/`)
Subagent specifications for specialized tasks:
- `repo_cartographer.md` - Maps repository structure
- `tauri_rust_boundary.md` - Tauri command patterns
- `sqlite_encryption_designer.md` - Encryption design decisions
- `data_modeler.md` - Database schema design
- `react_grid_architect.md` - Grid UI architecture
- `ux_flow_writer.md` - User flow documentation
- `export_csv_engineer.md` - CSV export implementation
- `testing_qa.md` - Testing strategies
- `security_privacy_reviewer.md` - Security audits
- `performance_specialist.md` - Performance optimization

#### 8. Commands (`.cursor/commands/`)
Copy/paste runbooks for common operations:
- `command_plan_mvp_step.md` - Turn MVP step into implementation plan
- `command_write_feature_spec.md` - Feature spec template
- `command_add_db_migration.md` - Schema change patterns
- `command_add_tauri_command.md` - New Rust command pattern
- `command_add_ui_component.md` - Grid/modal component pattern
- `command_add_tests.md` - Test checklist

#### 9. Recommendations
- **MCP_RECOMMENDATIONS.md** - Suggested MCP servers for faster development
- **QUESTIONS_FOR_USER.md** - Open questions requiring user input

---

## How to Use This Workspace

### Step 1: Read the Overview
Start with **PROJECT_OVERVIEW.md** to understand what exists vs. what needs to be built.

### Step 2: Review MVP Plan
Read **MVP_PLAN.md** to see the implementation roadmap, then check **BACKLOG.md** for detailed tasks.

### Step 3: Pick a Task
Select a task from **BACKLOG.md** that matches your current priority. Each task includes:
- Goal and scope
- Acceptance criteria
- Likely areas/files to modify
- Complexity estimate (S/M/L)

### Step 4: Use Agents & Skills
- **For repo exploration**: Use `repo_cartographer` agent or `skill_repo_scan.md`
- **For Tauri commands**: Use `tauri_rust_boundary` agent or `command_add_tauri_command.md`
- **For UI components**: Use `react_grid_architect` agent or `command_add_ui_component.md`
- **For database changes**: Use `data_modeler` agent or `command_add_db_migration.md`

### Step 5: Follow Rules
Always check **RULES.md** before making changes. Key constraints:
- ✅ Read/inspect ANY repo files
- ✅ Create/modify files ONLY under `.cursor/` (for documentation)
- ❌ Do NOT modify code outside `.cursor/` unless implementing MVP features
- ❌ Do NOT refactor existing code unless it's part of MVP requirements
- ❌ Do NOT guess - document unknowns in QUESTIONS_FOR_USER.md

### Step 6: Document as You Go
When implementing:
- Update **ARCHITECTURE_CURRENT.md** if architecture changes
- Update **BACKLOG.md** when tasks are completed
- Add questions to **QUESTIONS_FOR_USER.md** if blockers arise

---

## MVP Implementation Workflow

1. **Select a task** from BACKLOG.md (start with "S" complexity)
2. **Read relevant docs**: Check PRODUCT_REQUIREMENTS.md and UI_FLOWS.md for context
3. **Use appropriate agent/skill**: Follow the pattern in the skill/agent docs
4. **Implement**: Make code changes following RULES.md
5. **Test**: Verify acceptance criteria are met
6. **Update backlog**: Mark task complete, note any follow-ups needed
7. **Repeat**: Move to next task

---

## Key Differences: Current vs. MVP Vision

### Current State (CONFIRMED)
- ✅ Monthly budget system (month/year based)
- ✅ Category-based budgeting
- ✅ Template system exists
- ✅ Transaction entry via CategoryLedgerModal
- ✅ Single SQLite database in app_data_dir
- ✅ Unencrypted database
- ✅ Redux state management
- ✅ React + Tailwind UI

### MVP Vision (TO BUILD)
- 🔄 Envelope-first budgeting (left side: envelopes with planned amounts)
- 🔄 One period budget instance per grid view (user selects which period to view)
- 🔄 Columns are category fields/rollups (Received date / Received amount / Spent amount)
- 🔄 Double-click modal for transactions
- 🔄 Portable encrypted finance files (multi-dataset support)
- 🔄 CSV export + backup guidance
- 🔄 Template → period creation flow

---

## Next Steps

1. **Read PROJECT_OVERVIEW.md** - Understand current state
2. **Read MVP_PLAN.md** - See implementation roadmap
3. **Read BACKLOG.md** - Pick first task
4. **Check QUESTIONS_FOR_USER.md** - Answer any open questions
5. **Start implementing** - Follow the workflow above

---

## Important Notes

- All agents can **read** anywhere but **write only** in `.cursor/` (for documentation)
- When implementing MVP features, you can modify app code, but follow RULES.md
- Mark everything as CONFIRMED (from repo) or INFERRED (assumptions)
- Document unknowns in QUESTIONS_FOR_USER.md
- Keep tasks small (PR-sized) and focused

---

**Ready to start?** → Read **PROJECT_OVERVIEW.md** next.
