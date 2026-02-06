# Questions for User

## Status Summary

| Question | Status | Decision Summary |
|----------|--------|------------------|
| Q1 | ✅ RESOLVED | Use rusqlite + SQLCipher, Windows 11 only for MVP |
| Q2 | ✅ RESOLVED | Use Argon2id for password hashing (starting fresh) |
| Q3 | ✅ RESOLVED | Single file per app instance for MVP |
| Q4 | ✅ RESOLVED | No special period overlap handling needed |
| Q5 | ✅ RESOLVED | Modal-only editing for MVP (no inline) |
| Q6 | ✅ RESOLVED | Plan for large category/line-item lists, use virtualization |
| Q7 | ✅ RESOLVED | Export only active transactions (exclude soft-deleted) |
| Q8 | ✅ RESOLVED | Use ISO date format (YYYY-MM-DD) for CSV |
| Q9 | ✅ RESOLVED | Target <100ms grid load, <500ms acceptable, add loading screens |
| Q10 | ✅ RESOLVED | Use virtualization for large lists |
| Q11 | ✅ RESOLVED | Multi-currency per period via additional columns, fixed conversion for MVP |
| Q12 | ✅ RESOLVED | Language in app settings (localStorage), not per file |
| Q13 | ✅ RESOLVED | Write automated tests during development |
| Q14 | ✅ RESOLVED | Custom columns out of scope, but plan for extensibility |
| Q15 | ✅ RESOLVED | Future premium features documented in BACKLOG.md |
| NQ1 | ✅ RESOLVED | Template default appears as first received line item |
| NQ2 | ✅ RESOLVED | Received date column shows first/last dates from line items |
| NQ3 | ✅ RESOLVED | ISO datetime, default time 00:00:00 if not provided |

---

## Encryption & Security

### Q1: SQLCipher Integration ✅ RESOLVED
**Question**: Does `rusqlite` support SQLCipher feature flag, or should we use a different approach (app-level encryption)?

**Context**: Encryption is required for MVP, but SQLCipher integration needs research. Fallback is app-level AES-256-GCM encryption.

**Impact**: Affects implementation approach and performance.

**Recommendation**: Research SQLCipher first (preferred), fallback to app-level if not feasible.

**Answer**: Use rusqlite and SQLCipher, for the MVP we are only trying to develop the app for my PC whitch is running on Windows 11, so for now no need for implementing it for MacOS or Linux.

**✅ DECISION**: Use rusqlite + SQLCipher. MVP targets Windows 11 only. MacOS/Linux support deferred to post-MVP.

---

### Q2: Password Hashing Upgrade ✅ RESOLVED
**Question**: Should we upgrade password hashing from SHA256 (current) to Argon2id (recommended) for new finance files?

**Context**: Current code uses SHA256 (`src-tauri/src/modules/security/auth.rs:21`), but Argon2id is recommended for new code.

**Impact**: Security improvement, but may require migration for existing users.

**Recommendation**: Use Argon2id for new files, keep SHA256 for backward compatibility (if needed).

**Answer**: There is no important data stored yet in the database, so use Argon2id, I am starting this project from the ground up anyways.

**✅ DECISION**: Use Argon2id exclusively. No backward compatibility with SHA256 needed (fresh start).

---

## Data Model

### Q3: Multi-File Support ✅ RESOLVED
**Question**: Should the `periods` table include `finance_file_id` column for multi-file support, or is single file per app instance sufficient for MVP?

**Context**: MVP specifies "multi-dataset: each finance is a separate portable file", but unclear if app supports multiple files open simultaneously.

**Impact**: Affects schema design and file management.

**Recommendation**: Single file per app instance for MVP (simpler), add multi-file support later if needed.

**Answer**: Implement the Recommendation, so single file per app instance for MVP, add multi-file support later if needed.

**✅ DECISION**: Single file per app instance for MVP. Multi-file support is post-MVP.

---

### Q4: Period Overlap Handling ✅ RESOLVED
**Question**: Should the system allow overlapping periods (e.g., monthly and biweekly periods in same date range)?

**Context**: User may want different cadences for different purposes.

**Impact**: Affects validation and UI display.

**Update (DESIGN CORRECTION)**: Overlap is not inherently an issue because each budget instance is one explicit period and all line items are timestamped.

**Recommendation**: No special overlap handling needed for MVP beyond validating a budget instance's own start/end dates.

**Answer**: Go with Recommendation.

**✅ DECISION**: No special overlap handling. Each budget instance has explicit boundaries; line items are timestamped.

---

## UI/UX

### Q5: Grid Inline Editing ✅ RESOLVED
**Question**: Should the grid support inline editing of cells (like Excel), or is modal-only editing sufficient for MVP?

**Context**: MVP specifies "double-click opens modal", but Excel-like behavior might include inline editing.

**Impact**: Affects grid implementation complexity.

**Recommendation**: Modal-only for MVP (simpler), inline editing can be future enhancement.

**Answer**: Go with Recommendation.

**✅ DECISION**: Modal-only editing for MVP. Inline editing deferred to post-MVP.

---

