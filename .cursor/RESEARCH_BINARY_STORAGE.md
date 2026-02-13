# Research: Binary File Storage & Encryption in Rust/Tauri

## 1. Storing Binary Files/BLOBs in SQLite with Rust

### Library: `rusqlite`

**Crate Name:** `rusqlite`  
**Documentation:** https://docs.rs/rusqlite/

**Key Features:**
- Dedicated `blob` module for handling binary data storage
- Incremental BLOB I/O operations (requires `"blob"` feature flag)
- `Blob` struct implements `std::io::Read`, `std::io::Write`, and `std::io::Seek`
- Compatible with standard Rust I/O tools (`BufReader`, `BufWriter`)
- Allows reading/writing binary data incrementally without loading entire blobs into memory

**Best Practices:**
- Use incremental BLOB I/O for large files to avoid memory issues
- SQLite does not provide API-level access to change BLOB sizes through the Blob handle - size changes must be performed through SQL statements
- When using `BufWriter` with a Blob, ensure proper size management as the buffer may accept more data than the Blob can accommodate

**Performance Considerations:**
- **Small BLOBs (< 100KB):** SQLite outperforms separate files by ~35% due to reduced overhead (single open/close vs per-file operations)
- **Large BLOBs (> 100KB):** Reading from separate files becomes faster than reading from the database
- **Optimal page size:** Use 8192 or 16384 bytes for best performance with large BLOBs
- **Disk space:** SQLite uses ~20% less disk space for small blobs (no filesystem block padding)

**SQLite BLOB Size Limits:**
- Hard limit: ~2GB per BLOB (2^31-1 bytes = 2,147,483,647 bytes)
- Not suitable for files larger than 2GB

**Database vs Filesystem Decision:**
- **Store in DB:** Small files (< 100KB), transactional integrity needed, atomic operations required
- **Store on filesystem:** Large files (> 100KB), files > 2GB, need portability/transferability, better read performance for large files

**Compatibility Notes:**
- Requires Rust 1.56+
- Feature flag: `"blob"` must be enabled for incremental BLOB I/O
- Works with standard SQLite (not SQLCipher-specific)

---

## 2. Encrypting Files/BLOBs in Rust

### Library: `aes-gcm`

**Crate Name:** `aes-gcm`  
**Documentation:** https://docs.rs/aes-gcm/

**Key Features:**
- Pure Rust implementation of AES-GCM (Authenticated Encryption with Associated Data)
- Part of the RustCrypto project
- Security audit by NCC Group with no significant findings
- Constant-time operations to prevent timing attacks
- Dual-licensed under Apache 2.0 and MIT

**Compatibility Notes:**
- Requires Rust 1.56+
- Production-ready and well-maintained

### Library: `chacha20poly1305`

**Crate Name:** `chacha20poly1305`  
**Documentation:** https://docs.rs/chacha20poly1305/

**Key Features:**
- Pure Rust implementation of ChaCha20Poly1305 (RFC 8439)
- AEAD cipher designed for fast, constant-time software implementations
- Part of the RustCrypto AEADs collection
- Dual-licensed under Apache 2.0 and MIT

**Compatibility Notes:**
- Requires Rust 1.56+
- Production-ready and well-maintained

### Library: `enc_file`

**Crate Name:** `enc_file`  
**Documentation:** https://docs.rs/enc_file/

**Key Features:**
- Practical file encryption wrapper
- Supports AES-GCM-SIV and ChaCha20Poly1305
- Demonstrates real-world usage patterns

**Compatibility Notes:**
- Higher-level API built on top of RustCrypto primitives

### Encryption Best Practices:

**Before storing in SQLite:**
1. Encrypt individual blobs using `aes-gcm` or `chacha20poly1305` before insertion
2. Store encrypted data as BLOB in SQLite
3. Decrypt after retrieval from database

**SQLCipher Integration:**
- SQLCipher automatically encrypts all data at the page level (including BLOBs)
- Uses 256-bit AES in CBC mode
- Each page has individual random IV regenerated on each write
- HMAC-SHA512 for tamper detection
- **Note:** If using SQLCipher, BLOBs are automatically encrypted - you may not need additional encryption unless you need value-level encryption

**Compatibility Notes:**
- Both libraries are part of RustCrypto unified AEAD framework
- Can be used together with rusqlite for encrypted blob storage
- If using SQLCipher, consider whether additional encryption is necessary

---

## 3. Tauri File System Access

### Plugin: Dialog Plugin

**Package Name:** `@tauri-apps/plugin-dialog`  
**Rust Crate:** `tauri-plugin-dialog`  
**Documentation:** https://v2.tauri.app/plugin/dialog

**Key Features:**
- Native file picker dialogs
- `FileDialogBuilder` struct for constructing file pickers
- Support for single/multiple file selection
- Support for directory selection
- File extension filters
- Cross-platform path handling (Linux/Windows/macOS return paths, iOS returns `file://` URIs, Android returns content URIs)

**Compatibility Notes:**
- Tauri 2.x API
- Filesystem plugin works with any path format out of the box

### Plugin: Filesystem Plugin

