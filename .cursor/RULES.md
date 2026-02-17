# Project Rules

## Core Principles

### Local-First Architecture
- ✅ All data stored locally (encrypted SQLite files)
- ✅ No cloud sync required (future premium feature)
- ✅ Portable finance files (can be moved/copied)
- ✅ Offline-first operation

### Encrypted Finance Files
- ✅ Each finance file is encrypted (SQLCipher with Argon2id key derivation)
- ✅ Master password required to unlock
- ✅ No password recovery (by design for database password)
- ✅ Password hint optional (for user convenience, not security)
- ✅ "Remember password on this device" via OS secure storage (optional)

### No Lock-In Policy (CONFIRMED from LICENSING.md)
- ✅ **ALWAYS allow Open Database + Export** - even in Read-Only mode
- ✅ Lock screens must NEVER trap user data
- ✅ Read-Only mode is the fallback, not a brick
- ✅ Free Read-Only Viewer can open any encrypted DB (with password)
- ✅ Export (CSV/JSON) available in ALL modes

### Licensing Principles (CONFIRMED)
- ✅ **Ownership-first**: Perpetual plan = own forever, offline, unlimited devices
- ✅ **Privacy-first**: No email/account required for perpetual licenses
- ✅ **Offline-first**: Perpetual plan works fully offline forever
- ✅ **Transparency**: Clear separation of base features vs premium features
- ✅ **No system clock dependency**: Feature gating by build date, not `today()`

### MVP-First Development
- ✅ Focus on MVP features only (see PRODUCT_REQUIREMENTS.md)
- ✅ Defer non-MVP features to "Next" backlog
- ✅ Avoid scope creep
- ✅ Document future features but don't implement

### No Guessing Policy
- ✅ Only implement what's confirmed in requirements
- ✅ Document assumptions as INFERRED (not CONFIRMED)
- ✅ Ask questions directly in chat if unclear
- ✅ Don't make up requirements

### Small PR-Sized Tasks
- ✅ Break work into small, focused tasks
- ✅ Each task should be completable in 1-5 days
- ✅ Tasks should be independently testable
- ✅ Follow GitHub Issues task structure

---

## Coding Standards

### TypeScript/React (CONFIRMED from repo)

#### Component Structure
- Use functional components with hooks
- Use TypeScript for all components
- Export default for components
- Use descriptive component names (PascalCase)

#### State Management
- Use Redux Toolkit for global state (4 slices: `fileSlice`, `budgetSlice`, `categorySlice`, `templateSlice`)
- Use `ui_settings` table + `settingsService` for persistent user preferences
- Use local state for UI-only state (modals, forms)

#### Styling
- Use Tailwind CSS v4 utility classes (CONFIRMED)
- Avoid inline styles
- Use custom accessible components (no Headless UI dependency)
- Follow existing Tailwind patterns in codebase

#### Naming Conventions
- **Components**: PascalCase (`PeriodGrid.tsx`, `CategoryLedgerModal.tsx`)
- **Functions**: camelCase (`createPeriod`, `getCategories`)
- **Constants**: UPPER_SNAKE_CASE or camelCase
- **Types/Interfaces**: PascalCase (`Period`, `Category`, `LineItem`, `Attachment`)

#### File Organization
- Group by feature (`features/BudgetGrid/`)
- Shared components in `common/`
- Services in `services/`
- Types in `types/`
- Store in `store/`

### Rust/Tauri (CONFIRMED from repo)

#### Command Pattern
- All Tauri commands are in `src-tauri/src/encrypted_db.rs`
- Supporting modules: `kdf.rs` (key derivation), `file_header.rs` (file format), `migrations.rs` (schema upgrades)
- Commands return `Result<T, String>` for errors
- Use `State<Mutex<Option<OpenFileState>>>` for database access
- Frontend invokes commands via `@tauri-apps/api` `invoke()` function

#### Error Handling
- Use `thiserror` for error types (CONFIRMED)
- Convert errors to strings for frontend
- Log errors with `println!` or proper logging

