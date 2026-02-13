import { useState, useEffect, useCallback, useRef } from "react";
import { useTranslation } from "react-i18next";

import { openPath } from "@tauri-apps/plugin-opener";
import { tempDir } from "@tauri-apps/api/path";

import {
  listAttachments,
  deleteAttachment,
  exportAttachment,
  pickExportPath,
} from "../../../services/attachmentService";
import { useAttachmentUpload } from "../../../hooks/useAttachmentUpload";
import FileSizeWarningDialog from "../../common/FileSizeWarningDialog";
import { formatFileSize } from "../../../utils/formatFileSize";
import type { AttachmentMeta } from "../../../types/attachment.types";

// ============================================================================
// Types
// ============================================================================

/** Bounding rectangle of the trigger element, used for popover positioning. */
export interface AnchorRect {
  top: number;
  left: number;
  width: number;
  height: number;
}

interface AttachmentPopoverProps {
  /** Whether the popover is currently visible */
  isOpen: boolean;
  /** The line item these attachments belong to */
  lineItemId: number;
  /** Bounding rect of the trigger button for positioning */
  anchorRect: AnchorRect | null;
  /** Called to close the popover */
  onClose: () => void;
  /** Called when attachments change (add/delete) so the parent can refresh counts */
  onAttachmentsChanged: () => void;
  /** Optional: open the lightbox at a given index (for image "view" action) */
  onOpenLightbox?: (attachments: AttachmentMeta[], startIndex: number) => void;
}

// ============================================================================
// Helpers
// ============================================================================

/** Returns true if the MIME type represents a displayable image. */
const isImageMimeType = (mimeType: string): boolean => {
  return mimeType.startsWith("image/") && mimeType !== "image/svg+xml";
};

/** Popover dimensions for positioning calculations. */
const POPOVER_WIDTH = 320;
const POPOVER_MAX_HEIGHT = 400;
const POPOVER_GAP = 8;

/**
 * Computes fixed position for the popover relative to the anchor,
 * clamping to viewport edges so it never overflows off-screen.
 */
const computePosition = (
  anchor: AnchorRect
): { top: number; left: number } => {
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;

  // Default: below the anchor, left-aligned
  let top = anchor.top + anchor.height + POPOVER_GAP;
  let left = anchor.left;

  // If overflowing right edge, shift left
  if (left + POPOVER_WIDTH > viewportWidth - POPOVER_GAP) {
    left = viewportWidth - POPOVER_WIDTH - POPOVER_GAP;
  }

  // If overflowing left edge, clamp to gap
  if (left < POPOVER_GAP) {
    left = POPOVER_GAP;
  }

  // If overflowing bottom, position above the anchor
  if (top + POPOVER_MAX_HEIGHT > viewportHeight - POPOVER_GAP) {
    top = anchor.top - POPOVER_MAX_HEIGHT - POPOVER_GAP;
  }

  // If that also overflows top, just clamp to top
  if (top < POPOVER_GAP) {
    top = POPOVER_GAP;
  }

  return { top, left };
};

// ============================================================================
// SVG Icons
// ============================================================================

/** Eye/view icon for opening images in lightbox or files in system app. */
const ViewIcon = () => (
  <svg
    className="w-3.5 h-3.5"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
    aria-hidden="true"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z"
    />
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
    />
  </svg>
);

/** Download/export icon. */
const ExportIcon = () => (
  <svg
    className="w-3.5 h-3.5"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
    aria-hidden="true"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3"
    />
  </svg>
);

/** Trash/delete icon. */
const DeleteIcon = () => (
  <svg
    className="w-3.5 h-3.5"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
    aria-hidden="true"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
    />
  </svg>
);

/** Plus icon for "Add file" button. */
const PlusIcon = () => (
  <svg
    className="w-3.5 h-3.5"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
    aria-hidden="true"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M12 4.5v15m7.5-7.5h-15"
    />
  </svg>
);

/** Generic file/document icon for non-image attachments. */
const FileIcon = () => (
  <svg
    className="w-6 h-6 text-slate-400"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
    aria-hidden="true"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={1.5}
      d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
    />
  </svg>
);

/** Camera icon for empty state. */
const CameraIcon = () => (
  <svg
    className="w-10 h-10 text-slate-600"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
    aria-hidden="true"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={1.5}
      d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
    />
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={1.5}
      d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
    />
  </svg>
);

