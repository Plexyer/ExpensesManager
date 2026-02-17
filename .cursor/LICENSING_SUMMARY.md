# Licensing Summary (CONFIRMED)

This document summarizes the CONFIRMED licensing decisions extracted from `.cursor/LICENSING.md` (the authoritative source of truth).

---

## Core Principles (CONFIRMED)

| Principle | Description |
|-----------|-------------|
| **Ownership-first** | Perpetual plan users own the app forever, offline, unlimited devices |
| **Privacy-first** | No email/account required for perpetual licenses |
| **Offline-first** | App must function without internet (especially perpetual plan) |
| **Transparency** | Clear separation: base features (offline) vs premium features (cloud/bank/OCR) |
| **No lock-in** | Users must ALWAYS be able to access their data via Read-Only mode or Free Viewer |

---

## Data Access Rules (CONFIRMED)

### Encrypted Portable Database
- User chooses where to store the database file
- Database file is **always encrypted** with user password
- Password prompt on every open
- Optional: "Remember password on this device" via OS secure storage / keychain
- File is portable: can be copied to another device and opened with password

### Viewer Compatibility
- Free Read-Only Viewer can open encrypted DB files (requires password)

---

## Plans Overview (CONFIRMED)

### Plan 1: Free Read-Only Viewer
| Aspect | Detail |
|--------|--------|
| **Cost** | Free download |
| **License Required** | No |
| **Capabilities** | Open encrypted DB, view, search, filter, print, export (CSV/JSON) |
| **Restrictions** | Cannot add/edit/delete data, no import, no write operations |

### Plan 2: Perpetual Base
| Aspect | Detail |
|--------|--------|
| **Cost** | ~20 CHF (one-time) |
| **License Required** | Perpetual License File (signed) |
| **Capabilities** | Full base features, works offline forever, bugfix updates forever, feature updates for 5 years |
| **Devices** | Unlimited (import license file on any device) |
| **Offline Mode Toggle** | Available - disables all internet access |

### Plan 3: Extend Feature Updates (Add-on)
| Aspect | Detail |
|--------|--------|
| **Cost** | +10 CHF for +5 years |
| **Requirement** | Existing perpetual license |
| **Process** | Re-issue license with extended `feature_updates_until`, increment `generation` |

### Plan 4: Basic Paid (Rental)
| Aspect | Detail |
|--------|--------|
| **Cost** | ~5 CHF/year |
| **License Required** | Account/login + server-issued Lease Token |
| **Capabilities** | Base features, all new features while active |
| **Offline Window** | 30 days + 1-2 weeks grace |
| **On Expiry** | App switches to **Read-Only Mode** (NOT hard brick) |

### Plan 5: Premium
| Aspect | Detail |
|--------|--------|
| **Cost** | ~5-10 CHF/month |
| **Requirement** | Base access (Perpetual OR active Basic Paid) + Account/login |
| **Capabilities** | Cloud sync, bank sync, receipt scanning AI/OCR |
| **Internet** | Required for premium features |

---

## Licensing Artifacts (CONFIRMED)

### Perpetual License File
**Format**: Portable file (e.g., `license.json` / `license.lic`)

**Fields**:
- `license_id` (public identifier)
- `generation` (integer, increments on reissue)
- `plan_type` = "perpetual"
- `feature_updates_until` (date)
- `issued_at` (date)
- `signature` (Ed25519 or equivalent)

**Verification**: App embeds public key, verifies signature **offline**.

### Recovery Secret
- Issued at purchase time
- Server stores: `license_id`, `hash(recovery_secret)` (Argon2/bcrypt, never plaintext), entitlements
- Recovery flow: User provides `license_id + recovery_secret` → Server reissues license (new `generation` if needed)

### Subscription Lease Token
**Fields**:
- `account_id`
- `subscription_paid_until`
- `offline_allowed_until` (issued_at + 30 days + grace)
- `issued_at`
- `signature`

**Storage**: Prefer OS secure storage
**Refresh**: Required periodically from server to remain in Full Mode

---

## App Modes & Entitlement Logic (CONFIRMED)

### App Modes
| Mode | Capabilities |
|------|--------------|
| **Full Mode** | Read + Write enabled |
| **Read-Only Mode** | Read & Export enabled, write operations disabled |

