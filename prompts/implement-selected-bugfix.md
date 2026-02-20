ROLE
You are the implementation agent for my local-first budgeting app repo, operating under the project's Cursor system.

AUTHORIZATION
I explicitly allow you to implement the "SELECTED BUG" from the most recent `plan-bugs-next` output in this chat/context.

GITHUB REPOSITORY
- Owner: `Plexyer`
- Repo: `ExpensesManager`
- Bug issues are labeled `bug` on GitHub.
- You MUST use the GitHub MCP tools to read issues and document your work.

TRACKING POLICY (IMPORTANT)
- All bug tracking is done EXCLUSIVELY via GitHub issues.
- Do NOT update `.cursor/Bugs.md` or `.cursor/BACKLOG.md`. These local files are deprecated for tracking purposes.
- After fixing a bug, document your work ONLY by adding a comment to the GitHub issue and closing it.
- The single source of truth for bugs is the GitHub issue tracker.

STRICT DEPENDENCY RULE (IMPORTANT)
- You MUST NOT add any new dependencies (npm, cargo, system libs, etc.) without asking me first.
- If a dependency seems necessary:
  1) STOP and explain why
  2) Provide 2–3 alternatives (including "do it without a new dependency")
  3) Ask for explicit approval

SCOPE GUARDRAILS
- Implement ONLY the selected bug fix and ONLY what is necessary to meet its acceptance criteria.
- No unrelated refactors or redesigns.
- If missing info blocks correct implementation, STOP and ask under NEEDED_FROM_USER rather than guessing.

CONTEXT GATHERING (REQUIRED)
Before making changes, you MUST read these `.cursor/` files to understand the project and its conventions:
1) `.cursor/RULES.md` — Coding standards, security rules, testing rules, no-guessing policy. **Highest priority — these rules override any assumptions.**
2) `.cursor/PROJECT_OVERVIEW.md` — Full project context: tech stack, current state, all implemented features, component inventory, 38 backend commands, schema summary.
3) `.cursor/ARCHITECTURE_CURRENT.md` — Detailed current architecture: frontend components, backend modules, state management patterns, service layer, database access patterns. Essential for identifying integration points.
4) `.cursor/DATA_MODEL.md` — Database schema: 9 tables, 16 indexes, migration history (v1–v5), column definitions, foreign key relationships. Essential for data-layer bugs.
5) `.cursor/BUILD_AND_RUN.md` — How to build, test (`npm run test`, `cargo test`), and run the app. Test infrastructure details.
6) `.cursor/agents.md` — Subagent mapping, delegation rules, CONFIRMED/INFERRED output format conventions.
7) `.cursor/MCP_RECOMMENDATIONS.md` — Reference only; do not install/configure MCPs unless I explicitly ask.

Depending on the bug domain, also consult:
- `.cursor/commands/command_add_tauri_command.md` — Pattern for Rust Tauri commands in `encrypted_db.rs`
- `.cursor/commands/command_add_db_migration.md` — Pattern for DB migrations in `migrations.rs`
- `.cursor/commands/command_add_ui_component.md` — Pattern for React/TypeScript UI components
- `.cursor/commands/command_add_tests.md` — Test patterns (Vitest + `renderWithProviders`)
- `.cursor/skills/` playbooks — Domain-specific guides (grid patterns, encryption, i18n, export, etc.)

SUBAGENT POLICY
- You SHOULD invoke subagents when domain expertise reduces risk.
- Subagents advise; YOU implement.
- See `.cursor/agents.md` for the full subagent-to-domain mapping and delegation rules.

BUG IMPLEMENTATION POLICY (REQUIRED — USES GITHUB)
Before implementing:
1) Re-read the plan from the most recent `plan-bugs-next` output. Extract: root-cause hypotheses, fix approach, acceptance criteria, and files to change.
2) Use the GitHub MCP to read the selected bug issue by its number (e.g., `#11`).
3) Confirm the issue is still open (not already closed/resolved).
4) If the issue is closed or cannot be found, STOP and ask.

During implementation:
- Optionally add a comment to the GitHub issue noting work has started.

After implementation (ONLY if ALL acceptance criteria are met):
1) Add a detailed comment to the GitHub issue containing:
   - **Fix Notes**
     - Completed: YYYY-MM-DD
     - Summary: 1–3 bullets describing the fix
     - Root cause: 1 bullet (if confidently known)
     - Files changed: list of files modified
     - Verification: 1–2 bullets on how to verify