// ============================================================================
// Attachment Row
// ============================================================================

interface AttachmentRowProps {
  attachment: AttachmentMeta;
  isDeleting: boolean;
  onView: (attachment: AttachmentMeta) => void;
  onExport: (attachment: AttachmentMeta) => void;
  onDeleteRequest: (attachment: AttachmentMeta) => void;
  onDeleteConfirm: (attachment: AttachmentMeta) => void;
  onDeleteCancel: () => void;
  t: (key: string, options?: Record<string, unknown>) => string;
}

const AttachmentRow = ({
  attachment,
  isDeleting,
  onView,
  onExport,
  onDeleteRequest,
  onDeleteConfirm,
  onDeleteCancel,
  t,
}: AttachmentRowProps) => {
  const hasImageThumbnail =
    isImageMimeType(attachment.mime_type) && attachment.thumbnail;

  return (
    <div
      className={`flex items-center gap-3 px-3 py-2 transition-colors ${
        isDeleting ? "bg-red-900/20" : "hover:bg-slate-700/50"
      }`}
    >
      {/* Thumbnail or file icon */}
      <div className="flex-shrink-0 w-10 h-10 flex items-center justify-center rounded overflow-hidden bg-slate-700/50">
        {hasImageThumbnail ? (
          <img
            src={attachment.thumbnail!}
            alt=""
            className="w-10 h-10 object-cover rounded"
            aria-hidden="true"
          />
        ) : (
          <FileIcon />
        )}
      </div>

      {/* File info */}
      <div className="flex-1 min-w-0">
        <p
          className="text-xs text-slate-200 truncate"
          title={attachment.file_name}
        >
          {attachment.file_name}
        </p>
        <p className="text-[11px] text-slate-500">
          {formatFileSize(attachment.file_size)}
        </p>
      </div>

      {/* Actions */}
      {isDeleting ? (
        /* Inline delete confirmation — matches CategoryLedgerModal pattern */
        <div className="flex items-center gap-1 flex-shrink-0">
          <span className="text-[11px] text-red-400 mr-0.5">{t("attachments.deleteConfirm")}</span>
          <button
            type="button"
            onClick={() => onDeleteConfirm(attachment)}
            className="px-1.5 py-0.5 text-[11px] font-medium rounded bg-red-600 text-white hover:bg-red-500 transition-colors focus:outline-none focus:ring-2 focus:ring-red-500"
            aria-label={t("attachments.ariaConfirmDelete", { fileName: attachment.file_name })}
          >
            {t("common.yes")}
          </button>
          <button
            type="button"
            onClick={onDeleteCancel}
            className="px-1.5 py-0.5 text-[11px] font-medium rounded bg-slate-600 text-slate-300 hover:bg-slate-500 transition-colors focus:outline-none focus:ring-2 focus:ring-slate-500"
            aria-label={t("attachments.ariaCancelDelete")}
          >
            {t("common.no")}
          </button>
        </div>
      ) : (
        /* Normal action buttons */
        <div className="flex items-center gap-0.5 flex-shrink-0">
          {/* View / Open */}
          <button
            type="button"
            onClick={() => onView(attachment)}
            className="p-1 text-slate-500 hover:text-emerald-400 hover:bg-slate-600 rounded transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500"
            aria-label={t("attachments.ariaView", { fileName: attachment.file_name })}
            title={isImageMimeType(attachment.mime_type) ? t("attachments.viewInLightbox") : t("attachments.openInApp")}
            tabIndex={0}
          >
            <ViewIcon />
          </button>
          {/* Export / Save */}
          <button
            type="button"
            onClick={() => onExport(attachment)}
            className="p-1 text-slate-500 hover:text-emerald-400 hover:bg-slate-600 rounded transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500"
            aria-label={t("attachments.ariaExport", { fileName: attachment.file_name })}
            title={t("attachments.saveToDisk")}
            tabIndex={0}
          >
            <ExportIcon />
          </button>
          {/* Delete */}
          <button
            type="button"
            onClick={() => onDeleteRequest(attachment)}
            className="p-1 text-slate-500 hover:text-red-400 hover:bg-slate-600 rounded transition-colors focus:outline-none focus:ring-2 focus:ring-red-500"
            aria-label={t("attachments.ariaDelete", { fileName: attachment.file_name })}
            title={t("common.delete")}
            tabIndex={0}
          >
            <DeleteIcon />
          </button>
        </div>
      )}
    </div>
  );
};

