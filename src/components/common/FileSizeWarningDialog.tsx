import { useCallback, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { formatFileSize } from "../../utils/formatFileSize";

// ============================================================================
// Types
// ============================================================================

interface FileSizeWarningDialogProps {
  /** Whether the dialog is currently visible */
  isOpen: boolean;
  /** Name of the file that exceeds the size limit */
  fileName: string;
  /** File size in bytes */
  fileSize: number;
  /** Called when the user chooses to upload anyway */
  onConfirm: () => void;
  /** Called when the user cancels the upload for this file */
  onCancel: () => void;
}

// ============================================================================
// Component
// ============================================================================

/**
 * Modal warning dialog shown when a selected file exceeds the 25 MB soft limit.
 * The user can choose to upload anyway (no hard limit) or cancel/skip this file.
 *
 * Matches the existing app dialog pattern (dark theme, slate background, emerald accents).
 * See PasswordCreationModal.tsx discard confirmation for reference.
 */
const FileSizeWarningDialog = ({
  isOpen,
  fileName,
  fileSize,
  onConfirm,
  onCancel,
}: FileSizeWarningDialogProps) => {
  const { t } = useTranslation();
  const dialogRef = useRef<HTMLDivElement>(null);

  // Focus trap: focus the dialog when it opens
  useEffect(() => {
    if (isOpen && dialogRef.current) {
      dialogRef.current.focus();
    }
  }, [isOpen]);

  // Close on Escape key
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onCancel();
      }
    },
    [onCancel]
  );

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80"
      onClick={onCancel}
      role="presentation"
    >
      <div
        ref={dialogRef}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="file-size-warning-title"
        aria-describedby="file-size-warning-desc"
        tabIndex={-1}
        onKeyDown={handleKeyDown}
        onClick={(e) => e.stopPropagation()}
        className="max-w-md mx-4 p-6 bg-slate-800 border border-slate-700 rounded-xl shadow-2xl focus:outline-none"
      >
        {/* Warning icon + Title */}
        <div className="flex items-start gap-3 mb-4">
          {/* Amber warning triangle SVG */}
          <div className="flex-shrink-0 mt-0.5">
            <svg
              className="w-6 h-6 text-amber-400"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z"
              />
            </svg>
          </div>
          <h3
            id="file-size-warning-title"
            className="text-lg font-semibold text-white"
          >
            {t("attachments.sizeWarningTitle")}
          </h3>
        </div>

        {/* Description */}
        <p id="file-size-warning-desc" className="text-sm text-slate-400 mb-2">
          {t("attachments.sizeWarningMessage", { fileName, fileSize: formatFileSize(fileSize) })}
        </p>
        <p className="text-sm text-slate-500 mb-6">
          {t("attachments.sizeWarningNote")}
        </p>

        {/* Action buttons */}
        <div className="flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            aria-label={t("attachments.ariaCancelUpload")}
            className="px-4 py-2 text-sm font-medium text-slate-300 hover:text-white hover:bg-slate-700 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            {t("common.cancel")}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            aria-label={t("attachments.ariaUploadAnyway")}
            className="px-4 py-2 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            {t("attachments.uploadAnyway")}
          </button>
        </div>
      </div>
    </div>
  );
};

export default FileSizeWarningDialog;
