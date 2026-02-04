# Project Rules

## Core Principles

### Local-First Architecture
- ✅ All data stored locally (encrypted SQLite files)
- ✅ No cloud sync required (future premium feature)
- ✅ Portable finance files (can be moved/copied)
- ✅ Offline-first operation

### Encrypted Finance Files
- ✅ Each finance file is encrypted (SQLCipher or app-level)
- ✅ Master password required to unlock
- ✅ No password recovery (by design)
- ✅ Password hint optional (for user convenience, not security)

### MVP-First Development
- ✅ Focus on MVP features only (see PRODUCT_REQUIREMENTS.md)
- ✅ Defer non-MVP features to "Next" backlog
- ✅ Avoid scope creep
- ✅ Document future features but don't implement

### No Guessing Policy
- ✅ Only implement what's confirmed in requirements
- ✅ Document assumptions as INFERRED (not CONFIRMED)
- ✅ Ask questions in QUESTIONS_FOR_USER.md if unclear
- ✅ Don't make up requirements

### Small PR-Sized Tasks
- ✅ Break work into small, focused tasks
- ✅ Each task should be completable in 1-5 days
- ✅ Tasks should be independently testable
- ✅ Follow BACKLOG.md task structure

---

## Coding Standards

### TypeScript/React (CONFIRMED from repo)

#### Component Structure
- Use functional components with hooks
- Use TypeScript for all components
- Export default for components
- Use descriptive component names (PascalCase)

#### State Management
- Use Redux Toolkit for global state (budgets, expenses, auth)
- Use React Context for app-wide settings (timezone)
- Use local state for UI-only state (modals, forms)

#### Styling
- Use Tailwind CSS utility classes (CONFIRMED)
- Avoid inline styles
- Use Headless UI for accessible components
- Follow existing Tailwind patterns in codebase

#### Naming Conventions
- **Components**: PascalCase (`BudgetGrid.tsx`)
- **Functions**: camelCase (`createMonthlyBudget`)
- **Constants**: UPPER_SNAKE_CASE or camelCase
- **Types/Interfaces**: PascalCase (`Budget`, `Expense`)

#### File Organization
- Group by feature (`features/BudgetGrid/`)
- Shared components in `common/`
- Services in `services/`
- Types in `types/`
- Store in `store/`

### Rust/Tauri (CONFIRMED from repo)

#### Command Pattern
- Commands in `src-tauri/src/modules/commands/`
- Each command module in separate file (`budget.rs`, `expense.rs`)
- Commands return `Result<T, String>` for errors
- Use `State<DbState>` for database access

#### Error Handling
- Use `thiserror` for error types (CONFIRMED)
- Convert errors to strings for frontend
- Log errors with `println!` or proper logging

#### Database Access
- All DB operations in Rust backend
- Use `rusqlite` for SQLite access
- Use prepared statements for queries
- Enable foreign keys: `PRAGMA foreign_keys = ON`

#### Naming Conventions
- **Functions**: snake_case (`create_monthly_budget`)
- **Structs**: PascalCase (`CreateBudgetArgs`)
- **Modules**: snake_case (`budget.rs`)

---

## Security Rules

### Password Handling
- ✅ Never log passwords
- ✅ Clear password from memory when possible
- ✅ Use secure password hashing (Argon2id, not SHA256 for new code)
- ✅ Rate limit password attempts (max 5, then lockout)

### Encryption
- ✅ Encrypt database files (SQLCipher preferred)
- ✅ Derive encryption key from password (Argon2id KDF)
- ✅ Store salt + KDF params in file header (plaintext OK)
- ✅ Never store encryption key on disk

### Data Handling
- ✅ Don't log sensitive data (amounts, descriptions)
- ✅ Clear sensitive data from memory on app close
- ✅ Validate all user inputs
- ✅ Use parameterized queries (prevent SQL injection)

### File Security
- ✅ Finance files encrypted at rest
- ✅ Portable files can be moved safely
- ✅ No network access required (offline-first)

