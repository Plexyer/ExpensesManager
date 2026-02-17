# Licensing & Data Access Specification (Desktop App)

This document defines how licensing, recovery, offline usage, subscriptions, feature update eligibility, and data access work for this project.

It is written to be used by Cursor and implementation agents as the **source of truth** for licensing behavior.

---

## 1. Core Principles

- **Ownership-first (Perpetual plan):** Users who buy the perpetual plan can use the app forever, offline, on unlimited devices.
- **Privacy-first:** For perpetual licenses, avoid collecting personal data (no email/account required).
- **Offline-first:** The app must function without internet (especially for perpetual plan).
- **Transparency:** Clearly separate:
  - Base functionality (offline, low-cost to operate)
  - Ongoing-cost features (cloud/bank/OCR) that require subscriptions
- **No lock-in:** Users must always be able to access their data:
  - via **in-app Read-Only mode** (when subscriptions expire), and
  - via a **Free Read-Only Viewer** tool.

---

## 2. Data Storage: Encrypted Portable Database File

### 2.1 Always-encrypted database file (enforced)
- The user chooses where to store the database file.
- The database file is **always encrypted with a user password**.
- Provide UX support:
  - Prompt for password on open.
  - Offer “Remember password on this device” (store in OS secure storage / keychain).
- The encrypted database file is portable:
  - Can be copied to another device and opened there with the password.

### 2.2 Viewer compatibility
- The Free Read-Only Viewer must be able to open encrypted DB files (ask password).

> Note: Encrypted **file-based** DB strongly suggests SQLite + encryption (e.g., SQLCipher or equivalent). The system must preserve portability.

---

## 3. Plans Overview

### 3.1 Plan: Free Read-Only Viewer (Free download)
- **No license required.**
- Can:
  - Open encrypted DB file (password required)
  - View, search, filter, print
  - Export (CSV/JSON/etc.)
- Cannot:
  - Add/edit/delete data
  - Import, sync, or any write operations

### 3.2 Plan: Perpetual Base (Buy Once, ~20 CHF)
- Requires: **Perpetual License File** (signed)
- Includes:
  - Full base features (budgeting/savings/transactions)
  - Works offline forever
  - Bugfix updates forever (policy decision, but goal is “forever”)
  - Feature updates for **5 years**
  - Optional “Offline Mode” toggle that disables all internet access
- Unlimited devices:
  - User can import the license file on any number of devices.

### 3.3 Add-on: Extend Feature Updates (+10 CHF for +5 years)
- Requires: Perpetual license exists.
- Process:
  - Re-issue a new perpetual license with extended `feature_updates_until`
  - Increment `generation` for the license.

### 3.4 Plan: Basic Paid (Rental, ~5 CHF/year)
- Requires:
  - Account/login (email or equivalent identity)
  - Server-issued **Lease Token**
- Includes:
  - Base features
  - All new features while subscription is active
- Offline rules:
  - Offline usable for **30 days**, plus **1–2 weeks grace**
  - After offline window expires without verification → app switches to **Read-Only Mode**
    - (No “hard brick”; Read-Only is required to avoid lock-in.)

### 3.5 Plan: Premium (Monthly/Yearly, ~5–10 CHF/month)
- Requires:
  - **Base access** (either Perpetual Base or active Basic Paid)
  - Account/login (identity required due to cloud services)
- Includes:
  - Cloud sync
  - Bank sync
  - Receipt scanning AI/OCR
- Internet required for premium features.

---

## 4. Licensing Artifacts

### 4.1 Perpetual License File (offline, signed)
- A portable, importable file (e.g., `license.json` / `license.lic`) that contains:
  - `license_id` (public identifier)
  - `generation` (integer, increments when reissued)
  - `plan_type = "perpetual"`
  - `feature_updates_until` (date)
  - `issued_at` (date)
  - `signature` (Ed25519 or equivalent)
- Verification:
  - App embeds the public key and verifies signature **offline**.
- Behavior:
  - Valid signature → perpetual base features enabled, regardless of internet connectivity.

### 4.2 Recovery Secret (privacy-first recovery)
- At purchase time, user receives a **Recovery Secret**.
- Server stores only:
  - `license_id`
  - hash(recovery_secret) (argon2/bcrypt, **never store plaintext**)
  - entitlements (feature_updates_until, etc.)
- Recovery flow:
  - User provides `license_id + recovery_secret`
  - Server reissues the license file (new `generation` if needed)

### 4.3 Subscription Lease Token (for Basic Paid and Premium)
- Server issues a signed token containing:
  - `account_id`
  - `subscription_paid_until`
  - `offline_allowed_until` (issued_at + 30 days + grace)
  - `issued_at`
  - signature
- Stored locally (prefer OS secure storage).
- App validates signature offline.
- App requires periodic refresh from server to continue editing mode.

---

## 5. Entitlement Logic & Modes

