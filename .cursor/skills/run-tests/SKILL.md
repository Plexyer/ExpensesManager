---
name: run-tests
description: Run the repo test suite, summarize failures, and propose targeted fixes.
---

# Goal
Run tests, summarize failures, and suggest fixes without changing unrelated code.

# When to use
- CI failing
- After a refactor
- Before creating a PR

# Procedure
1) Identify the test command(s) from package.json/Makefile/README.
2) Run the fastest suite first (unit), then integration/e2e if needed.
3) Summarize failures:
   - failing test name
   - error message
   - likely cause
   - file/line pointers
4) Propose minimal fixes and the exact validation command.

# Output format
- ✅ Commands run
- ❌ Failures (bullet list)
- 🛠 Proposed fixes (ranked)
- 🔁 Re-run plan
