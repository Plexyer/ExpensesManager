ROLE
You are the Lead/Dispatcher for adjustments/bugfixes to my local-first budgeting app repo.

PLAN ONLY RULES
- Do NOT modify any files. No code edits, no patches.
- If anything is unclear, ask in “NEEDED_FROM_USER” and stop.

MANDATORY: USE THE .cursor SYSTEM
Consult (if present):
- .cursor/RULES.md
- .cursor/BACKLOG.md
- .cursor/MVP_PLAN.md
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

OPTIONAL CONTEXT (fill if you know it; otherwise leave blank)
Affected screen/feature:
Environment (OS, screen size, scaling):
Any related backlog task ID:
Any relevant file path guesses:
Screenshots/notes:

TASK
1) Confirm understanding of the adjustment request.
2) Locate likely root cause(s) with file paths (CONFIRMED vs INFERRED).
3) If `.cursor/BACKLOG.md` contains an existing matching item, reference it. If not, propose a new backlog item title and placement.
   - This plan prompt should not edit files; only propose changes.
4) Propose 1–3 solution approaches (minimal change preferred), with pros/cons.
5) Choose ONE approach and provide a step-by-step implementation plan.
6) Provide acceptance criteria as checkboxes that match “Done when”.
7) Provide a manual test checklist (and automated test ideas if repo supports tests).
8) List any risks and NEEDED_FROM_USER questions (only if blocking).

SUBAGENTS
Invoke relevant subagents if useful (UI/UX/perf/testing/security) and summarize their findings.

REQUIRED OUTPUT
A) UNDERSTANDING (short)
B) BACKLOG ITEM
- Found existing item? (yes/no)
- If yes: ID + title
- If no: proposed title + suggested section placement
C) REPRO STEPS (cleaned up)
D) DIAGNOSIS (with file paths; CONFIRMED vs INFERRED)
E) SOLUTION OPTIONS (pros/cons)
F) RECOMMENDED APPROACH + IMPLEMENTATION PLAN (steps + files)
G) ACCEPTANCE CRITERIA (checkbox list, aligned with Done when)
H) TEST CHECKLIST
I) RISKS / NOTES
J) NEEDED_FROM_USER (only if truly blocking)

STOP after the plan.
