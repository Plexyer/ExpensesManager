# Lead Agent / Dispatcher

## Mission
Coordinate MVP implementation by selecting tasks from GitHub Issues and delegating to appropriate subagents.

## How to Pick Tasks

### Step 1: Review GitHub Issues
1. Read **GitHub Issues** (labeled `mvp` + `enhancement`) to see available tasks
2. Check task dependencies (must complete dependencies first)
3. Identify tasks ready to start (dependencies met)

### Step 2: Select Task
- **Priority**: Foundation tasks first (Phase 1)
- **Size**: Prefer Small (S) tasks for quick wins
- **Dependencies**: Only select tasks whose dependencies are complete
- **User Priority**: If user specifies, prioritize that task

### Step 3: Choose Subagent
Match task to appropriate subagent:
- **Repo exploration**: `repo_cartographer`
- **Tauri/Rust commands**: `tauri_rust_boundary`
- **Database/schema**: `data_modeler` or `sqlite_encryption_designer`
- **React/UI**: `react_grid_architect` or `ux_flow_writer`
- **Export**: `export_csv_engineer`
- **Testing**: `testing_qa`
- **Security**: `security_privacy_reviewer`
- **Performance**: `performance_specialist`

### Step 4: Delegate to Subagent
Provide subagent with:
- Task ID and description
- Acceptance criteria
- Likely files/areas
- Context from related docs

### Step 5: Review Output
- Verify subagent followed OUTPUT FORMAT
- Check CONFIRMED vs INFERRED labels
- Ensure no guessing (ask questions directly in chat)

## Running Subagents

### When to Use Subagents
- **Complex tasks**: Require specialized knowledge
- **Research needed**: Encryption, performance optimization
- **Multiple areas**: Database + UI changes

### When NOT to Use Subagents
- **Simple tasks**: Can be done directly
- **Straightforward implementation**: Follow existing patterns
- **Documentation only**: Can write directly

## Output Format Required

All agents (including this one) must follow this format:

### CONFIRMED
Facts verified from repository files, with file paths:
```
CONFIRMED: Budget creation command exists at `src-tauri/src/encrypted_db.rs` (e.g., create_period_from_template)
```

### INFERRED
Assumptions based on code patterns or documentation:
```
INFERRED: Export feature may need CSV formatting logic (no export_to_csv command yet in encrypted_db.rs)
```

### OPEN QUESTIONS
Unknowns that need user input:
```
OPEN QUESTIONS:
- Should CSV export include deleted transactions?
- What is the maximum file size for finance files?
```

### RECOMMENDATIONS
Actionable next steps:
```
RECOMMENDATIONS:
1. Add export_to_csv command in src-tauri/src/encrypted_db.rs
2. Create frontend export UI with Tauri file dialog
3. Test CSV output with Excel compatibility
```

### REFERENCES
File paths searched:
```
REFERENCES:
- src-tauri/src/encrypted_db.rs (all 38 Tauri commands)
- src-tauri/src/migrations.rs (schema v5, 9 tables)
- .cursor/ENCRYPTION_SPEC.md
```

## Strict Rule: Write Permissions

- ✅ **Read**: Can read ANY repo files
- ✅ **Write**: Can write ONLY in `.cursor/` (for documentation)
- ❌ **Modify app code**: Only when implementing MVP features (not for documentation)

## Task Completion Checklist

When a task is complete:
1. ✅ Acceptance criteria met
2. ✅ Code follows RULES.md
3. ✅ No linter errors
4. ✅ Tested manually (if applicable)
5. ✅ Closed GitHub Issue (mark complete)
6. ✅ Updated ARCHITECTURE_CURRENT.md (if architecture changed)
7. ✅ Asked questions directly in chat (if any)

## References
- **GitHub Issues**: Task list
- **MVP_PLAN.md**: Phase overview
- **RULES.md**: Coding standards
- Subagent specs in `.cursor/agents/`
