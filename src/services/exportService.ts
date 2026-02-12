import { invoke } from "@tauri-apps/api/core";

// NON-NEGOTIABLE: Export always available — no license or mode checks permitted.
// These functions must never be conditionally gated by app mode or license status.

/**
 * Export all budget data (periods, categories, line items) as a CSV string.
 * Returns a multi-section CSV with headers for each data type.
 */
export const exportToCsv = async (): Promise<string> => {
  return await invoke<string>("export_to_csv");
};

/**
 * Generate CSV and write it directly to a file at the given path.
 * Includes UTF-8 BOM for Excel compatibility.
 */
export const exportCsvToFile = async (path: string): Promise<void> => {
  return await invoke<void>("export_csv_to_file", { path });
};
