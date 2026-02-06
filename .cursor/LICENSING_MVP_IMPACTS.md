# Licensing MVP Impacts

This document summarizes which licensing requirements impact the MVP and which are deferred.

---

## Must Implement in MVP

These licensing requirements affect core architecture and user experience from day 1. Implementing them later would cause major rework.

### 1. App Modes: Full vs Read-Only (CONFIRMED)
- **Full Mode**: Read + Write enabled (requires valid license)
- **Read-Only Mode**: Read + Export only (default when no license)
- **Impact**: UI components must respect mode state; all write actions must be conditionally disabled

### 2. Read-Only Mode as Default (CONFIRMED)
- App launches in Read-Only mode if no valid license is present
- Users can view, search, filter, and export data
- Write operations (add/edit/delete) are disabled
- **Impact**: Mode state must exist from app startup; UI must handle disabled state

### 3. Export ALWAYS Available (NON-NEGOTIABLE)
- CSV export must work in both Full and Read-Only modes
- No licensing check should ever block export
- **Impact**: Export feature must be implemented without mode gating
- **Rationale**: Users must never be locked out of their data

### 4. Open Database + Unlock Never Blocked (NON-NEGOTIABLE)
- Opening an encrypted database file must never require a valid license
- Password unlock must work regardless of license status
- **Impact**: File/database operations are license-independent; only write actions are gated
- **Rationale**: No data lock-in

### 5. Perpetual License File Import (CONFIRMED)
- User can import a signed license file (`.json` or `.lic`)
- Signature verified offline using embedded public key
- Valid license → switch to Full Mode
- **Impact**: Need license import UI in Settings; need signature verification in Rust backend

### 6. Encrypted Portable Database File (CONFIRMED)
- Database is always encrypted with user password (SQLCipher)
- File is portable (can be copied to other devices)
- **Impact**: Already part of MVP security requirements; no additional work from licensing perspective

### 7. License State in Redux (CONFIRMED)
- Track current mode (full / read-only)
- Track license type (perpetual / subscription / none)
- Track license details (licenseId, generation, featureUpdatesUntil)
- **Impact**: New Redux slice for license state

### 8. License Status Display (CONFIRMED)
- Settings page shows current license status
- Display plan type, feature updates until date
- Import license action available
- **Impact**: New License section in Settings UI

---

## Must Design Hooks for MVP (Implement Later)

These items need placeholder infrastructure in MVP to avoid rework, but full implementation is deferred.

### 1. Feature Gating by Build Date
- Gate features by `build_release_date <= feature_updates_until`
- NEVER use system clock for eligibility
- **MVP Hook**: Build must include release date metadata (even if feature gating logic is minimal in MVP)
- **Full Implementation**: Deferred until features exist that need gating

### 2. Mode-Based UI Disabling
- Write buttons/actions disabled in Read-Only mode
- **MVP Hook**: Components should check mode before allowing actions
- **Full Implementation**: Complete as components are built

### 3. Read-Only Banner
- Non-intrusive banner when in Read-Only mode
- Links to "Purchase" or "Import License"
- **MVP Hook**: Banner component exists and displays when mode is read-only
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
| App Modes (Full/Read-Only) | ✅ MUST IMPLEMENT | Core UX architecture |
| Read-Only as default | ✅ MUST IMPLEMENT | Default behavior |
| Export always available | ✅ MUST IMPLEMENT (NON-NEGOTIABLE) | No data lock-in |
| DB unlock never blocked | ✅ MUST IMPLEMENT (NON-NEGOTIABLE) | No data lock-in |
| License file import | ✅ MUST IMPLEMENT | Minimal licensing UI |
| License state in Redux | ✅ MUST IMPLEMENT | State management |
| License status display | ✅ MUST IMPLEMENT | Settings UI |
| Build date metadata | 🔶 HOOK ONLY | Needed for future feature gating |
| Mode-based UI disabling | 🔶 HOOK ONLY | Implement as components built |
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
- **QUESTIONS_FOR_USER.md**: Open licensing questions (LQ1-LQ5, all deferred)
- **MVP_PLAN.md**: Phase 7.5 covers licensing implementation
- **BACKLOG.md**: TASK-LIC-* covers licensing tasks
