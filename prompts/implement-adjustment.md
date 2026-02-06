ROLE
You are the implementation agent for adjustments/bugfixes.

AUTHORIZATION
I explicitly allow you to implement ONLY the adjustment described below (and nothing else).

STRICT DEPENDENCY RULE
- Do NOT add any new dependencies without asking me first.
- If you think you need one: STOP, justify, give alternatives, ask approval.

SCOPE GUARDRAILS
- Implement only what’s needed for the acceptance criteria.
- No unrelated refactors.

MANDATORY: USE THE .cursor SYSTEM
Read and follow (if present):
- .cursor/RULES.md
- .cursor/BACKLOG.md
- relevant .cursor/commands/, .cursor/skills/, .cursor/agents/

-------------------------------

ADJUSTMENT REQUEST (USER INPUT)
Title: 
"Create Master Password screen fits small window height"

Repro steps (how to reproduce):
"Open App -> press create new finance file -> select place to store finance file -> Window opens to input master password -> reduce window to height 720px -> fields/buttons overflow and cannot be reached"

Expected behavior (what should happen instead):
"Content becomes scrollabe OR layout collapses; CTA always reachable"

Done when (acceptance criteria you must satisfy):
"- [] no elements cut off at 720px height
- [] scroll works
- [] buttons accessible"

-------------------------------

LINK TO PLAN (optional but recommended)
- If a plan exists from `plan_adjustment`, treat it as the source of truth for approach and steps.
- If no plan exists, you must derive a minimal safe approach and state assumptions clearly (and ask if unsure).

BACKLOG UPDATE (REQUIRED)
- Find the exact backlog item by title (match the Title above).
- If it doesn’t exist:
  - Create a new “Adjustments / Bugfixes” section in `.cursor/BACKLOG.md`
  - Add this item under it.
- After implementation:
  - Mark it completed and add short “Implementation Notes” under the task:
    - Completed on: YYYY-MM-DD
    - Summary: 1–3 bullets
    - Files changed: short list
    - Verification: 1–2 bullets
- If blocked:
  - Do NOT mark done
  - Mark BLOCKED and write what’s missing + NEEDED_FROM_USER under that task

SUBAGENTS
Use subagents when beneficial (UI/UX/perf/testing/security). Summarize what you applied.

IMPLEMENTATION WORKFLOW
1) Restate the task + acceptance criteria in your own words.
2) Reproduce the issue from the repro steps (mentally + by code inspection).
3) Identify exact files/components involved.
4) Implement the smallest change that satisfies “Done when”.
5) Add/adjust tests if repo supports it; otherwise write a strong manual checklist.
6) Verify no new deps were added, and no unrelated parts changed.
7) Update backlog item status + Implementation Notes.

REQUIRED OUTPUT
A) TASK RESTATEMENT
B) SUBAGENTS USED + FINDINGS (if any)
C) SUMMARY OF CHANGES
D) FILES CHANGED
E) HOW TO VERIFY (manual)
F) TESTS (or none + why)
G) BACKLOG UPDATE (what changed in BACKLOG)
H) NEEDED_FROM_USER (only if blocked)

STOP after implementation and backlog update.
