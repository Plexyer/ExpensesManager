# MCP Recommendations

## Overview
Model Context Protocol (MCP) servers that are configured and used for ExpensesManager development. MCPs extend Cursor's capabilities with external tool integrations.

> **Note:** MCPs are configured at the Cursor user level, not per-project. This document is a reference, not a setup script. Do not install or configure MCPs unless explicitly asked.

---

## Active MCPs (Currently Configured)

### 1. GitHub MCP
**What it enables**: Full GitHub integration — issues, PRs, code search, branches, releases  
**Status**: Active and heavily used  
**Key capabilities**:
- Read/create/close GitHub Issues (primary task tracker for this project)
- Create and manage pull requests
- Search code across the repository
- Read commits, diffs, and file contents on remote

**How we use it**:
- All task tracking via GitHub Issues (replaced local `BACKLOG.md`)
- Issue lifecycle: create → comment → close as completed
- Label management (`mvp`, `enhancement`, `documentation`, `out-of-scope`)
- Phase-based issue organization (e.g., Phase 12 documentation tasks)

---

### 2. Context7 MCP
**What it enables**: Up-to-date documentation and code examples for any library  
**Status**: Active  
**Key capabilities**:
- Resolve library names to Context7-compatible IDs
- Query latest documentation with code examples
- Supports Tauri, React, Rust, Tailwind CSS, and any npm/crate library

**How we use it**:
- Look up Tauri v2 APIs (commands, file dialogs, state management)
- React / TypeScript patterns and hooks
- Rust crate documentation (rusqlite, serde, argon2)
- Tailwind CSS v4 utility classes

---

### 3. Browser Extension MCP (`cursor-ide-browser`)
**What it enables**: Navigate web pages, interact with elements, take screenshots  
**Status**: Active  
**Key capabilities**:
- Navigate to URLs, click, type, fill forms
- Take accessibility snapshots and screenshots
- Handle dialogs, scroll, drag-and-drop
- Multi-tab management

**How we use it**:
- Test the Tauri dev app at `http://localhost:1420`
- Verify UI changes visually after implementation
- Debug layout and interaction issues
- Test user flows (file open, password entry, grid editing)

---

### 4. Chrome DevTools MCP
**What it enables**: Direct Chrome DevTools access — DOM inspection, console, network, performance  
**Status**: Active  
**Key capabilities**:
- Take page snapshots (a11y tree) and screenshots
- Read console messages and network requests
- Evaluate JavaScript in the page context
- Performance tracing (Core Web Vitals)
- Emulate viewport, color scheme, network conditions

**How we use it**:
- Inspect live DOM state during debugging
- Monitor console errors and warnings
- Profile performance (trace recordings, CWV scores)
- Test responsive layouts and dark mode

---

## Not Needed (for MVP)

### Cloud / API MCPs
- **Not needed**: MVP is offline-first with no server infrastructure
- **Future**: May be useful for premium features (cloud sync, bank sync)

### AI / ML MCPs
- **Not needed**: MVP has no AI features
- **Future**: May be useful for receipt OCR / auto-categorization (premium tier)

### Database MCP
- **Not available**: No MCP exists for SQLCipher-encrypted databases
- **Workaround**: Database inspection is done via Rust backend commands and test scripts

### File System MCP
- **Not needed**: Cursor's built-in file tools (Read, Write, Glob, Grep) are sufficient
- The IDE already has full filesystem access

---

## References
- [MCP Specification](https://modelcontextprotocol.io/)
- Cursor MCP documentation (Settings → MCP section)
- GitHub MCP: configured via `user-github` server
- Context7 MCP: configured via `user-context7` server