### Q6: Maximum Grid Size ✅ RESOLVED
**Question**: What is the maximum expected grid size (categories rows per period budget instance) for performance planning?

**Context**: Corrected design is **one period per grid view**, so scale is mostly about category row count and line item counts (modals), not number of period columns.

**Impact**: Affects grid implementation (virtualization, pagination).

**Recommendation**: Plan for large category lists (many rows) and potentially large line-item lists per category; optimize accordingly.

**Answer**: Go with Recommendation.

**✅ DECISION**: Plan for large category lists and large line-item lists. Use virtualization for performance.

---

## New questions after design correction

### NQ1: Template default amounts vs received line items ✅ RESOLVED
**Question**: When creating a period budget instance from a template, should the template's "default amounts" be materialized as initial **received** line items, or stored separately and only used as a target/reference?

**Context**: Corrected design says double-clicking **Received amount** opens line items, and totals roll up into the grid.

**Impact**: Affects schema and rollup logic (what the grid "Received amount" represents by default).

**Answer**: When double clicking the **Received amount** column, a small window opens with a small table. This table only has Titles on the top row. Each row represents a amount that got received from various sources. Here the first, automatic entry, that should appear, should be the "default amount" set by the temlapte the user is currently using for this Budget period.

**✅ DECISION**: Template default amount becomes the FIRST received line item automatically when creating a period from template. Additional received amounts can be added as more rows in the received line items table.

---

### NQ2: Received date semantics ✅ RESOLVED
**Question**: Is the category-row "Received date" meant to be an editable field independent of received line items, or derived from line items (e.g., earliest received item)?

**Context**: Corrected design states received date defaults to income arrival date for that period.

**Impact**: Affects whether received date is stored as a dedicated field or computed.

**Answer**: "Received date" is not a category-row, it is a column, with this title shown on the very top row. This column represents the first date and last date when money got received for this budget category (row). The first and last date, or only 1 singular date if there is only 1 enry in the smaller table as described in the **Answer** for NQ1, are to be taken from the smaller table, that appears when double clicking **Received amount**.

**✅ DECISION**: "Received date" column is DERIVED (computed), not stored. Shows first and last received dates from line items. If only one line item, shows single date. Format: "YYYY-MM-DD" or "YYYY-MM-DD - YYYY-MM-DD" for range.

---

### NQ3: Optional time storage ✅ RESOLVED
**Question**: For line items, if time is not provided, should we store a pure date, or store an ISO datetime with a default time (e.g., 00:00)?

**Context**: Corrected design says line items have explicit date and optionally time.

**Impact**: Affects storage type/format and sorting consistency.

**Answer**: Every entry has at least a date, so the user can see on which day that money got spent or received. All dates should be in ISO format, and if the user does not provide a time, just set it to 00:00:00. The user can alsways go back and edit it.

**✅ DECISION**: Store as ISO 8601 datetime (e.g., "2026-01-15T00:00:00"). If user doesn't provide time, default to 00:00:00. Time is editable later.

---

## Export & Backup

### Q7: CSV Export Scope ✅ RESOLVED
**Question**: Should CSV export include soft-deleted transactions (`deleted_at IS NOT NULL`), or only active transactions?

**Context**: Transactions are soft-deleted, unclear if export should include them.

**Impact**: Affects export format and data completeness.

**Recommendation**: Export only active transactions (exclude soft-deleted) for MVP, add option to include deleted later.

**Answer**: Go with Recommendation.

**✅ DECISION**: Export only active transactions (WHERE deleted_at IS NULL) for MVP.

---

### Q8: Date Format in CSV ✅ RESOLVED
**Question**: Should CSV dates use ISO format (YYYY-MM-DD) or locale-specific format (e.g., MM/DD/YYYY for EN, DD.MM.YYYY for DE)?

**Context**: CSV should be Excel-compatible, but locale formatting may be preferred.

**Impact**: Affects CSV format and Excel compatibility.

**Recommendation**: Use ISO format (YYYY-MM-DD) for MVP (universal compatibility), add locale option later.

**Answer**: All dates should use ISO format, for now. Changes kann be added later for different timezones and so on.

**✅ DECISION**: Use ISO format (YYYY-MM-DD) for all dates in CSV export. Locale-specific formatting deferred to post-MVP.

---

## Performance

### Q9: Query Performance Target ✅ RESOLVED
**Question**: What is the acceptable query time for grid data load (< 100ms, < 500ms, < 1s)?

**Context**: Need to set performance targets for optimization.

**Impact**: Affects indexing strategy and query optimization.

**Recommendation**: Target < 100ms for grid load, < 500ms acceptable for large datasets.

**Answer**: I would like it to be under 100ms where possible. If not then 500ms is okey, but I would say Implement loading screens where neccesary so that if the program does take longer, the user does not get angry or disapointed quickly, but rather understands, through the loading screen, that something is taking some time to load.

**✅ DECISION**: Target <100ms for grid load. <500ms acceptable for large datasets. MUST implement loading screens/indicators for operations that may take time.

---

### Q10: Pagination vs Virtualization ✅ RESOLVED
**Question**: Should large transaction lists use pagination or infinite scroll/virtualization?