// ============================================================================
// Loading Skeleton
// ============================================================================

const LoadingSkeleton = ({ label }: { label: string }) => (
  <div className="px-3 py-2 space-y-3" aria-label={label}>
    {[1, 2, 3].map((i) => (
      <div key={i} className="flex items-center gap-3 animate-pulse">
        <div className="w-10 h-10 bg-slate-700 rounded" />
        <div className="flex-1 space-y-1.5">
          <div className="h-3 bg-slate-700 rounded w-3/4" />
          <div className="h-2.5 bg-slate-700 rounded w-1/3" />
        </div>
      </div>
    ))}
  </div>
);

// ============================================================================
// Main Component
// ============================================================================

/**
 * Floating popover panel for managing attachments on a transaction row.
 *
 * Features:
 * - Lists all attachments with thumbnail/icon, filename, size
 * - Add files via Tauri native file picker (with file size warning)
 * - View images in lightbox, non-images in system default app
 * - Export/save attachments to disk
 * - Inline delete confirmation (Yes/No pattern matching CategoryLedgerModal)
 * - Loading skeleton, empty state
 * - Closes on outside click or Escape key
 * - Viewport-clamped positioning via anchorRect
 */
const AttachmentPopover = ({
  isOpen,
  lineItemId,
  anchorRect,
  onClose,
  onAttachmentsChanged,
  onOpenLightbox,
}: AttachmentPopoverProps) => {
  const { t } = useTranslation();
  const popoverRef = useRef<HTMLDivElement>(null);

  // ── Data state ──
  const [attachments, setAttachments] = useState<AttachmentMeta[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  // ── Upload hook ──
  const {
    isUploading,
    currentWarning,
    handlePickAndUpload,
    handleWarningConfirm,
    handleWarningCancel,
  } = useAttachmentUpload(lineItemId, () => {
    // After upload completes, refresh the list
    refreshAttachments();
    onAttachmentsChanged();
  });

  // ── Data loading ──
  const refreshAttachments = useCallback(async () => {
    try {
      const items = await listAttachments(lineItemId);
      setAttachments(items);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }, [lineItemId]);

  // Fetch on open
  useEffect(() => {
    if (!isOpen) return;
    setLoading(true);
    setDeletingId(null);
    refreshAttachments().finally(() => setLoading(false));
  }, [isOpen, refreshAttachments]);

  // Focus the popover on open
  useEffect(() => {
    if (isOpen) {
      popoverRef.current?.focus();
    }
  }, [isOpen]);

  // ── Close on outside click ──
  useEffect(() => {
    if (!isOpen) return;

    const handleMouseDown = (e: MouseEvent) => {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(e.target as Node)
      ) {
        onClose();
      }
    };

    // Delay adding listener to avoid closing immediately from the same click
    const timer = setTimeout(() => {
      document.addEventListener("mousedown", handleMouseDown);
    }, 0);

    return () => {
      clearTimeout(timer);
      document.removeEventListener("mousedown", handleMouseDown);
    };
  }, [isOpen, onClose]);

  // ── Close on Escape ──
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        if (deletingId !== null) {
          setDeletingId(null);
        } else {
          onClose();
        }
      }
    },
    [onClose, deletingId]
  );

  // ── Action handlers ──

  const handleView = useCallback(
    async (attachment: AttachmentMeta) => {
      if (isImageMimeType(attachment.mime_type)) {
        // Open in lightbox
        if (onOpenLightbox) {
          const idx = attachments.findIndex(
            (a) => a.attachment_id === attachment.attachment_id
          );
          onOpenLightbox(attachments, idx >= 0 ? idx : 0);
        }
      } else {
        // Open non-image in system default app
        try {
          const tmpDir = await tempDir();
          const tmpPath = `${tmpDir}${attachment.file_name}`;
          await exportAttachment(attachment.attachment_id, tmpPath);
          await openPath(tmpPath);
        } catch (err) {
          console.error("Failed to open file externally:", err);
        }
      }
    },
    [attachments, onOpenLightbox]
  );

  const handleExport = useCallback(async (attachment: AttachmentMeta) => {
    try {
      const savePath = await pickExportPath(attachment.file_name);
      if (!savePath) return;
      await exportAttachment(attachment.attachment_id, savePath);
    } catch (err) {
      console.error("Failed to export attachment:", err);
    }
  }, []);

  const handleDeleteRequest = useCallback((attachment: AttachmentMeta) => {
    setDeletingId(attachment.attachment_id);
  }, []);

  const handleDeleteConfirm = useCallback(
    async (attachment: AttachmentMeta) => {
      try {
        await deleteAttachment(attachment.attachment_id);
        setDeletingId(null);
        await refreshAttachments();
        onAttachmentsChanged();
      } catch (err) {
        console.error("Failed to delete attachment:", err);
      }
    },
    [refreshAttachments, onAttachmentsChanged]
  );

  const handleDeleteCancel = useCallback(() => {
    setDeletingId(null);
  }, []);

  // ── Early return if not open ──
  if (!isOpen || !anchorRect) return null;

  const position = computePosition(anchorRect);

  return (
    <>
      <div
        ref={popoverRef}
        role="dialog"
        aria-modal="false"
        aria-label={t("attachments.ariaAttachCount", { count: attachments.length })}
        tabIndex={-1}
        onKeyDown={handleKeyDown}
        className="fixed z-50 flex flex-col bg-slate-800 border border-slate-700 rounded-lg shadow-xl focus:outline-none"
        style={{
          top: position.top,
          left: position.left,
          width: POPOVER_WIDTH,
          maxHeight: POPOVER_MAX_HEIGHT,
        }}
      >
        {/* ── Header ── */}
        <div className="flex items-center justify-between px-3 py-2.5 border-b border-slate-700">
          <h3 className="text-sm font-semibold text-slate-200">
            {t("attachments.title")}{" "}
            {!loading && (
              <span className="text-slate-500 font-normal">
                ({attachments.length})
              </span>
            )}
          </h3>
          <button
            type="button"
            onClick={handlePickAndUpload}
            disabled={isUploading}
            className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-white bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500"
            aria-label={t("attachments.add")}
            tabIndex={0}
          >
            <PlusIcon />
            {isUploading ? t("attachments.adding") : t("attachments.add")}
          </button>
        </div>

        {/* ── Body ── */}
        <div className="flex-1 overflow-y-auto">
          {/* Loading state */}
          {loading && <LoadingSkeleton label={t("attachments.loading")} />}

          {/* Error state */}
          {!loading && error && (
            <div className="px-3 py-6 text-center">
              <p className="text-xs text-red-400">{error}</p>
            </div>
          )}

          {/* Empty state */}
          {!loading && !error && attachments.length === 0 && (
            <div className="flex flex-col items-center justify-center px-3 py-8 text-center">
              <CameraIcon />
              <p className="text-sm text-slate-500 mt-3">{t("attachments.empty")}</p>
              <button
                type="button"
                onClick={handlePickAndUpload}
                disabled={isUploading}
                className="mt-3 flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500"
                aria-label={t("attachments.addFirstFile")}
                tabIndex={0}
              >
                <PlusIcon />
                {t("attachments.add")}
              </button>
            </div>
          )}

          {/* Attachment list */}
          {!loading && !error && attachments.length > 0 && (
            <div
              className="divide-y divide-slate-700/50"
              role="list"
              aria-label={t("attachments.list")}
            >
              {attachments.map((att) => (
                <AttachmentRow
                  key={att.attachment_id}
                  attachment={att}
                  isDeleting={deletingId === att.attachment_id}
                  onView={handleView}
                  onExport={handleExport}
                  onDeleteRequest={handleDeleteRequest}
                  onDeleteConfirm={handleDeleteConfirm}
                  onDeleteCancel={handleDeleteCancel}
                  t={t}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* File size warning dialog (from upload hook) */}
      <FileSizeWarningDialog
        isOpen={!!currentWarning}
        fileName={currentWarning?.file.file_name ?? ""}
        fileSize={currentWarning?.file.file_size ?? 0}
        onConfirm={handleWarningConfirm}
        onCancel={handleWarningCancel}
      />
    </>
  );
};

export default AttachmentPopover;