### Perpetual Base Entitlement
- Valid license signature → **Full Mode**
- Feature update eligibility:
  - **MUST NOT rely on system clock** (`today()`)
  - Gate by **build/feature release date**: `build_release_date <= feature_updates_until`
  - Prevents "PC clock rollback" abuse

### Basic Paid Entitlement
- Lease token valid + signature valid + `now <= offline_allowed_until` + `subscription_paid_until` not passed → **Full Mode**
- Lease expired / cannot refresh → **Read-Only Mode**
- Read-Only MUST still allow exporting and viewing

### Premium Entitlement
- Premium features enabled only if:
  - Base access present (Perpetual OR active Basic Paid) AND
  - Premium subscription active AND
  - Internet available

---

## Offline Mode Toggle (CONFIRMED)

### Perpetual Base
- Settings toggle: **Offline Mode**
- When enabled: No server calls (no update checks, no license status check)
- Show warning: "Disables updates and online validations"
- When disabled: May perform update checks and optional license status checks

### Basic Paid / Premium
- Toggle disabled or constrained
- Temporary offline allowed (within offline window)
- Must periodically verify subscription to remain in Full Mode

---

## Old Generation License Behavior (CONFIRMED)

If perpetual license is validly signed but server reports newer `generation`:
- **Do NOT switch to Read-Only**
- Keep app in **Full Mode** (no disruption)
- Show **non-intrusive banner**: "A newer license version exists. Import it to continue receiving updates."
- Banner actions: Restore / Import · Dismiss
- Restrict only: update checks / feature-update downloads blocked until refreshed
- Offline use continues normally

---

## Revocation Policy (CONFIRMED)

### Perpetual Licenses
- Accept that offline-forever users may keep using older license
- Online-only enforcement: on update/license check, server responds: `valid`, `outdated_generation`, or `revoked`
- If `outdated_generation`: show banner, block feature-update downloads
- If `revoked` (rare, confirmed abuse): allow Read-Only + export, show warning, avoid hard lockouts

### Subscription Licenses
- If lease not refreshed within offline window → Read-Only mode

---

## Fraud Prevention (CONFIRMED)

### Perpetual Plan (soft enforcement)
- Recovery requires Recovery Secret (prevents license ID guessing)
- Reissue increments `generation`
- Rate-limit reissues per `license_id` (e.g., 1 per X days)
- Optional: updates served only with valid entitlement check (download tokens)

### Subscription Plan (strong enforcement)
- Account-based identity
- Lease token refresh required
- No refresh within offline window → Read-Only mode

---

## UX Non-Negotiables (CONFIRMED)

| Requirement | Rationale |
|-------------|-----------|
| **Always provide Open Database + Export** | Even in Read-Only modes |
| **Lock screens must never trap user data** | No lock-in |
| **Clear communication** | What each plan includes, what requires internet, what happens on expiry, what Offline Mode does |

---

## Feature Update Gating (CONFIRMED)

- Each build/feature has deterministic **release date** or build metadata
- Gating logic: `build_release_date <= feature_updates_until`
- **NEVER rely on system clock** for eligibility check
- Prevents clock manipulation abuse

---

## Server Endpoints (Suggested)

| Endpoint | Purpose |
|----------|---------|
| `POST /license/restore` | license_id + recovery_secret → license file |
| `GET /license/check` | license_id + generation + app_version → status + update info |
| `POST /lease/refresh` | account auth → lease token |
| `GET /updates/check` | optional combined with /license/check |

---

## Open Questions (From Licensing Spec)

1. ~~**Exact encryption technology** for portable DB~~ — **RESOLVED**: SQLCipher with Argon2id key derivation (implemented in Phase 1).
2. **Payment provider choice** and webhook integration — *(Deferred — post-MVP)*
3. ~~**Premium dependency clarification**~~ — **RESOLVED**: Premium requires Base access (either Perpetual OR Basic Paid). Confirmed.
4. **Bugfix updates forever**: Final policy on distribution mechanics — *(Deferred — post-MVP)*

---

## References

- **Source of Truth**: `.cursor/LICENSING.md`
- **Encryption Details**: `.cursor/ENCRYPTION_SPEC.md`
- **Data Model**: `.cursor/DATA_MODEL.md`