**Context**: Transaction modal may show many transactions, need to handle performance.

**Impact**: Affects UI implementation.

**Recommendation**: Use virtualization (load all, render visible) for MVP, pagination can be added later if needed.

**Answer**: Go with Recommendation.

**✅ DECISION**: Use virtualization for large lists (categories, line items). Render only visible rows.

---

## Internationalization

### Q11: Currency Per Envelope vs Global ✅ RESOLVED
**Question**: Should currency be stored per envelope (each envelope can have different currency) or globally per finance file?

**Context**: MVP supports CHF and EUR, but unclear if mixed currencies in same period are allowed.

**Impact**: Affects schema design and UI display.

**Recommendation**: Currency per envelope (more flexible), default to CHF for MVP.

**Answer**: A single period should be able to use different currencies. The main currency for the template, so for the amounts that get budgetet for each budget categroy (row), should be set in the settings for the template. Then if user wants to have different currencies inside one period, they can add a second column "Received amount (CHF)" and "Received amount (EURO)". The conversion ration should be a fix number for the MVP. Later it should be fetched from some API to stay up to date.

**✅ DECISION**: 
- Template has a "main currency" setting (default CHF)
- Periods can have multiple currency columns: "Received amount (CHF)", "Received amount (EUR)"
- MVP uses FIXED conversion ratio (configurable in settings)
- Post-MVP: Live conversion rates via API

---

### Q12: Language Persistence ✅ RESOLVED
**Question**: Should language preference be stored in finance file or in app settings (localStorage)?

**Context**: Language affects UI display, but unclear where preference should be stored.

**Impact**: Affects i18n implementation.

**Recommendation**: Store in app settings (localStorage) for MVP, can move to finance file later if multi-user support needed.

**Answer**: The language is set from the user in settings. So one user can open the finance database in their app in english, while the other opens the same finance database (not at the same time open) in german, and all column, row and texts will be translated.

**✅ DECISION**: Language stored in app settings (localStorage), NOT in finance file. Same finance file can be opened in different languages by different users (on different machines). UI strings (columns, labels) are translated based on user's language setting.

---

## Testing

### Q13: Automated Tests for MVP ✅ RESOLVED
**Question**: Should we set up automated tests (Jest, Rust tests) for MVP, or is manual testing sufficient?

**Context**: No test infrastructure exists currently, but automated tests would improve quality.

**Impact**: Affects development time and quality assurance.

**Recommendation**: Manual testing for MVP (faster), set up automated tests post-MVP.

**Answer**: Do testing of your own code all the time. Write testcases to always be able to verify your own work. I will additionally manually test the MVP, so that I can see if that the app runs and works the way I want it to work. But testcases will help you see if you implement one feature, you didn't break a different one, so always write tests to verify your own work, repeatably.

**✅ DECISION**: Write automated tests DURING development (not post-MVP). Tests verify each feature works and prevents regressions. User will also manually test the complete MVP.

---

## Future Features (Not MVP, but good to know)

### Q14: Custom Columns Priority ✅ RESOLVED
**Question**: After MVP, what is the priority for custom user-defined columns feature?

**Context**: Out of scope for MVP, but good to understand priority for future planning.

**Impact**: Affects architecture decisions (should be extensible).

**Answer**: Yes the custom user defind columns feature is out of scope for the MVP, but will be a feature in future versions of this app, so when implementing the MVP, implement it so that this feature will be easier to implement later.

**✅ DECISION**: Custom columns OUT OF SCOPE for MVP. Architecture should be EXTENSIBLE to support custom columns in future versions.

---

### Q15: Reconciliation Feature Scope ✅ RESOLVED
**Question**: What is the expected scope of the reconciliation feature (bank statement import, transaction matching, etc.)?

**Context**: Premium future feature, but understanding scope helps with data model design.

**Impact**: May affect transaction schema design.

**Answer**: There are multiple future premium features that I want to have in the app but are out of scope for the MVP version. One is connecting banking apps like UBS E-banking (as read only) so that my app can verify if transactions have gone trought (as periodic transactions) and get information about date, time, amount, notes an so on. A second future feature that for the MVP is out of scope, is a feature to fotograph receipts and have an algorithm or AI read what is on the receipt and store that data directly for the corresponding budget category. Lastly would be a cloud syncing feature, that would give the user the ability to forget about where their databse file is stored, and I would have a server that saves it for them, and they can access it anytime anywhere over their account. All of this are future features that are out of scope for the MVP, so include them in the Backlog.md file but unther their own category of "future features / premium features".

**✅ DECISION**: Future premium features (OUT OF SCOPE for MVP):
1. **Bank Integration**: Connect UBS E-banking (read-only) for transaction verification
2. **Receipt Scanning**: Photograph receipts + AI/algorithm to extract data
3. **Cloud Sync**: Server-based storage with account access from anywhere

All documented in BACKLOG.md under "Future Features / Premium Features" section.

---

## References
- **ENCRYPTION_SPEC.md**: Encryption questions
- **DATA_MODEL.md**: Schema questions
- **PRODUCT_REQUIREMENTS.md**: Feature questions
- **BACKLOG.md**: Future features section
