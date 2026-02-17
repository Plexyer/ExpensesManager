# Licensing MVP Impacts

This document summarizes which licensing requirements impact the MVP and which are deferred.

---

## MVP Safeguards — Status Tracker

These three safeguards are non-negotiable data-access principles tracked as GitHub Issues:

| Safeguard | GitHub Issue | Status | Notes |
|-----------|-------------|--------|-------|
| **SAFEGUARD-1: App Mode Plumbing** (Full vs Read-Only) | [#61](https://github.com/Plexyer/ExpensesManager/issues/61) | OPEN — `out-of-scope` | Deferred from MVP; reopened and moved out of scope |
| **SAFEGUARD-2: Export Always Available** | [#62](https://github.com/Plexyer/ExpensesManager/issues/62) | CLOSED — completed | Export works without license checks (NON-NEGOTIABLE) |
| **SAFEGUARD-3: DB Open/Unlock Never Blocked** | [#63](https://github.com/Plexyer/ExpensesManager/issues/63) | CLOSED — completed | DB access is license-independent (NON-NEGOTIABLE) |

---

## Must Implement in MVP

These licensing requirements affect core architecture and user experience from day 1. Implementing them later would cause major rework.

### 1. Export ALWAYS Available (NON-NEGOTIABLE) — IMPLEMENTED
- CSV export works in both Full and Read-Only modes
- No licensing check blocks export
- **Impact**: Export feature is implemented without mode gating
- **Rationale**: Users must never be locked out of their data
- **GitHub Issue**: [#62](https://github.com/Plexyer/ExpensesManager/issues/62) — closed/completed

### 2. Open Database + Unlock Never Blocked (NON-NEGOTIABLE) — IMPLEMENTED
- Opening an encrypted database file never requires a valid license
- Password unlock works regardless of license status
- **Impact**: File/database operations are license-independent; only write actions would be gated
- **Rationale**: No data lock-in
- **GitHub Issue**: [#63](https://github.com/Plexyer/ExpensesManager/issues/63) — closed/completed

### 3. Encrypted Portable Database File (CONFIRMED) — IMPLEMENTED
- Database is always encrypted with user password (SQLCipher with Argon2id key derivation)
- File is portable (can be copied to other devices)
- **Impact**: Already part of MVP security requirements; no additional work from licensing perspective

---

## Deferred from MVP (Out-of-Scope)

These items were originally planned for MVP but have been moved out of scope:

### 1. App Modes: Full vs Read-Only — DEFERRED
- **Full Mode**: Read + Write enabled (requires valid license)
- **Read-Only Mode**: Read + Export only (default when no license)
- **Impact**: UI components would need to respect mode state; all write actions conditionally disabled
- **GitHub Issue**: [#61](https://github.com/Plexyer/ExpensesManager/issues/61) — open, labeled `out-of-scope`
- **Reason**: MVP ships as full-featured app; licensing enforcement deferred to post-MVP

### 2. Read-Only Mode as Default — DEFERRED
- App would launch in Read-Only mode if no valid license present
- **Depends on**: App Mode Plumbing (#61)
- **Deferred with**: #61

### 3. Perpetual License File Import — DEFERRED
- User imports a signed license file (`.json` or `.lic`)
- Signature verified offline using embedded public key
- **Depends on**: App Mode Plumbing (#61) — no point importing licenses if modes aren't enforced

### 4. License State in Redux — DEFERRED
- Track current mode (full / read-only), license type, license details
- **Depends on**: App Mode Plumbing (#61)

### 5. License Status Display — DEFERRED
- Settings page shows current license status
- **Depends on**: License State in Redux, which depends on #61

---

## Must Design Hooks for Post-MVP (Implement Later)

These items need placeholder infrastructure to avoid rework, but full implementation is deferred.

### 1. Feature Gating by Build Date
- Gate features by `build_release_date <= feature_updates_until`
- NEVER use system clock for eligibility
- **Hook**: Build must include release date metadata (even if feature gating logic is minimal)
- **Full Implementation**: Deferred until features exist that need gating

### 2. Mode-Based UI Disabling
- Write buttons/actions disabled in Read-Only mode
- **Hook**: Components should check mode before allowing actions
- **Full Implementation**: Complete as licensing is implemented

### 3. Read-Only Banner
- Non-intrusive banner when in Read-Only mode
- Links to "Purchase" or "Import License"
- **Hook**: Banner component exists and displays when mode is read-only
- **Full Implementation**: Purchase link can be placeholder or external URL initially

---

## Deferred Until Post-MVP

These items are explicitly out of scope for MVP. They do not affect MVP architecture decisions.

### Payment & Purchase Flow
- Payment provider selection (LQ1 - OPEN)
- In-app purchase flow
- Checkout webhooks
- **Why Deferred**: MVP can use manual license file import; no payment integration needed

### Subscription System (Basic Paid / Premium)
- Lease token issuance and refresh
- Offline window and grace period values (LQ4 - OPEN)
- Account/login system
- **Why Deferred**: MVP only supports perpetual license import; subscription requires server infrastructure

### Server Infrastructure
- License issuance endpoints
- License status check endpoints
- Lease token refresh endpoints
- Update distribution server
- **Why Deferred**: MVP is fully offline-capable; server adds complexity

### Recovery Secret Flow
- Recovery secret presentation at purchase (LQ3 - OPEN)
- License recovery endpoint
- **Why Deferred**: Requires purchase flow and server

### Bugfix Updates Forever
- Distribution mechanics (LQ2 - OPEN)
- Versioning strategy for bugfix vs feature releases
- **Why Deferred**: Policy decision, not architecture blocker

### Premium Features
- Premium dependency rules (LQ5 - OPEN)
- Cloud sync, bank sync, receipt AI/OCR
- **Why Deferred**: All premium features are explicitly out of scope for MVP

### Offline Mode Toggle
- Toggle to disable all network access (perpetual only)
- Warning dialog before enabling
- **Why Deferred**: Low priority; MVP can work without this UI since perpetual license works offline by default

### Old Generation License Banner
- Check for newer generation when online
- Show non-intrusive banner to update
- **Why Deferred**: Requires server infrastructure for license status check

---

## Summary Table

| Item | MVP Status | Rationale |
|------|------------|-----------|
| Export always available | ✅ IMPLEMENTED (#62 closed) | No data lock-in |
| DB unlock never blocked | ✅ IMPLEMENTED (#63 closed) | No data lock-in |
| Encrypted portable DB | ✅ IMPLEMENTED | SQLCipher + Argon2id |
| App Modes (Full/Read-Only) | ❌ DEFERRED (#61 out-of-scope) | Licensing enforcement post-MVP |
| Read-Only as default | ❌ DEFERRED | Depends on #61 |
| License file import | ❌ DEFERRED | Depends on #61 |
| License state in Redux | ❌ DEFERRED | Depends on #61 |
| License status display | ❌ DEFERRED | Depends on #61 |
| Build date metadata | 🔶 HOOK ONLY | Needed for future feature gating |
| Mode-based UI disabling | 🔶 HOOK ONLY | Implement as licensing is built |
| Read-Only banner | 🔶 HOOK ONLY | Placeholder OK initially |
| Payment/purchase flow | ❌ DEFERRED | Server required |
| Subscription system | ❌ DEFERRED | Server required |
| Server endpoints | ❌ DEFERRED | Post-MVP |
| Recovery secret | ❌ DEFERRED | Requires purchase flow |
| Bugfix distribution | ❌ DEFERRED | Policy decision |
| Premium features | ❌ DEFERRED | Out of scope |
| Offline mode toggle | ❌ DEFERRED | Low priority |
| Old gen license banner | ❌ DEFERRED | Server required |

---

## References

- **LICENSING.md**: Authoritative licensing specification
- **LICENSING_SUMMARY.md**: Structured summary of licensing decisions
- **`.cursor/archive/QUESTIONS_FOR_USER.md`**: Open licensing questions (LQ1-LQ5, all deferred) — archived
- **MVP_PLAN.md**: Phase 7.5 covers licensing implementation
- **GitHub Issues**: Safeguard issues #61, #62, #63
