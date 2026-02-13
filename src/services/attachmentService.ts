import { invoke } from "@tauri-apps/api/core";
import { open, save } from "@tauri-apps/plugin-dialog";
import type {
  AttachmentMeta,
  AttachmentCounts,
  AttachmentSummary,
  FileMetaInfo,
} from "../types/attachment.types";

// ============================================================================
// File Picker Utilities
// ============================================================================

/** File type filters for the attachment file picker dialog. */
const ATTACHMENT_FILTERS = [
  {
    name: "Images",
    extensions: [
      "jpg", "jpeg", "png", "gif", "webp", "bmp", "tiff", "tif", "svg",
    ],
  },
  {
    name: "Documents",
    extensions: ["pdf", "doc", "docx", "xls", "xlsx", "txt", "csv"],
  },
  {
    name: "All Files",
    extensions: ["*"],
  },
];

/**
 * Opens a native file picker dialog for selecting attachment files.
 * Supports multi-select and filters for images, documents, and all files.
 *
 * @returns Array of selected file paths, or null if the user cancelled
 */
export const pickAttachmentFiles = async (): Promise<string[] | null> => {
  const result = await open({
    title: "Select Files to Attach",
    filters: ATTACHMENT_FILTERS,
    multiple: true,
    directory: false,
  });

  if (!result) {
    return null;
  }

  // open() returns string | string[] | null; normalize to string[]
  return Array.isArray(result) ? result : [result];
};

/**
 * Opens a native save dialog for exporting an attachment to disk.
 *
 * @param defaultFileName - The original filename to suggest as the default save name
 * @returns The chosen file path, or null if the user cancelled
 */
export const pickExportPath = async (
  defaultFileName: string
): Promise<string | null> => {
  const result = await save({
    title: "Save Attachment",
    defaultPath: defaultFileName,
  });

  return result ?? null;
};

// ============================================================================
// File Metadata
// ============================================================================

/**
 * Returns file metadata (name + size) for a list of filesystem paths.
 * Uses filesystem `stat()` on the backend — does NOT read file contents.
 * Used for file size validation before uploading.
 *
 * @param paths - Array of absolute file paths to stat
 * @returns Array of file metadata objects
 * @throws Error if any file path cannot be read
 */
export const getFileSizes = async (
  paths: string[]
): Promise<FileMetaInfo[]> => {
  return await invoke<FileMetaInfo[]>("get_file_sizes", { paths });
};

// ============================================================================
// Attachment CRUD Operations
// ============================================================================

/**
 * Adds a file attachment to a line item by reading it from the filesystem.
 * The file is stored as an encrypted BLOB in the database.
 * Returns the created attachment metadata (without full file data).
 *
 * @param lineItemId - The line_item_id to attach the file to
 * @param filePath - Absolute path to the file on the filesystem
 * @returns The created attachment metadata
 * @throws Error if the file cannot be read, line item not found, or no database is open
 */
export const addAttachment = async (
  lineItemId: number,
  filePath: string
): Promise<AttachmentMeta> => {
  return await invoke<AttachmentMeta>("add_attachment", {
    lineItemId,
    filePath,
  });
};

/**
 * Lists attachment metadata for a line item (without full file data).
 * Returns non-deleted attachments ordered by `created_at ASC`.
 *
 * @param lineItemId - The line_item_id to list attachments for
 * @returns Array of attachment metadata
 * @throws Error if no database is open
 */
export const listAttachments = async (
  lineItemId: number
): Promise<AttachmentMeta[]> => {
  return await invoke<AttachmentMeta[]>("list_attachments", {
    lineItemId,
  });
};

/**
 * Returns attachment summaries (count + first thumbnail + first MIME type)
 * for multiple line items in a single efficient batch query.
 * Used for rendering attachment indicators on transaction rows.
 *
 * Line items with zero attachments are omitted from the result —
 * treat a missing key as { count: 0, first_thumbnail: null, first_mime_type: null }.
 *
 * @param lineItemIds - Array of line_item_ids to get summaries for
 * @returns Mapping of stringified line_item_id to AttachmentSummary
 * @throws Error if no database is open
 */
export const getAttachmentSummaries = async (
  lineItemIds: number[]
): Promise<Record<string, AttachmentSummary>> => {
  return await invoke<Record<string, AttachmentSummary>>(
    "get_attachment_summaries",
    { lineItemIds }
  );
};

/**
 * Returns attachment counts for multiple line items in a single batch query.
 * Used for efficient badge rendering on the transaction list.
 *
 * Line items with zero attachments are omitted from the result —
 * treat a missing key as count 0.
 *
 * @param lineItemIds - Array of line_item_ids to get counts for
 * @returns Mapping of stringified line_item_id to attachment count
 * @throws Error if no database is open
 */
export const getAttachmentCounts = async (
  lineItemIds: number[]
): Promise<AttachmentCounts> => {
  return await invoke<AttachmentCounts>("get_attachment_counts", {
    lineItemIds,
  });
};

/**
 * Soft-deletes an attachment by setting its `deleted_at` timestamp.
 *
 * @param attachmentId - The attachment_id to delete
 * @throws Error if attachment not found, already deleted, or no database is open
 */
export const deleteAttachment = async (
  attachmentId: number
): Promise<void> => {
  return await invoke<void>("delete_attachment", { attachmentId });
};

/**
 * Exports an attachment by reading the full BLOB from the database
 * and writing it to the specified filesystem path.
 *
 * @param attachmentId - The attachment_id to export
 * @param savePath - Absolute path to write the file to
 * @throws Error if attachment not found, already deleted, file write fails, or no database is open
 */
export const exportAttachment = async (
  attachmentId: number,
  savePath: string
): Promise<void> => {
  return await invoke<void>("export_attachment", { attachmentId, savePath });
};

/**
 * Returns the full file data for an attachment as a base64 data URL.
 * Used by the lightbox to display full-resolution images.
 *
 * @param attachmentId - The attachment_id to load
 * @returns A base64 data URL string like `"data:image/jpeg;base64,/9j/..."`
 * @throws Error if attachment not found, already deleted, or no database is open
 */
export const getAttachmentData = async (
  attachmentId: number
): Promise<string> => {
  return await invoke<string>("get_attachment_data", { attachmentId });
};