---

## Performance Rules

### Database Performance
- ✅ Create indexes on frequently queried columns
- ✅ Use prepared statements (reuse queries)
- ✅ Avoid N+1 queries (batch data loading)
- ✅ Limit query results (pagination if needed)

### Frontend Performance
- ✅ Use grid virtualization for large datasets (100+ rows/columns)
- ✅ Lazy load transaction data (load on modal open)
- ✅ Cache grid data in Redux
- ✅ Debounce search/filter inputs (300ms)

### Memory Management
- ✅ Clear cached data when not needed
- ✅ Limit in-memory data size
- ✅ Use pagination for large lists

---

## Testing Rules

### Test Coverage (Future)
- Unit tests for business logic
- Integration tests for Tauri commands
- E2E tests for critical user flows

### Manual Testing
- ✅ Test all MVP features before marking complete
- ✅ Test error cases (wrong password, corrupted file)
- ✅ Test edge cases (empty data, large datasets)
- ✅ Test on target platforms (Windows/macOS/Linux)

---

## Documentation Rules

### Code Documentation
- ✅ Document complex functions with comments
- ✅ Use TypeScript types for documentation
- ✅ Document public APIs

### Architecture Documentation
- ✅ Update `.cursor/ARCHITECTURE_CURRENT.md` when architecture changes
- ✅ Update `.cursor/DATA_MODEL.md` when schema changes
- ✅ Document design decisions in code comments

### Task Documentation
- ✅ Update BACKLOG.md when tasks complete
- ✅ Document blockers in QUESTIONS_FOR_USER.md
- ✅ Update MVP_PLAN.md if plan changes

---

## Git/Version Control Rules

### Commit Messages
- Use descriptive commit messages
- Reference task numbers if applicable (e.g., "TASK-1.1: Add file picker")
- Group related changes in single commit

### Branch Strategy
- Use feature branches for new features
- Merge to main/master when feature complete
- Keep commits focused and atomic

---

## File Modification Rules

### What Can Be Modified
- ✅ App code (`src/`, `src-tauri/`) - when implementing MVP features
- ✅ `.cursor/` documentation - anytime
- ✅ Configuration files - when needed for MVP

### What Should NOT Be Modified (Unless MVP Requires)
- ❌ Existing working features (unless refactoring for MVP)
- ❌ Build configuration (unless needed for MVP)
- ❌ Dependencies (unless needed for MVP)

### Documentation-Only Changes
- ✅ Can modify `.cursor/` files anytime
- ✅ Can add documentation files
- ✅ Can update existing docs

---

## Error Handling Rules

### User-Facing Errors
- ✅ Show user-friendly error messages
- ✅ Don't expose technical details to users
- ✅ Provide recovery actions when possible

### Developer Errors
- ✅ Log errors with context
- ✅ Use error boundaries in React
- ✅ Handle all Result types in Rust

---

## Internationalization Rules

### MVP Languages
- ✅ English (EN) - default
- ✅ German (DE)

### Currency Support
- ✅ CHF (Swiss Franc)
- ✅ EUR (Euro)

### Implementation
- Use react-i18next or similar
- Store translations in `src/i18n/`
- Format currency based on locale

---

## Accessibility Rules

### Keyboard Navigation
- ✅ All interactive elements keyboard accessible
- ✅ Tab order logical
- ✅ Escape key closes modals

### Screen Readers
- ✅ Use semantic HTML
- ✅ Add aria-labels where needed
- ✅ Use proper roles (grid, dialog, etc.)

### Visual Accessibility
- ✅ Color contrast WCAG AA compliant
- ✅ Don't rely solely on color (use text/icons)
- ✅ Focus indicators visible

---

## References

- See **PRODUCT_REQUIREMENTS.md** for MVP scope
- See **BACKLOG.md** for task breakdown
- See **ARCHITECTURE_CURRENT.md** for current architecture
