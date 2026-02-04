You are operating inside Cursor with my currently-open repository.

MISSION
I want to restart this project “from scratch” by first documenting what exists, defining an MVP plan, and generating a complete Cursor agent/skills/commands setup to make implementation easy.

NON-NEGOTIABLE CONSTRAINTS
- Read/inspect ANY repo files, but DO NOT modify or create files outside of `.cursor/`.
- You MAY create/modify files ONLY under `.cursor/` (including subfolders).
- Do not refactor, reformat, rename, or “fix” code anywhere else.
- Do not change dependencies, build config, or project structure outside `.cursor/`.
- If something is unclear or cannot be verified from repo content, DO NOT guess. Add it to `.cursor/QUESTIONS_FOR_USER.md` and stop after finishing what you can confidently document.

PROJECT INTENT (CONFIRMED)
App concept: an Excel-like budgeting grid
- Left side: Envelopes (budgets/categories) with planned amounts per income period.
- Top: columns per income period (user chooses cadence: monthly / biweekly / weekly / daily / yearly / custom).
- Each period shows rollups: “received/distributed date”, “total spent per envelope in that period”, and “remaining”.
- Double-click a “spent” cell -> modal opens with a small table to add transactions (expense/income line items). The sum rolls up to the main grid.
- Templates: user can create templates (envelope list + planned distribution) and choose a template when creating a new period, so they don’t recreate distributions.
- Envelope-first now; include ONE “Account” column (where money is stored: e.g., bank/cash/card). Full reconciliation (matching bank statements) is a premium future feature; exclude from MVP.
- Multi-dataset: each “finance” is a separate portable file the user opens/creates (no internal profile system for MVP).
- Import/Export: MVP = basic CSV export + backup guidance. More (CSV import, PDF reports) can be “Next”.
- Custom user-defined columns: OUT OF SCOPE for MVP (future feature).
- Initial currencies: CHF + EUR. Initial languages: English + German. Architecture should allow adding more later.

TECH STACK (CONFIRMED)
- Tauri desktop app
- Frontend: React + Tailwind CSS
- Backend: Rust via Tauri commands
- STORAGE DECISION (CONFIRMED): single portable encrypted SQLite finance file
  - Use SQLCipher if feasible; otherwise document alternatives (app-level encryption), but do not implement now.

MVP (CONFIRMED TARGET)
1) Create/Open encrypted finance file
2) Create templates (envelopes + planned amounts + Account column)
3) Create a period from a template
4) Log transactions via double-click modal
5) Rollups in main grid (spent/remaining totals)
6) Basic export (CSV) + backup guidance

YOUR JOB (PHASE 1: Document + Setup Only)
You must ONLY analyze and document. Do NOT implement features in app code yet.
You will generate a complete `.cursor/` workspace: docs, rules, skills, subagents, commands, and MCP suggestions.

DELIVERABLES (create these under `.cursor/`)

0) Start Here
- `.cursor/START_HERE.md`
  - What you created in `.cursor/`
  - How I should use the agents/skills/commands to build the MVP step-by-step

1) Repo understanding (read-only scan)
- `.cursor/PROJECT_OVERVIEW.md`
- `.cursor/REPO_MAP.md`
- `.cursor/ARCHITECTURE_CURRENT.md`
  - What exists today (React structure, Tauri commands, Rust modules, build pipeline)
  - CONFIRMED vs INFERRED labels everywhere
- `.cursor/BUILD_AND_RUN.md`
  - How to run/build/test ONLY if confirmed; otherwise list unknowns

2) Product + UX for this grid app
- `.cursor/PRODUCT_REQUIREMENTS.md`
  - MVP user stories (create/open finance, templates, periods, transactions modal, rollups, CSV export)
  - Non-goals (custom columns, reconciliation, advanced reports, sync engine)
  - Edge cases (refunds, negative amounts, mixed currencies, changing cadence, deleting items)
- `.cursor/UI_FLOWS.md`
  - Onboarding: Create finance file / Open finance file / Unlock with password
  - Template management
  - Period creation from template
  - Main grid interactions (double-click to edit transactions)
  - CSV export + backup guidance
- `.cursor/UX_INTERACTIONS.md`
  - Excel-like behaviors to consider (keyboard nav, validation, error states) — mark as INFERRED if not implemented

3) Data + encryption plan (document only)
- `.cursor/DATA_MODEL.md`
  - If schema exists: document it.
  - If none exists: propose a DRAFT schema for SQLCipher-encrypted SQLite.
  - Entities should include at least:
    - finance_file (metadata/version)
    - template
    - envelope (budget category)
    - account (where money lives) OR account as a column/value per envelope (document tradeoff)
    - period (income period instance; cadence config)
    - transaction (line items; expense/income)
    - currency + locale (CHF/EUR, EN/DE)
  - Document rollup calculations and invariants (spent/remaining).
