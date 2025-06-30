# Core App Development Roadmap (Tauri + React)

This document outlines what needs to be done to build the initial "Core" version of the ethical budgeting and finance app using Tauri and React.

## Objective
Build the offline-first, local-only desktop application that includes all features from the "Foundation License" tier. This version works without an internet connection, cloud access, or any login.

---

## Tech Stack
- **Tauri** – Secure, lightweight desktop app shell (Rust + WebView)
- **React** – UI framework (with Hooks and Context API or Zustand for state management)
- **TailwindCSS** – For styling and theme support
- **SQLite** – Local database via Tauri plugin
- **FileSystem API** – For storing backups and imports (CSV/JSON)
- **QR Parser** – JS or Rust-based QR bill parser
- **Export Tools** – JS-based PDF/CSV export or integrate with Rust lib

---

## MVP Features to Implement

### UI & Navigation
- Basic app shell with sidebar + tabbed navigation (Dashboard, Budgets, Inbox, Settings)
- Responsive layout with theming (light/dark)

### Budget Management
- Manual income & expense entry
- Editable categories with limits
- Monthly view with totals and remaining budget
- Persistent local storage via SQLite

### QR Bill Inbox
- Upload and parse QR invoice (via camera or file)
- Extract and display: amount, date, IBAN, reference
- Add tags, notes, due date
- Mark as paid/unpaid

### Reminders & Calendar
- Local-only task scheduler or due date reminders
- Calendar view of upcoming/past due invoices

### Export & Backup
- Export to JSON, CSV, PDF
- Local backups to chosen folder
- Manual import (support JSON/CSV)

### Settings Panel
- Theme toggles (light/dark/custom CSS)
- UI version selector (toggle between layouts if available)
- Developer mode with plugin loader (stubbed for now)
- Privacy Dashboard stub (list stored files, DB path, etc.)

---

## Optional Stretch Goals (Still Foundation Tier)
- Multiple budgets (personal, side hustle)
- Currency conversion (manual rate setting)
- Inline visualizations (bar/pie chart per category)

---

## Local Dev Setup
- Monorepo: `/app-core` (public) and `/app-private` (optional plugin logic)
- Dev build: `npm run tauri dev` (React + Rust process)
- SQLite migrations via `tauri-plugin-sqlite`
- Use `vite` or `Next.js` for frontend scaffolding

---

## Security Principles (Core Version)
- No network access required or allowed by default
- No telemetry, no background processes
- All data readable and exportable by the user
- Offline-first operation from first launch

---

## Milestones
1. **Scaffold project with Tauri + React + Tailwind**
2. **Set up SQLite + simple file-based DB handler**
3. **Build budget entry UI + category logic**
4. **Integrate QR scanner (static image upload first)**
5. **Implement export/import + manual backup**
6. **Add Settings + Privacy Dashboard UI**
7. **Test, package and document core app logic**

Once completed, this becomes the paid "Foundation License" product with upgrade paths for future premium tiers.