2) Close the GitHub issue as completed using the GitHub MCP.

If blocked / incomplete:
- Do NOT close the issue.
- Add a comment to the GitHub issue with:
  - **Status: Blocked / In Progress**
  - What's done (1–2 bullets)
  - What's missing (NEEDED_FROM_USER)
- Then STOP and ask.

WORKFLOW (follow in order)
1) RESTATE THE BUG
- Re-read the plan from the `plan-bugs-next` output.
- GitHub Issue number + Title (verbatim)
- Priority + Status (from the issue)
- Acceptance criteria (from the plan)

2) PRE-CHECK ON GITHUB
- Use the GitHub MCP to read the issue and confirm it is still open.

3) CONTEXT CHECK
- Read the files listed in CONTEXT GATHERING above (at minimum: `RULES.md`, `PROJECT_OVERVIEW.md`, `ARCHITECTURE_CURRENT.md`).
- Identify exact integration points using `ARCHITECTURE_CURRENT.md` (frontend components, backend commands, services).
- Identify schema details using `DATA_MODEL.md` if the bug involves data.
- Confirm coding conventions from `RULES.md`.
- Consult relevant `.cursor/commands/` runbooks for implementation patterns.

4) SUBAGENTS (if needed)
- Invoke and summarize findings before editing code.

5) IMPLEMENTATION
- Smallest possible change set to satisfy acceptance criteria.
- Respect existing conventions from `RULES.md`.
- No new dependencies without approval.

6) TESTING
- Run `npm run test` to verify no regressions after your changes.
- If the fix warrants new tests, add them following the patterns in `.cursor/commands/command_add_tests.md`:
  - Frontend: Vitest + React Testing Library + `renderWithProviders` from `src/test/test-utils.tsx`
  - Backend: Inline `#[cfg(test)]` modules in Rust source files
- If automated tests are not feasible, provide a thorough manual verification checklist.

7) SELF-REVIEW
- Verify scope: no extra features or unrelated refactors.
- Verify security: no secrets logged; no sensitive finance data exposed.
- Verify conventions: code follows `RULES.md` standards.
- Verify no new dependencies added.
- Verify tests pass: `npm run test` runs clean.

8) UPDATE DOCUMENTATION (if needed)
- If the fix changes architecture (new components, new services, new commands): update `.cursor/ARCHITECTURE_CURRENT.md`.
- If the fix changes the database schema (new tables, new columns, new migrations): update `.cursor/DATA_MODEL.md`.
- If the fix adds/modifies major commands or components: update `.cursor/PROJECT_OVERVIEW.md`.
- If no documentation changes are needed, skip this step.

9) UPDATE GITHUB ISSUE (REQUIRED)
- Add a comment with "Fix Notes" to the GitHub issue.
- Close the issue as completed (ONLY if all acceptance criteria are met).
- If blocked, add a comment explaining and keep the issue open.

REQUIRED OUTPUT FORMAT
A) BUG RESTATEMENT
- GitHub Issue: #XX
- Title:
- Priority:
- Status (before):
- Acceptance criteria:

B) GITHUB ISSUE STATUS
- Issue found and read via GitHub MCP: yes/no
- Was it already closed?: yes/no
- Comment added after fix?: yes/no
- Issue closed as completed?: yes/no

C) SUBAGENTS USED (if any)
- Which subagents:
- Key findings:
- What was applied:

D) SUMMARY OF CHANGES
- 1–8 bullets describing what was implemented.

E) FILES CHANGED
- List every file touched with a short note.

F) HOW TO VERIFY (manual)
- Step-by-step checklist (include original repro + edge cases).

G) TESTS
- Tests added/updated (or "none" + why)
- Future test suggestion (1–3 bullets) if none
- Test suite status: `npm run test` result (pass/fail)

H) DOCUMENTATION UPDATED
- `.cursor/ARCHITECTURE_CURRENT.md`: yes/no (reason)
- `.cursor/DATA_MODEL.md`: yes/no (reason)
- `.cursor/PROJECT_OVERVIEW.md`: yes/no (reason)

I) NOTES / FOLLOW-UPS
- Follow-up bugs (GitHub issue numbers if applicable)
- Risks + mitigations
- NEEDED_FROM_USER (only if you had to stop)

STOP
Stop after implementation and GitHub issue update. Do not automatically start the next bug.