#### Database Access
- All DB operations in Rust backend
- Use `rusqlite` with SQLCipher (`bundled-sqlcipher` feature) for encrypted SQLite access
- Use prepared statements for queries
- Enable foreign keys: `PRAGMA foreign_keys = ON`
- Key derivation: Argon2id → raw hex key via `PRAGMA key = "x'hex'"`

#### Naming Conventions
- **Functions**: snake_case (`create_finance_file`, `get_categories`)
- **Structs**: PascalCase (`OpenFileState`, `CreateFileArgs`)
- **Modules**: snake_case (`encrypted_db.rs`, `kdf.rs`, `file_header.rs`, `migrations.rs`)

---

## Security Rules

### Password Handling
- ✅ Never log passwords
- ✅ Clear password from memory when possible
- ✅ Use secure password hashing (Argon2id, not SHA256 for new code)
- ✅ Rate limit password attempts (max 5, then lockout)

### Encryption
- ✅ Encrypt database files (SQLCipher -- implemented)
- ✅ Derive encryption key from password (Argon2id KDF -- implemented)
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

### Automated Tests (CONFIRMED -- Vitest)
- ✅ Unit tests for utility functions and business logic (Vitest + jsdom)
- ✅ Component tests with `@testing-library/react` and `renderWithProviders` helper
- ✅ Test files use `__tests__/` convention: `src/**/__tests__/*.test.{ts,tsx}`
- ✅ Run with `npm run test` (once) or `npm run test:watch` (watch mode)
- Future: Integration tests for Tauri commands, E2E tests for critical user flows

### Manual Testing
- ✅ Test all MVP features before marking complete
- ✅ Test error cases (wrong password, corrupted file)
- ✅ Test edge cases (empty data, large datasets)
- ✅ Test on target platform (Windows 11 for MVP)

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
- ✅ Close GitHub Issues when tasks complete
- ✅ Document blockers as comments on the GitHub Issue
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
- ✅ Hungarian (HU)

### Currency Support
- ✅ CHF (Swiss Franc)
- ✅ EUR (Euro)

### Implementation (CONFIRMED)
- Uses `react-i18next` + `i18next` for translations
- Translation files in `src/i18n/` (`en.json`, `de.json`, `hu.json`)
- Language stored in app settings (localStorage), not in the finance file
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

## Licensing Rules (CONFIRMED from LICENSING.md)

### Agent Rules for Licensing
These rules MUST be followed by all agents working on licensing-related features:

#### No Lock-In (NON-NEGOTIABLE)
- ✅ **NEVER implement a lock screen that traps user data**
- ✅ **ALWAYS allow Open Database + Export** in all modes
- ✅ Read-Only mode is the expiry fallback, not a brick
- ✅ Free Viewer can open any encrypted DB with password

#### Mode Behavior
- ✅ Full Mode = valid license → all base features enabled
- ✅ Read-Only Mode = no valid license → view + export only
- ✅ NEVER hard-brick app on license expiry
- ✅ On subscription expiry → Read-Only, NOT locked out

#### Feature Gating
- ✅ Gate features by `build_release_date <= feature_updates_until`
- ✅ **NEVER use system clock** (`today()`) for eligibility
- ✅ Build metadata must include deterministic release date

#### Old Generation Handling
- ✅ Valid signature with old generation → **keep Full Mode**
- ✅ Show non-intrusive banner to import newer license
- ✅ Only block feature-update downloads, not core usage
- ✅ Offline use continues normally

#### Revocation Policy
- ✅ On `revoked` status → allow Read-Only + export, show warning
- ✅ Avoid hard lockouts for perpetual licenses
- ✅ Only revoke in confirmed abuse cases

### Communication Rules
- ✅ Clearly explain what each plan includes
- ✅ Clearly explain what requires internet
- ✅ Clearly explain what happens on expiry
- ✅ Clearly explain what "Offline Mode" does

---

## References

- See **PRODUCT_REQUIREMENTS.md** for MVP scope
- See **GitHub Issues** for task breakdown
- See **ARCHITECTURE_CURRENT.md** for current architecture
- See **LICENSING.md** for authoritative licensing spec
- See **LICENSING_SUMMARY.md** for structured licensing summary
