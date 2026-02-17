# Build and Run Instructions

## Prerequisites (CONFIRMED)

### Required
- **Node.js** v18+ (for frontend)
- **Rust** (latest stable) - for backend
- **Tauri CLI** - installed via `npm install` (dev dependency)
- **MSVC C++ Build Tools** (Windows) - required for SQLCipher/OpenSSL compilation

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
Should show latest stable Rust

---

## Development Mode (CONFIRMED)

### Start Dev Server
```bash
npm run tauri dev
```

**What happens**:
1. Vite dev server starts on `http://localhost:1420`
2. Rust backend compiles (first time takes **5-15 minutes** due to SQLCipher + OpenSSL compilation; subsequent builds are fast/cached)
3. Tauri window opens, loads frontend from dev server
4. Hot reload enabled for frontend changes
5. Rust changes require restart (manual)

### Dev Server Details
- **Port**: 1420 (fixed, configured in `vite.config.ts`)
- **HMR Port**: 1421 (for hot module replacement)
- **Frontend**: Vite dev server with React
- **Backend**: Rust compiled in debug mode

### Finance File Handling
- The user creates or opens encrypted `.financedb` files via native file dialogs
- Files are SQLCipher-encrypted SQLite databases with a custom file header (salt + KDF params)
- Schema migrations run automatically when a file is opened (current: v5)
- There is no fixed database location -- the user chooses where to save/open their file

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

## Testing (CONFIRMED)

### Frontend Tests (Vitest)
Test infrastructure is fully set up with **Vitest** + **@testing-library/react**.

```bash
# Run all frontend tests once
npm run test

# Run tests in watch mode (re-runs on file changes)
npm run test:watch
```

**Configuration**:
- Framework: Vitest v4 with jsdom environment
- Config: `vite.config.ts` → `test` section
- Setup file: `src/test/setup.ts`
- Test pattern: `src/**/*.{test,spec}.{ts,tsx}`
- Libraries: `@testing-library/react`, `@testing-library/jest-dom`, `@testing-library/user-event`

**Existing test files** (as of Phase 11):
- `src/utils/__tests__/formatFileSize.test.ts`
- `src/utils/__tests__/dateFormat.test.ts`
- `src/utils/__tests__/currency.test.ts`
- `src/utils/__tests__/passwordStrength.test.ts`
- `src/utils/__tests__/passwordValidation.test.ts`
- `src/utils/__tests__/formatErrorMessage.test.ts`
- `src/services/__tests__/attachmentService.test.ts`
- `src/hooks/__tests__/useAttachmentUpload.test.ts`

### Rust Tests
```bash
cd src-tauri
cargo test
```
Rust unit tests exist within source modules where applicable.

---

## Troubleshooting (CONFIRMED)

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

## Environment Variables (CONFIRMED)

### Development
- `TAURI_DEV_HOST` - Custom host for dev server (optional)

### Production
- No environment variables currently used (CONFIRMED)

---

## Finance File Location (CONFIRMED)

### Development & Production
- **No fixed path** -- the user creates/opens `.financedb` files via native file dialog
- Files can be stored anywhere the user chooses (Desktop, Documents, USB drive, etc.)
- Files are fully portable and can be moved/copied between machines

### Accessing Database
- Finance files are **SQLCipher-encrypted** and cannot be opened with standard SQLite tools
- To inspect the DB, use `sqlcipher` CLI with the correct key, or debug through the app
- The app handles all encryption/decryption via Argon2id key derivation + SQLCipher raw key mode

---

## Build Scripts Reference (CONFIRMED from package.json)

```json
{
  "scripts": {
    "dev": "vite",                    // Frontend dev server only
    "build": "tsc && vite build",    // Frontend production build
    "preview": "vite preview",       // Preview production build
    "tauri": "tauri",                // Tauri CLI (use: npm run tauri dev/build)
    "test": "vitest run",            // Run all frontend tests once
    "test:watch": "vitest"           // Run tests in watch mode
  }
}
```

---

## Platform-Specific Notes

### Windows (CONFIRMED - MVP target)
- Requires Visual Studio Build Tools with MSVC C++ (for Rust + SQLCipher compilation)
- MSI installer created on build
- First build compiles SQLCipher + vendored OpenSSL from source (adds 5-15 min)

### macOS (untested - future platform)
- May require Xcode Command Line Tools
- DMG installer created on build
- May need code signing for distribution

### Linux (untested - future platform)
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
