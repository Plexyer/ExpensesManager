import { useState, useCallback } from "react";
import {
  pickAttachmentFiles,
  getFileSizes,
  addAttachment,
} from "../services/attachmentService";
import { FILE_SIZE_SOFT_LIMIT } from "../utils/formatFileSize";
import type { AttachmentMeta, FileMetaInfo } from "../types/attachment.types";

// ============================================================================
// Types
// ============================================================================

/** Result returned after the full upload flow completes. */
export interface AttachmentUploadResult {
  /** Successfully uploaded attachments */
  uploaded: AttachmentMeta[];
  /** Files that were skipped (user cancelled the size warning) */
  skipped: string[];
  /** Files that failed to upload (backend error) */
  errors: Array<{ fileName: string; error: string }>;
}

/** State exposed by the hook for the warning dialog. */
export interface FileSizeWarning {
  /** The file metadata that triggered the warning */
  file: FileMetaInfo;
  /** Resolve the warning: true = upload anyway, false = skip */
  resolve: (shouldUpload: boolean) => void;
}

// ============================================================================
// Hook
// ============================================================================

/**
 * Hook that orchestrates the full attachment upload flow:
 * 1. Opens native file picker (multi-select)
 * 2. Gets file sizes via Rust backend (lightweight stat, no file read)
 * 3. For files > 25MB: yields a warning prompt to the consumer
 * 4. Uploads approved files via `addAttachment`
 * 5. Returns results (uploaded, skipped, errors)
 *
 * The consumer renders a `FileSizeWarningDialog` driven by `currentWarning`.
 *
 * @param lineItemId - The line item to attach files to
 * @param onComplete - Callback fired after all files are processed
 */
export const useAttachmentUpload = (
  lineItemId: number,
  onComplete?: (result: AttachmentUploadResult) => void
) => {
  const [isUploading, setIsUploading] = useState(false);
  const [currentWarning, setCurrentWarning] = useState<FileSizeWarning | null>(
    null
  );

  /**
   * Prompts the user about a large file. Returns a promise that resolves
   * to `true` (upload) or `false` (skip) based on user interaction.
   */
  const promptLargeFile = useCallback(
    (file: FileMetaInfo): Promise<boolean> => {
      return new Promise<boolean>((resolve) => {
        setCurrentWarning({
          file,
          resolve: (shouldUpload: boolean) => {
            setCurrentWarning(null);
            resolve(shouldUpload);
          },
        });
      });
    },
    []
  );

  /**
   * Starts the full upload flow: pick files -> validate sizes -> warn -> upload.
   * Each large file is prompted individually and sequentially.
   */
  const handlePickAndUpload = useCallback(async () => {
    // 1. Open file picker
    const paths = await pickAttachmentFiles();
    if (!paths || paths.length === 0) return;

    setIsUploading(true);

    const result: AttachmentUploadResult = {
      uploaded: [],
      skipped: [],
      errors: [],
    };

    try {
      // 2. Get file sizes (lightweight stat, no content read)
      const fileMetas = await getFileSizes(paths);

      // 3. Process each file: check size, warn if needed, upload
      for (const fileMeta of fileMetas) {
        // Check against soft limit
        if (fileMeta.file_size > FILE_SIZE_SOFT_LIMIT) {
          const shouldUpload = await promptLargeFile(fileMeta);
          if (!shouldUpload) {
            result.skipped.push(fileMeta.file_name);
            continue;
          }
        }

        // 4. Upload the file
        try {
          const attachment = await addAttachment(lineItemId, fileMeta.path);
          result.uploaded.push(attachment);
        } catch (err) {
          result.errors.push({
            fileName: fileMeta.file_name,
            error: err instanceof Error ? err.message : String(err),
          });
        }
      }
    } catch (err) {
      // Fatal error (e.g., getFileSizes failed)
      result.errors.push({
        fileName: "(file metadata)",
        error: err instanceof Error ? err.message : String(err),
      });
    } finally {
      setIsUploading(false);
      onComplete?.(result);
    }

    return result;
  }, [lineItemId, onComplete, promptLargeFile]);

  /** Handles the user confirming the warning dialog ("Upload Anyway"). */
  const handleWarningConfirm = useCallback(() => {
    currentWarning?.resolve(true);
  }, [currentWarning]);

  /** Handles the user cancelling the warning dialog ("Cancel"). */
  const handleWarningCancel = useCallback(() => {
    currentWarning?.resolve(false);
  }, [currentWarning]);

  return {
    /** Whether files are currently being uploaded */
    isUploading,
    /** Current file size warning to display (null if none) */
    currentWarning,
    /** Starts the pick -> validate -> upload flow */
    handlePickAndUpload,
    /** Confirm handler for the warning dialog */
    handleWarningConfirm,
    /** Cancel handler for the warning dialog */
    handleWarningCancel,
  };
};
