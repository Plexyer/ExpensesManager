import { save, open } from "@tauri-apps/plugin-dialog";

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