**Package Name:** `@tauri-apps/plugin-fs`  
**Rust Crate:** `tauri-plugin-fs`  
**Documentation:** https://v2.tauri.app/plugin/file-system

**Key Features:**
- JavaScript bindings for file system access
- `stat()` for file metadata
- Binary file reading capabilities
- Path traversal attack prevention
- Scope-based access control using glob patterns
- Support for path variables: `$APPDATA`, `$APPCONFIG`, `$DESKTOP`, `$DOWNLOAD`, etc.

**Security Considerations:**
- Requires explicit permission configuration via glob patterns in app capabilities
- Access restricted to relative paths to base directories or paths created with path API
- Parent directory accessors ("../") are not allowed

**Setup:**
1. Install plugins via npm/yarn
2. Initialize in Rust backend (`lib.rs`)
3. Import JavaScript bindings in frontend code
4. Configure scopes in app capabilities

**Compatibility Notes:**
- Tauri 2.x API
- Requires proper scope configuration for security

---

## 4. Image Compression/Thumbnail Generation in Rust

### Library: `image`

**Crate Name:** `image`  
**Documentation:** https://docs.rs/image/

**Key Features:**
- Primary library for image manipulation in Rust
- `thumbnail()` function in `image::imageops` module
- Comprehensive image manipulation library
- Aggregates major image formats into unified interface
- Supports PNG, JPEG, GIF, TIFF, WebP, and others (through optional dependencies)
- Reading, writing, and editing capabilities

**Compatibility Notes:**
- Well-documented and actively maintained by image-rs organization
- Available on crates.io
- Open-source

### Library: `thumbnails`

**Crate Name:** `thumbnails`  
**Documentation:** https://docs.rs/thumbnails/

**Key Features:**
- Higher-level API for thumbnail generation
- Multi-format support: images, videos, PDFs, archives
- Uses `image` crate as dependency
- `Thumbnailer` struct for simplified thumbnail creation and saving
- Convenient for batch thumbnail generation

**Compatibility Notes:**
- Built on top of `image` crate
- Available on crates.io
- Open-source

### PDF Thumbnail Generation

### Library: `pdf-thumb`

**Crate Name:** `pdf-thumb`  
**Documentation:** https://docs.rs/pdf-thumb/

**Key Features:**
- Windows-specific library
- Wraps WinRT's PdfDocument class
- Generates thumbnails from first page
- Customizable width and image format (PNG/JPEG)

**Example:**
```rust
let pdf = PdfDoc::open("test.pdf")?;
let thumb = pdf.thumb()?;
std::fs::write("thumb.png", &thumb)?;
```

**Compatibility Notes:**
- **Windows-only**
- Uses WinRT APIs

### Library: `thumbnails` (PDF support)

**Crate Name:** `thumbnails`  
**Documentation:** https://docs.rs/thumbnails/

**Key Features:**
- Cross-platform PDF thumbnail generation
- Uses pdfium-render internally
- Supports PDFs, videos, images, and archives

**Example:**
```rust
let thumbnailer = Thumbnailer::new(250, 250);
let thumb = thumbnailer.get("document.pdf")?;
thumb.save("thumb.png")?;
```

**Compatibility Notes:**
- Cross-platform
- Requires pdfium-render dependency

### Library: `pdf-extract`

**Crate Name:** `pdf-extract`  
**Documentation:** https://docs.rs/pdf-extract/

**Key Features:**
- Pure Rust library for PDF content extraction
- Extracts text, fonts, and document structure
- No external dependencies

**Compatibility Notes:**
- Limited documentation (4% documented)
- Pure Rust implementation

### Alternative: Poppler + Cairo (via FFI)

**Key Features:**
- Cross-platform solution using Poppler bindings
- Renders PDF pages to images
- More control but requires external dependencies

**Example:**
```rust
let doc = PopplerDocument::new_from_file(pdf_path, "")?;
let page = doc.get_page(0)?;  // First page
page.render(&context);
surface.write_to_png(&mut file)?;
```

**Compatibility Notes:**
- Requires Poppler and Cairo libraries
- More complex setup
- Maximum cross-platform control

**Recommendations:**
- **For images:** Use `image` crate for thumbnails
- **For PDFs (cross-platform):** Use `thumbnails` crate
- **For PDFs (Windows-only):** Use `pdf-thumb` crate
- **For maximum control:** Use Poppler + Cairo bindings

---

## Summary Recommendations

### For Your ExpensesManager Project:

1. **Binary Storage:**
   - Use `rusqlite` with `blob` feature for small files (< 100KB)
   - Consider filesystem storage for larger files with paths in DB
   - Use incremental BLOB I/O for memory efficiency

2. **Encryption:**
   - Use `aes-gcm` or `chacha20poly1305` for encrypting blobs before storage
   - If using SQLCipher, evaluate if additional encryption is needed (page-level encryption may be sufficient)

3. **File Access:**
   - Use Tauri 2 Dialog plugin for file selection
   - Use Tauri 2 Filesystem plugin for reading binary files
   - Configure proper scopes for security

4. **Thumbnails:**
   - Use `image` crate for image thumbnails
   - Use `thumbnails` crate for PDF thumbnails (cross-platform)
   - Consider `pdf-thumb` if Windows-only
