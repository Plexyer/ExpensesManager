You are operating inside Cursor with my currently-open repository.

MISSION
Update the documentation + planning system under `.cursor/` to reflect a corrected app design. This is a documentation/plan update only.

NON-NEGOTIABLE CONSTRAINTS
- Read/inspect ANY repo files, but DO NOT modify or create files outside of `.cursor/`.
- You MAY create/modify files ONLY under `.cursor/` (including subfolders).
- Do not refactor, reformat, rename, or “fix” code anywhere else.
- Do not add dependencies or change build config outside `.cursor/`.
- If something is unclear or cannot be verified from repo content or the confirmed design below, DO NOT guess. Leave it as OPEN and keep it in Questions.

CRITICAL UPDATE: CORRECTED APP DESIGN (CONFIRMED)
1) The “big table” (main grid) represents exactly ONE period at a time.
   - Example: user is currently viewing “January 2026” (monthly) or “Biweekly period #3” etc.
   - The user creates exactly ONE budget instance per period (not multiple period columns in the same grid).

2) Columns are informational fields for the categories within the current period, not multiple periods.
   For each budget category row (e.g., Food), the grid has columns such as:
   - Category name (Food)
   - Received date (when money was budgeted for this category; default = income arrival date for that period)
   - Received amount (amount budgeted/saved during the current period)
   - Spent amount (amount spent during the current period)
   (There may be other columns later, but custom user-defined columns remain OUT OF SCOPE for MVP.)

3) Double-click behavior:
   - Double-click “Received amount” or “Spent amount” opens a small modal/table with line items.
   - Each line item has an explicit date (and optionally time) of when money was received/spent.
   - Totals roll up into the main grid cells.

4) Templates:
   - A template defines:
     - Period length/cadence (monthly/biweekly/weekly/daily/custom)
     - A set of budget categories and their default budgeted amounts for that period
   - When the user uses a template, they create a new period budget instance for that period.

5) Categories are global and unique per dataset:
   - Each category (Food, Rent, Fuel, etc.) can exist only once in one finance file/dataset.
   - Templates reference these global categories (so the same category can appear in multiple templates, even with different template periods).

6) Period changes and overlap:
   - A template’s period cadence can be changed at any time.
   - Overlap is not an issue because all line items are timestamped, and each budget instance is one explicit period.
   - (If the repo already models period boundaries differently, document the mismatch as a GAP; do not change code.)

MVP (still the same intent, with corrected structure)
1) Create/Open encrypted finance file (encrypted SQLite, SQLCipher preferred)
2) Define global categories (unique per dataset)
3) Create templates referencing global categories + default amounts + period cadence
4) Create a period budget instance from a template (one grid per period)
5) Add received/spent line items via modal and compute rollups for the current period grid
6) Basic CSV export + backup guidance

WHAT TO DO
A) Scan repo (read-only) to see current assumptions in `.cursor/` docs and any existing code structure.
B) Update `.cursor/` documentation to reflect corrected design:
   - Ensure any references to “multiple periods as columns” are removed/replaced.
   - Ensure the mental model is: “one period per main grid view”, “columns are attributes/rollups”.
   - Ensure templates define cadence, categories are global, and budget instances are per period.

FILES TO UPDATE (minimum necessary set)
Update any relevant `.cursor/` files to match the corrected design, typically including:
- `.cursor/PROJECT_OVERVIEW.md` (if it described periods-as-columns, fix it)
- `.cursor/PRODUCT_REQUIREMENTS.md`
- `.cursor/UI_FLOWS.md`
- `.cursor/UX_INTERACTIONS.md` (double-click modal behavior)
- `.cursor/DOMAIN_MODEL.md`
- `.cursor/DATA_MODEL.md` (ensure global unique categories + template references + period instance)
- `.cursor/ARCHITECTURE.md` or `.cursor/ARCHITECTURE_CURRENT.md` (document conceptual flow)
- `.cursor/MVP_PLAN.md`
- `.cursor/BACKLOG.md` (adjust tasks to match the corrected model)

QUESTIONS FILE: MINIMAL EDIT POLICY
- There is a `.cursor/QUESTIONS_FOR_USER.md` file.
- Modify it ONLY in the smallest way necessary where the corrected design directly answers or changes a question.
- Do NOT rewrite the whole file.
- Specifically: if any question assumed “multiple periods as columns”, mark that part as resolved/updated and keep the rest unchanged.
- If a question is still open, leave it open.

NO NEW ASSUMPTIONS
- Do not invent new features or requirements.
- If there are new open questions created by this corrected design, add them to `.cursor/QUESTIONS_FOR_USER.md` but keep them clearly separated under a new section like “New questions after design correction”.

OUTPUT IN CHAT
After updates, provide:
1) A bullet list of every `.cursor/` file modified/created.
2) A short summary of the key design corrections you applied (3–8 bullets).
3) Any remaining open questions (NEEDED_FROM_USER), but only if truly required.

START NOW
Update the `.cursor/` documentation accordingly, following all constraints above.
