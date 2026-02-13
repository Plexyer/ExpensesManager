/**
 * Formats a byte count into a human-readable file size string.
 *
 * Uses binary units (1 KB = 1024 bytes) with up to 1 decimal place.
 *
 * @param bytes - File size in bytes (non-negative integer)
 * @returns Formatted string, e.g. "2.4 MB", "156 KB", "1.2 GB"
 */
export const formatFileSize = (bytes: number): string => {
  if (bytes < 0) return "0 B";
  if (bytes === 0) return "0 B";

  const units = ["B", "KB", "MB", "GB", "TB"];
  const k = 1024;

  // Find the appropriate unit index
  const unitIndex = Math.min(
    Math.floor(Math.log(bytes) / Math.log(k)),
    units.length - 1
  );

  const value = bytes / Math.pow(k, unitIndex);

  // Use 0 decimal places for bytes, 1 for everything else
  if (unitIndex === 0) {
    return `${Math.round(value)} B`;
  }

  // Remove trailing ".0" for clean display
  const formatted = value.toFixed(1);
  const cleaned = formatted.endsWith(".0")
    ? formatted.slice(0, -2)
    : formatted;

  return `${cleaned} ${units[unitIndex]}`;
};

/** 25 MB soft limit in bytes */
export const FILE_SIZE_SOFT_LIMIT = 25 * 1024 * 1024;
