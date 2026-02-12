/**
 * Maps common Rust/backend error substrings to user-friendly messages.
 * Order matters — first match wins.
 */
const ERROR_MAP: ReadonlyArray<[pattern: RegExp, friendly: string]> = [
  [/database is locked/i, "The database is busy. Please try again in a moment."],
  [/no such table/i, "The database structure is outdated. Please re-open the file."],
  [/file is not a database/i, "This file is not a valid database or the password is incorrect."],
  [/incorrect password|wrong password|decrypt/i, "The password you entered is incorrect."],
  [/unique constraint/i, "A record with the same value already exists."],
  [/foreign key constraint/i, "Cannot complete this action because related data depends on it."],
  [/disk i\/o error|unable to open|cannot open/i, "Could not access the file. Make sure it exists and is not in use."],
  [/network|timeout|connection/i, "A connection error occurred. Please check your setup and try again."],
];

/**
 * Converts a raw backend error string into a user-friendly message.
 *
 * - Strips Rust-style error prefixes (e.g. `"EncryptedDb: …"`)
 * - Matches known patterns to friendly text
 * - Falls back to a generic message if nothing matches
 *
 * @param raw - The raw error string from a Tauri command or JS Error.message
 * @param fallback - Optional custom fallback message
 * @returns A user-friendly error string
 */
export const formatErrorMessage = (
  raw: unknown,
  fallback = "Something went wrong. Please try again."
): string => {
  if (!raw) return fallback;

  const message = typeof raw === "string"
    ? raw
    : raw instanceof Error
      ? raw.message
      : String(raw);

  // Strip common Rust prefixes like "EncryptedDb: ", "SqliteFailure: "
  const cleaned = message.replace(/^[A-Za-z]+Error:\s*/i, "").trim();

  for (const [pattern, friendly] of ERROR_MAP) {
    if (pattern.test(cleaned)) {
      return friendly;
    }
  }

  // If the cleaned message looks technical (long, contains "::" or stack-like), use fallback
  if (cleaned.length > 120 || /::/.test(cleaned)) {
    return fallback;
  }

  // Otherwise return the cleaned message as-is (it's likely already human-readable)
  return cleaned || fallback;
};
