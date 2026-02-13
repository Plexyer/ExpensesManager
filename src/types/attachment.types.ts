/**
 * Type definitions for line item file attachments (receipts, PDFs, documents).
 */

/**
 * Metadata for a file attachment on a line item (without the full file data).
 * Matches the Rust `AttachmentMeta` struct returned by attachment commands.
 *
 * The `thumbnail` field will be a base64 data URL string once TASK-11.3
 * implements thumbnail generation. Until then it is always `null`.
 */
export interface AttachmentMeta {
  /** Primary key of the attachment */
  attachment_id: number;
  /** Foreign key to `category_line_items` */
  line_item_id: number;
  /** Original filename, e.g. "receipt.jpg" */
  file_name: string;
  /** MIME type, e.g. "image/jpeg", "application/pdf" */
  mime_type: string;
  /** File size in bytes */
  file_size: number;
  /** Base64 data URL for thumbnail preview, or null for non-image files */
  thumbnail: string | null;
  /** ISO 8601 datetime string when the attachment was created */
  created_at: string;
}

/**
 * Lightweight file metadata returned by `get_file_sizes`.
 * Used for file size validation before uploading attachments.
 * Matches the Rust `FileMetaInfo` struct.
 */
export interface FileMetaInfo {
  /** Absolute path to the file on the filesystem */
  path: string;
  /** Original filename, e.g. "receipt.jpg" */
  file_name: string;
  /** File size in bytes */
  file_size: number;
}

/**
 * Summary of attachments for a single line item.
 * Includes count + first attachment's thumbnail and MIME type.
 * Returned by `get_attachment_summaries`.
 */
export interface AttachmentSummary {
  /** Number of non-deleted attachments */
  count: number;
  /** Base64 data URL for the first attachment's thumbnail, or null */
  first_thumbnail: string | null;
  /** MIME type of the first attachment, or null */
  first_mime_type: string | null;
}

/**
 * Mapping of line_item_id to attachment count.
 * Returned by `get_attachment_counts`.
 *
 * Note: Rust `HashMap<i64, i64>` serializes with string keys in JSON,
 * so keys are stringified line_item_ids (e.g. `{ "1": 3, "2": 1 }`).
 * Use `counts[String(lineItemId)]` or `counts[lineItemId]` to access.
 */
export type AttachmentCounts = Record<string, number>;
