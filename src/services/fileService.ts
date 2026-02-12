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
 * Information about a database file (password excluded for security).
 */
export interface DbFileInfo {
  format: string;
  version: number;
  password_hint: string | null;
}

/**
 * Result of creating a new database.
 */
export interface CreateDbResult {
  path: string;
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
// ENCRYPTED DATABASE OPERATIONS (SQLCipher)
// ============================================================================
//
// These functions interact with SQLCipher-encrypted database files.
// The encryption key is derived from the user password using Argon2id.
// ============================================================================

/**
 * Creates a new encrypted database file at the specified path.
 *
 * @param path - Full path to the file to create
 * @param password - Password for encryption
 * @param hint - Optional password hint
 * @throws Error if file cannot be created
 */
// NON-NEGOTIABLE: DB access never requires license — this function must never be gated by app mode or license status.
export const createEncryptedDb = async (
  path: string,
  password: string,
  hint: string | null
): Promise<CreateDbResult> => {
  return await invoke<CreateDbResult>("create_encrypted_db", {
    path,
    password,
    hint: hint || null,
  });
};

/**
 * Reads database info without opening/decrypting.
 * Used to show password hint before user enters password.
 *
 * @param path - Full path to the database file
 * @returns File info including hint, version, etc.
 * @throws Error if file is invalid or cannot be read
 */
export const getDbInfo = async (path: string): Promise<DbFileInfo> => {
  return await invoke<DbFileInfo>("get_db_info", { path });
};

/**
 * Opens and unlocks an existing encrypted database.
 *
 * @param path - Full path to the database file
 * @param password - Password for decryption
 * @returns File info if password is correct
 * @throws Error if password is wrong or file is invalid
 */
// NON-NEGOTIABLE: DB access never requires license — this function must never be gated by app mode or license status.
export const openEncryptedDb = async (
  path: string,
  password: string
): Promise<DbFileInfo> => {
  return await invoke<DbFileInfo>("open_encrypted_db", { path, password });
};

/**
 * Saves the current database to disk without closing the connection.
 * Writes the modified temp DB back to the original `.financedb` file.
 *
 * @throws Error if no database is open or save fails
 */
export const saveDb = async (): Promise<void> => {
  await invoke("save_db");
};

/**
 * Closes the current database connection.
 * Automatically writes changes back to disk before closing.
 *
 * @throws Error if no database is open or close fails
 */
export const closeDb = async (): Promise<void> => {
  await invoke("close_db");
};

/**
 * Diagnostic function: get detailed file information for debugging.
 * Useful for diagnosing password/encryption issues.
 *
 * @param path - Full path to the database file
 * @returns Diagnostic report as a string
 * @throws Error if file cannot be read or is invalid
 */
export const diagnoseDbFile = async (path: string): Promise<string> => {
  return await invoke<string>("diagnose_db_file", { path });
};

// ============================================================================
// GRID DATA OPERATIONS
// ============================================================================
//
// These functions load budget grid data with rollup calculations.
// ============================================================================

/**
 * One category row in the grid for a budget instance (with rollup totals).
 */
export interface GridCategoryRow {
  /** Primary key of the budget_instance_category */
  budget_instance_category_id: number;
  /** Foreign key to global_categories */
  global_category_id: number;
  /** Category name from global_categories */
  category_name: string;
  /** Default amount from template (allocated budget) */
  default_amount: number;
  /** Currency code (e.g., "CHF", "EUR") */
  default_currency: string;
  /** Display order */
  sort_order: number;
  /** Sum of all non-deleted 'received' line items */
  received_total: number;
  /** Sum of all non-deleted 'spent' line items */
  spent_total: number;
  /** Calculated: received_total - spent_total */
  remaining: number;
  /** Earliest date among received line items (derived), e.g. "2026-02-01" */
  first_received_date: string | null;
  /** Latest date among received line items (derived), e.g. "2026-02-15" */
  last_received_date: string | null;
}

/**
 * Response for getGridData: list of category rows with rollups for one budget instance.
 */
export interface GetGridDataResult {
  /** The budget instance ID these rows belong to */
  budget_instance_id: number;
  /** Category rows with rollup totals */
  rows: GridCategoryRow[];
}

/**
 * Gets grid data for a budget instance, including category rows with rollup totals.
 *
 * @param budgetInstanceId - The ID of the budget instance to load
 * @returns Grid data with category rows including received_total, spent_total, and remaining
 * @throws Error if no database is open or budget instance not found
 */
export const getGridData = async (
  budgetInstanceId: number
): Promise<GetGridDataResult> => {
  return await invoke<GetGridDataResult>("get_grid_data", {
    budgetInstanceId,
  });
};
