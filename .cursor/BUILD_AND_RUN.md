# Build and Run Instructions

## Prerequisites (CONFIRMED)

### Required
- **Node.js** v16+ (for frontend)
- **Rust** (latest stable) - for backend
- **Tauri CLI** - installed via `npm install` (dev dependency)

### Optional
- **Git** - for version control
- **VS Code** - recommended IDE (extensions in `.vscode/extensions.json`)

---

## Installation (CONFIRMED)

### 1. Clone Repository
```bash
git clone <repository-url>
cd ExpensesManager
```

### 2. Install Frontend Dependencies
```bash
npm install
```
This installs:
- React, Redux, Tailwind, etc. (see `package.json`)
- Tauri CLI as dev dependency

### 3. Verify Rust Installation
```bash
rustc --version
cargo --version
```
Should show Rust 1.70+ (or latest stable)

---

## Development Mode (CONFIRMED)

### Start Dev Server
```bash
npm run tauri dev
```

**What happens**:
1. Vite dev server starts on `http://localhost:1420`
2. Rust backend compiles (first time may take a few minutes)
3. Tauri window opens, loads frontend from dev server
4. Hot reload enabled for frontend changes
5. Rust changes require restart (manual)

### Dev Server Details
- **Port**: 1420 (fixed, configured in `vite.config.ts`)
- **HMR Port**: 1421 (for hot module replacement)
- **Frontend**: Vite dev server with React
- **Backend**: Rust compiled in debug mode

### Database Initialization
- Database auto-creates on first `init_database` call
- Location: `%APPDATA%/expensesmanager/expenses_encrypted.sqlite` (Windows)
- Migrations run automatically via `init_database` command

---

## Production Build (CONFIRMED)

### Build Application
```bash
npm run tauri build
```

**What happens**:
1. Frontend builds: `npm run build` → TypeScript compiles, Vite bundles to `dist/`
2. Rust compiles: Cargo builds backend in release mode
3. Tauri bundles: Creates installer for current platform
4. Output: Installer in `src-tauri/target/release/bundle/`

### Build Output Locations
- **Windows**: `src-tauri/target/release/bundle/msi/expensesmanager_0.1.0_x64_en-US.msi`
- **macOS**: `src-tauri/target/release/bundle/dmg/expensesmanager_0.1.0_x64.dmg`
- **Linux**: `src-tauri/target/release/bundle/appimage/expensesmanager_0.1.0_x86_64.AppImage`

### Build Configuration
- **Frontend dist**: `dist/` (configured in `vite.config.ts`)
- **Tauri config**: `src-tauri/tauri.conf.json`
- **Window size**: 800x600 (dev), configurable for production

---

## Testing (INFERRED - not confirmed)

### Current State
- No test scripts in `package.json`
- No test files found in repo
- No test configuration visible

### Recommended Testing Setup (for MVP)
```bash
# Frontend tests (if added)
npm run test

# Rust tests (if added)
cd src-tauri
cargo test
```

---

## Troubleshooting (INFERRED)

### Common Issues

#### Port 1420 Already in Use
**Error**: `Port 1420 is already in use`
**Solution**: 
- Kill process using port 1420
- Or change port in `vite.config.ts` (not recommended, Tauri expects 1420)

#### Rust Compilation Errors
**Error**: `cargo build` fails
**Solution**:
- Update Rust: `rustup update`
- Clean build: `cd src-tauri && cargo clean && cargo build`

#### Database Locked
**Error**: `database is locked`
**Solution**:
- Close any other instances of the app
- Delete database file and restart (data loss)

#### Tauri Window Doesn't Open
**Error**: Window doesn't appear
**Solution**:
- Check console for errors
- Verify `tauri.conf.json` window config
- Try `npm run tauri dev -- --debug`

---

## Development Workflow (CONFIRMED)

### Typical Workflow
1. **Start dev server**: `npm run tauri dev`
2. **Make changes**: Edit React/TypeScript files (hot reload)
3. **Test changes**: Window auto-refreshes
4. **Backend changes**: Edit Rust files, restart dev server
5. **Database changes**: Edit migrations, restart app (migrations run on init)

### File Watching
- **Frontend**: Vite watches `src/` (ignores `src-tauri/`)
- **Backend**: Manual restart required for Rust changes
- **Config**: Changes to `tauri.conf.json` require restart

---

## Environment Variables (INFERRED)

### Development
- `TAURI_DEV_HOST` - Custom host for dev server (optional)

### Production
- No environment variables currently used (CONFIRMED)

---

## Database Location (CONFIRMED)

### Development & Production
- **Windows**: `%APPDATA%\expensesmanager\expenses_encrypted.sqlite`
- **macOS**: `~/Library/Application Support/expensesmanager/expenses_encrypted.sqlite`
- **Linux**: `~/.local/share/expensesmanager/expenses_encrypted.sqlite`

### Accessing Database
- Use SQLite browser (e.g., DB Browser for SQLite)
- Or command line: `sqlite3 <path-to-db>`

---

## Build Scripts Reference (CONFIRMED from package.json)

```json
{
  "scripts": {
    "dev": "vite",                    // Frontend dev server only
    "build": "tsc && vite build",    // Frontend production build
    "preview": "vite preview",      // Preview production build
    "tauri": "tauri"                 // Tauri CLI (use: npm run tauri dev/build)
  }
}
```

---

## Platform-Specific Notes (INFERRED)

### Windows
- Requires Visual Studio Build Tools (for Rust compilation)
- MSI installer created on build

### macOS
- May require Xcode Command Line Tools
- DMG installer created on build
- May need code signing for distribution

### Linux
- Requires system dependencies (see Tauri docs)
- AppImage created on build

---

## References

- **Tauri Docs**: https://tauri.app/
- **Vite Docs**: https://vitejs.dev/
- **Rust Docs**: https://www.rust-lang.org/
- See **PROJECT_OVERVIEW.md** for project context

---

## Next Steps

- Read **PROJECT_OVERVIEW.md** for project overview
- Read **ARCHITECTURE_CURRENT.md** for architecture details
- Read **MVP_PLAN.md** for implementation roadmap
