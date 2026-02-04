# Skill: Repository Scanning

## Purpose
How to systematically scan and map a repository to understand its structure, entry points, and current implementation.

## When to Use
- Starting work on a new feature
- Understanding existing codebase
- Finding where to make changes
- Documenting current state

## Process

### Step 1: Read Configuration Files
1. Read `package.json` - understand frontend dependencies and scripts
2. Read `Cargo.toml` - understand Rust dependencies
3. Read `tsconfig.json` - understand TypeScript config
4. Read `vite.config.ts` - understand build config
5. Read `tauri.conf.json` - understand Tauri config

### Step 2: Map Entry Points
1. Find React entry: `src/main.tsx` → `src/App.tsx`
2. Find Rust entry: `src-tauri/src/main.rs` → `src-tauri/src/lib.rs`
3. Find routing: Check `App.tsx` for routes
4. Find command handlers: Check `lib.rs` for `invoke_handler![]`

### Step 3: Understand Structure
1. **Frontend**: Map `src/components/` structure
   - Features vs common components
   - Page components
   - Service layers
2. **Backend**: Map `src-tauri/src/modules/` structure
   - Commands (what Tauri commands exist)
   - Database (schema, migrations)
   - Security (auth, encryption)
3. **Database**: Check migrations in `src-tauri/migrations/`
   - Understand schema evolution
   - Find latest schema

### Step 4: Trace Data Flow
1. Pick a user action (e.g., "create budget")
2. Trace from UI → service → Tauri command → database
3. Document the flow
4. Identify where changes would be needed

### Step 5: Document Findings
Use this format:
- **CONFIRMED**: Facts verified from code
- **INFERRED**: Assumptions based on code patterns
- **OPEN QUESTIONS**: Unknowns that need clarification

## Output Format

```markdown
## Repository Scan Results

### Entry Points (CONFIRMED)
- React: `src/main.tsx` → `src/App.tsx`
- Rust: `src-tauri/src/main.rs` → `src-tauri/src/lib.rs`
- Routes: `/`, `/budget`, `/categories`, `/templates`, `/settings`

### Key Components (CONFIRMED)
- `BudgetGrid.tsx` - Main budget UI
- `CategoryGrid.tsx` - Category grid with AG Grid
- `TemplatesPage.tsx` - Template management

### Tauri Commands (CONFIRMED)
- `create_monthly_budget` - Creates budget
- `list_monthly_budgets` - Lists budgets
- `get_budget_categories_with_stats` - Gets category stats

### Database Schema (CONFIRMED)
- `MonthlyBudgets` - Budgets table
- `budget_categories` - Categories table
- `expenses` - Transactions table

### Open Questions
- How is encryption currently implemented?
- Where is file picker code?
```

## Tools to Use
- `read_file` - Read source files
- `list_dir` - List directory contents
- `grep` - Search for patterns
- `codebase_search` - Semantic search

## References
- See **REPO_MAP.md** for current repository map
- See **ARCHITECTURE_CURRENT.md** for architecture details