### 5.1 App modes
- **Full Mode:** Read + Write enabled
- **Read-Only Mode:** Read & export enabled; write operations disabled

### 5.2 Perpetual Base (Buy Once)
- If perpetual license signature is valid:
  - App runs in **Full Mode** (read/write enabled)
- Feature update eligibility:
  - Must NOT rely on system clock (`today()`).
  - Gate by **build/feature release date**, e.g.:
    - Allow features if: `build_release_date <= feature_updates_until`
  - This prevents “PC clock rollback” abuse.

### 5.3 Basic Paid (Rental, 5 CHF/year)
- If lease token exists and:
  - token signature valid AND
  - `now <= offline_allowed_until` AND
  - `subscription_paid_until` not passed (or within grace policy)
  - → app runs in **Full Mode**
- If lease expired and cannot refresh:
  - → app runs in **Read-Only Mode**
- In Read-Only:
  - Must still allow exporting and viewing data.

### 5.4 Premium
- Premium features are enabled only if:
  - Base access is present (Perpetual Base or active Basic Paid) AND
  - Premium subscription is active AND
  - Internet available for premium features (cloud/bank/OCR)

---

## 6. “Offline Mode” Toggle (Internet Disable)

### 6.1 Perpetual Base
- Provide a settings toggle: **Offline Mode**
- When enabled:
  - App does not call any servers (no update checks, no license status check)
  - Show clear warning: disables updates and online validations
- When disabled:
  - App may perform update checks and optional license status checks

### 6.2 Basic Paid / Premium
- Offline Mode toggle should be disabled or clearly constrained:
  - Users can be offline temporarily (within offline window)
  - But app must periodically verify subscription to remain in Full Mode

---

## 7. Old Generation Perpetual License Behavior (IMPORTANT)

If a perpetual license file is validly signed but the server reports a newer `generation` exists:

- **Do NOT switch to Read-Only.**
- Keep app in **Full Mode** (no disruption).
- Show a **non-intrusive banner**:
  - “A newer license version exists. Import it to continue receiving updates.”
  - Actions: Restore / Import · Dismiss
- Restrict only online entitlements:
  - Update checks / feature-update downloads may be blocked until refreshed
- Offline use continues normally.

Rationale: prevents punishing honest users who recovered/reissued their license on another device.

---

## 8. Revocation & “Bricking” Old Licenses (Perpetual)

- The project accepts that:
  - If a user stays offline forever with an older perpetual license, they may keep using it.
- Online-only enforcement:
  - On update/license check, the server can respond:
    - license is `valid`, `outdated_generation`, or `revoked`
  - If `outdated_generation`:
    - show banner (see Section 7)
    - block feature-update downloads
  - If `revoked` (rare, for confirmed abuse/leak):
    - recommended response: allow Read-Only + export; show warning
    - avoid hard lockouts for perpetual without strong justification + clear ToS

---

## 9. Fraud Prevention (Privacy-Friendly)

### 9.1 Perpetual plan (unlimited devices; soft enforcement)
- Recovery requires Recovery Secret (prevents guessing license IDs).
- Reissue increments `generation`.
- Rate-limit reissues per `license_id` (e.g., 1 per X days).
- Optional: updates served only with valid entitlement check (download tokens).

### 9.2 Subscription plan (strong enforcement)
- Account-based identity.
- Lease token refresh required.
- If lease not refreshed within offline window → Read-Only mode.

---

## 10. UX Requirements (Non-negotiables)

- Always provide:
  - **Open Database** and **Export** even in Read-Only modes.
- Lock screens must never trap the user’s data.
- Clearly communicate:
  - What each plan includes
  - What requires internet
  - What happens on expiry
  - What “Offline Mode” does

---

## 11. Implementation Notes for Cursor

### 11.1 Data flow
- The app maintains:
  - The encrypted DB path selected by the user
  - Local license state (perpetual license file OR lease token)
  - UI mode (Full vs Read-Only)

### 11.2 Feature gating
- Each build or feature should have a deterministic **release date** or build metadata.
- Gating uses release date vs `feature_updates_until` (no system clock dependency).

### 11.3 Server endpoints (suggested minimal set)
- `POST /license/restore` (license_id + recovery_secret → license file)
- `GET /license/check` (license_id + generation + app_version → status + update info)
- `POST /lease/refresh` (account auth → lease token)
- `GET /updates/check` (optional combined with /license/check)

---

## 12. Open Questions (If needed later)

- ~~Exact encryption technology for the portable DB~~ — **RESOLVED**: SQLCipher with Argon2id key derivation (implemented in Phase 1).
- Payment provider choice and webhook integration. *(Deferred — post-MVP)*
- ~~Whether Premium requires Basic Paid OR Perpetual~~ — **RESOLVED**: Premium requires Base access (either Perpetual OR Basic Paid). Confirmed.
- Final policy on “bugfix updates forever” distribution mechanics. *(Deferred — post-MVP)*

---
