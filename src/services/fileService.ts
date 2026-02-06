import { save, open } from "@tauri-apps/plugin-dialog";
import { invoke } from "@tauri-apps/api/core";

const FILE_EXTENSION = "financedb";
const FILE_FILTER = {
  name: "Finance Database",
  extensions: [FILE_EXTENSION],
};

export interface FileDialogResult {
  path: string;
  name: string;
}

/**
 * Information returned when reading a stub file (password excluded for security).
 */
export interface StubFileInfo {
  format: string;
  version: number;
  created_at: string;
  password_hint: string | null;
}

/**
 * Opens a save dialog for creating a new finance file.
 * Returns null if user cancels the dialog.
 */
export const selectNewFilePath = async (): Promise<FileDialogResult | null> => {
  const path = await save({
    title: "Create New Finance File",
    filters: [FILE_FILTER],
    defaultPath: `my-budget.${FILE_EXTENSION}`,
  });

  if (!path) {
    return null;
  }

  // Ensure file has correct extension
  const finalPath = path.endsWith(`.${FILE_EXTENSION}`) ? path : `${path}.${FILE_EXTENSION}`;
  const name = extractFileName(finalPath);

  return { path: finalPath, name };
};

/**
 * Opens an open dialog for selecting an existing finance file.
 * Returns null if user cancels the dialog.
 */
export const selectExistingFilePath = async (): Promise<FileDialogResult | null> => {
  const path = await open({
    title: "Open Finance File",
    filters: [FILE_FILTER],
    multiple: false,
    directory: false,
  });

  if (!path) {
    return null;
  }

  // open() returns string | string[] | null, but we set multiple: false
  const filePath = Array.isArray(path) ? path[0] : path;
  const name = extractFileName(filePath);

  return { path: filePath, name };
};

/**
 * Extracts filename from a full path.
 */
const extractFileName = (filePath: string): string => {
  // Handle both Windows and Unix paths
  const parts = filePath.split(/[/\\]/);
  return parts[parts.length - 1] || filePath;
};

// ============================================================================
// STUB FILE OPERATIONS (MVP ONLY - Will be replaced by SQLCipher)
// ============================================================================
//
// ⚠️ WARNING: These functions use a temporary plaintext file format.
// The password is stored in plaintext for MVP testing purposes only.
// This will be replaced by SQLCipher-encrypted SQLite in TASK-1.6.
//
// See .cursor/FINANCEDB_STUB_SPEC.md for the stub file specification.
// ============================================================================

/**
 * Creates a new stub file at the specified path.
 * 
 * ⚠️ MVP STUB ONLY - Stores password in plaintext!
 * 
 * @param path - Full path to the file to create
 * @param password - Master password (will be stored in plaintext for MVP)
 * @param hint - Optional password hint
 * @throws Error if file cannot be written
 */
export const createStubFile = async (
  path: string,
  password: string,
  hint: string | null
): Promise<void> => {
  await invoke("create_stub_file", {
    path,
    password,
    hint: hint || null,
  });
};

/**
 * Reads stub file info without exposing the password.
 * 
 * @param path - Full path to the stub file
 * @returns File info including hint, version, etc.
 * @throws Error if file is invalid or cannot be read
 */
export const readStubFileInfo = async (path: string): Promise<StubFileInfo> => {
  return await invoke<StubFileInfo>("read_stub_file_info", { path });
};

/**
 * Verifies a password against a stub file.
 * 
 * @param path - Full path to the stub file
 * @param password - Password to verify
 * @returns File info if password is correct
 * @throws Error if password is wrong or file is invalid
 */
export const verifyStubPassword = async (
  path: string,
  password: string
): Promise<StubFileInfo> => {
  return await invoke<StubFileInfo>("verify_stub_password", { path, password });
};