- `.cursor/ENCRYPTION_SPEC.md` (DRAFT, document-only)
  - Master password UX expectations (create/unlock/change)
  - Recommended KDF (Argon2id), salt storage, params storage
  - How SQLCipher keying typically works (high-level)
  - Threat model notes (wrong password, brute force, memory exposure)
  - “If SQLCipher is hard to ship” fallback options (document only)

4) MVP execution plan
- `.cursor/MVP_PLAN.md`
  - The MVP steps in order, with checkpoints and acceptance criteria
- `.cursor/BACKLOG.md`
  - Decompose MVP into small tasks with:
    - Goal, Scope, Acceptance Criteria, Likely areas/files, Complexity (S/M/L)
  - Include “Next” backlog for CSV import, PDF reports, reconciliation premium, custom columns

5) Rules, skills, agents, commands (Cursor scaffolding)
A) Rules (for you + future Cursor sessions)
- `.cursor/RULES.md`
  - Project rules: local-first, encrypted finance file, MVP-first, no guessing, confirm vs infer, small PR-sized tasks
  - Coding rules (only if confirmed from repo; otherwise propose as DRAFT)
  - Security rules (no secrets in repo, careful logging around finance data)
  - Performance rules (grid virtualization considerations)

B) Skills (reusable mini-playbooks)
Create folder `.cursor/skills/` with short skill docs used by agents:
- `skill_repo_scan.md` (how to map repo & entry points)
- `skill_mvp_decomposition.md` (how to break MVP into tasks)
- `skill_sqlite_sqlcipher.md` (how to approach encrypted SQLite in Tauri/Rust at a design level)
- `skill_ui_grid_patterns.md` (grid + modal editing patterns; performance notes)
- `skill_export_csv.md` (CSV export boundaries + testing approach)
- `skill_i18n_currency.md` (EN/DE + CHF/EUR scaffolding approach)

C) Agents (dispatcher + subagents)
- `.cursor/agents.md` (Lead/Dispatcher)
  - How to pick items from BACKLOG
  - How to run subagents
  - Output format required (below)
  - Strict rule: agents can only write in `.cursor/`
- Create folder `.cursor/agents/` with these subagent specs:
  - `repo_cartographer.md`
  - `tauri_rust_boundary.md`
  - `sqlite_encryption_designer.md`
  - `data_modeler.md`
  - `react_grid_architect.md`
  - `ux_flow_writer.md`
  - `export_csv_engineer.md`
  - `testing_qa.md`
  - `security_privacy_reviewer.md`
  - `performance_specialist.md`

Each subagent spec MUST include:
- Mission
- Inputs it needs
- Allowed actions (reads anywhere, writes only `.cursor/`)
- Output format
- Definition of done
- When to use / when not to use

Required agent OUTPUT FORMAT (all agents must follow)
- CONFIRMED: (facts with file paths)
- INFERRED: (assumptions)
- OPEN QUESTIONS: (if any)
- RECOMMENDATIONS: (actionable next steps)
- REFERENCES: (file paths searched)

D) Commands (copy/paste runbooks)
Create `.cursor/commands/` with:
- `command_plan_mvp_step.md` (turn one MVP step into an implementation plan)
- `command_write_feature_spec.md` (feature spec template)
- `command_add_db_migration.md` (how to handle schema changes for SQLite; document-only)
- `command_add_tauri_command.md` (pattern for adding a new Rust command; doc-only)
- `command_add_ui_component.md` (pattern for adding a grid/modal component; doc-only)
- `command_add_tests.md` (test checklist; doc-only)
If “commands” aren’t native in this repo, still create them as markdown docs.

6) MCP SUGGESTIONS (document only)
- `.cursor/MCP_RECOMMENDATIONS.md`
  - Suggest MCPs that would help implement the MVP faster, with:
    - Name
    - What it enables (e.g., docs lookup, issue tracking, design assets)
    - Why it’s useful for THIS app
    - Minimal setup notes
  - Do NOT actually install or configure MCPs outside repo. Only document recommendations.

PROCESS
Step 1: Scan the repo read-only. Gather confirmed facts.
Step 2: Write all `.cursor/` deliverables above.
Step 3: If anything essential is unknown, write questions to `.cursor/QUESTIONS_FOR_USER.md`.
Step 4: In chat, print:
  (1) List of all `.cursor/` files created/updated
  (2) 5–10 bullet repo summary (confirmed)
  (3) Top 10 backlog items (titles)
  (4) NEEDED_FROM_USER questions (if any)
Then stop.

START NOW
Proceed with repo scan and generate the `.cursor/` documentation + agent/skills/commands setup described above.
