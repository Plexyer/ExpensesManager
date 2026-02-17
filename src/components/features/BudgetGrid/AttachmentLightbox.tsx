import { useState, useCallback, useEffect } from "react";
import { useTranslation } from "react-i18next";
import Lightbox, {
  useLightboxState,
  IconButton,
  createIcon,
} from "yet-another-react-lightbox";
import Zoom from "yet-another-react-lightbox/plugins/zoom";
import Thumbnails from "yet-another-react-lightbox/plugins/thumbnails";
import "yet-another-react-lightbox/styles.css";
import "yet-another-react-lightbox/plugins/thumbnails.css";

import { openPath } from "@tauri-apps/plugin-opener";
import { tempDir } from "@tauri-apps/api/path";

import {
  getAttachmentData,
  exportAttachment,
  pickExportPath,
} from "../../../services/attachmentService";
import { formatFileSize } from "../../../utils/formatFileSize";
import type { AttachmentMeta } from "../../../types/attachment.types";

// ============================================================================
// Types
// ============================================================================

interface AttachmentLightboxProps {
  /** Whether the lightbox is currently open */
  isOpen: boolean;
  /** Attachments to display */
  attachments: AttachmentMeta[];
  /** The initial slide index to show when opening */
  initialIndex?: number;
  /** Called when the lightbox should close */
  onClose: () => void;
}

// ============================================================================
// Custom slide type for non-image files
// ============================================================================

declare module "yet-another-react-lightbox" {
  interface SlideTypes {
    "non-image": NonImageSlide;
  }
  interface Labels {
    "Export file"?: string;
    "Open in system app"?: string;
  }
}

interface NonImageSlide {
  type: "non-image";
  /** Attachment metadata for this non-image file */
  attachment: AttachmentMeta;
}

// ============================================================================
// Helpers
// ============================================================================

/** Returns true if the MIME type represents an image the lightbox can display. */
const isImageMimeType = (mimeType: string): boolean => {
  return mimeType.startsWith("image/") && mimeType !== "image/svg+xml";
};

// ============================================================================
// Custom Toolbar Icons
// ============================================================================

const ExportIcon = createIcon(
  "ExportIcon",
  <path
    d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3"
    strokeLinecap="round"
    strokeLinejoin="round"
    strokeWidth={2}
    fill="none"
    stroke="currentColor"
  />
);

// ============================================================================
// Toolbar Buttons (must be children of Lightbox to use useLightboxState)
// ============================================================================

interface ToolbarButtonProps {
  attachments: AttachmentMeta[];
  onExport: (attachment: AttachmentMeta) => void;
}

const ExportButton = ({
  attachments,
  onExport,
}: Pick<ToolbarButtonProps, "attachments" | "onExport">) => {
  const { currentIndex } = useLightboxState();
  const attachment = attachments[currentIndex];

  return (
    <IconButton
      label="Export file"
      icon={ExportIcon}
      disabled={!attachment}
      onClick={() => attachment && onExport(attachment)}
    />
  );
};

// ============================================================================
// Non-Image Slide Renderer
// ============================================================================

interface NonImageSlideRendererProps {
  attachment: AttachmentMeta;
  onOpenExternal: (attachment: AttachmentMeta) => void;
  onExport: (attachment: AttachmentMeta) => void;
  t: (key: string, options?: Record<string, unknown>) => string;
}

const NonImageSlideRenderer = ({
  attachment,
  onOpenExternal,
  onExport,
  t,
}: NonImageSlideRendererProps) => {
  return (
    <div className="flex flex-col items-center justify-center gap-6 text-white select-none h-full">
      {/* Large file icon */}
      <svg
        className="w-24 h-24 text-slate-400"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1}
          d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
        />
      </svg>

      {/* File info */}
      <div className="text-center px-4">
        <p className="text-lg font-medium text-slate-200 break-all mb-1">
          {attachment.file_name}
        </p>
        <p className="text-sm text-slate-400">
          {attachment.mime_type} — {formatFileSize(attachment.file_size)}
        </p>
      </div>

      {/* Action buttons */}
      <div className="flex items-center gap-3 mt-2">
        <button
          type="button"
          onClick={() => onOpenExternal(attachment)}
          className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500"
          aria-label={t("attachments.ariaOpenInApp", { fileName: attachment.file_name })}
          tabIndex={0}
        >
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25"
            />
          </svg>
          {t("attachments.openInApp")}
        </button>
        <button
          type="button"
          onClick={() => onExport(attachment)}
          className="flex items-center gap-2 px-4 py-2.5 bg-slate-700 hover:bg-slate-600 text-white text-sm font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500"
          aria-label={t("attachments.ariaExport", { fileName: attachment.file_name })}
          tabIndex={0}
        >
          <svg
            className="w-4 h-4"
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
          {t("attachments.saveToDisk")}
        </button>
      </div>
    </div>
  );
};

// ============================================================================
// Slide Info Bar (filename + size — rendered as a fixed overlay)
// ============================================================================

interface SlideInfoBarProps {
  attachment: AttachmentMeta | undefined;
}

const SlideInfoBar = ({ attachment }: SlideInfoBarProps) => {
  if (!attachment) return null;

  return (
    <div className="fixed top-0 left-0 right-0 flex items-center justify-center pt-2 pointer-events-none z-[2000]">
      <div className="px-4 py-1.5 bg-black/60 rounded-b-lg text-center">
        <span className="text-sm text-slate-200 font-medium break-all">
          {attachment.file_name}
        </span>
        <span className="text-xs text-slate-400 ml-2">
          ({formatFileSize(attachment.file_size)})
        </span>
      </div>
    </div>
  );
};

// ============================================================================
// Main Component
// ============================================================================

/**
 * Full-screen lightbox/gallery for browsing transaction attachments.
 *
 * Features:
 * - Full-resolution image display with zoom (via `yet-another-react-lightbox`)
 * - Keyboard/arrow navigation between attachments
 * - Thumbnail strip at the bottom
 * - Toolbar: export/save, close
 * - Non-image files: large file icon with "Open in system app" and "Save to disk" buttons
 */
const AttachmentLightbox = ({
  isOpen,
  attachments,
  initialIndex = 0,
  onClose,
}: AttachmentLightboxProps) => {
  const { t } = useTranslation();
  const [index, setIndex] = useState(initialIndex);
  const [loadedDataUrls, setLoadedDataUrls] = useState<
    Record<number, string>
  >({});

  // Reset index when attachments or initialIndex changes
  useEffect(() => {
    setIndex(initialIndex);
  }, [initialIndex]);

  // Clear loaded data URLs when attachments change
  useEffect(() => {
    setLoadedDataUrls({});
  }, [attachments]);

  // ── Load full-resolution data for current image slide ──
  useEffect(() => {
    if (!isOpen || attachments.length === 0) return;

    const attachment = attachments[index];
    if (!attachment) return;
    if (!isImageMimeType(attachment.mime_type)) return;
    if (loadedDataUrls[attachment.attachment_id]) return;

    let cancelled = false;

    const loadData = async () => {
      try {
        const dataUrl = await getAttachmentData(attachment.attachment_id);
        if (!cancelled) {
          setLoadedDataUrls((prev) => ({
            ...prev,
            [attachment.attachment_id]: dataUrl,
          }));
        }
      } catch (err) {
        console.error(
          `Failed to load attachment data for ${attachment.attachment_id}:`,
          err
        );
      }
    };

    loadData();
    return () => {
      cancelled = true;
    };
  }, [isOpen, index, attachments, loadedDataUrls]);

  // ── Build slides array ──
  const slides = attachments.map((att) => {
    if (isImageMimeType(att.mime_type)) {
      // Use full-resolution data URL if loaded, otherwise fall back to thumbnail
      const src =
        loadedDataUrls[att.attachment_id] || att.thumbnail || "";
      return { src };
    }
    // Non-image: custom slide type
    return { type: "non-image" as const, attachment: att };
  });

  // ── Handlers ──

  const handleExport = useCallback(async (attachment: AttachmentMeta) => {
    try {
      const savePath = await pickExportPath(attachment.file_name);
      if (!savePath) return;
      await exportAttachment(attachment.attachment_id, savePath);
    } catch (err) {
      console.error("Failed to export attachment:", err);
    }
  }, []);

  const handleOpenExternal = useCallback(
    async (attachment: AttachmentMeta) => {
      try {
        // Export to temp directory, then open with system app
        const tmpDir = await tempDir();
        const tmpPath = `${tmpDir}${attachment.file_name}`;
        await exportAttachment(attachment.attachment_id, tmpPath);
        await openPath(tmpPath);
      } catch (err) {
        console.error("Failed to open file externally:", err);
      }
    },
    []
  );

  if (!isOpen) return null;

  return (
    <>
      <Lightbox
        open={isOpen}
        close={onClose}
        index={index}
        slides={slides}
        plugins={[Zoom, Thumbnails]}
        on={{
          view: ({ index: currentIndex }) => setIndex(currentIndex),
        }}
        zoom={{
          maxZoomPixelRatio: 5,
          scrollToZoom: true,
        }}
        thumbnails={{
          position: "bottom",
          width: 80,
          height: 60,
          gap: 8,
          padding: 4,
          border: 2,
          borderColor: "rgba(16, 185, 129, 0.6)",
          borderRadius: 4,
          showToggle: true,
        }}
        carousel={{
          finite: attachments.length <= 1,
        }}
        toolbar={{
          buttons: [
            <ExportButton
              key="export-btn"
              attachments={attachments}
              onExport={handleExport}
            />,
            "close",
          ],
        }}
        render={{
          slide: ({ slide }) => {
            if (slide.type === "non-image") {
              const nonImageSlide = slide as NonImageSlide;
              return (
                <NonImageSlideRenderer
                  attachment={nonImageSlide.attachment}
                  onOpenExternal={handleOpenExternal}
                  onExport={handleExport}
                  t={t}
                />
              );
            }
            return undefined;
          },
          thumbnail: ({ slide }) => {
            if (slide.type === "non-image") {
              const nonImageSlide = slide as NonImageSlide;
              return (
                <div
                  className="flex flex-col items-center justify-center w-full h-full bg-slate-700 text-slate-300"
                  title={nonImageSlide.attachment.file_name}
                >
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
                    />
                  </svg>
                  <span className="text-[8px] mt-0.5 max-w-full truncate px-1">
                    {nonImageSlide.attachment.file_name
                      .split(".")
                      .pop()
                      ?.toUpperCase() ?? "FILE"}
                  </span>
                </div>
              );
            }
            return undefined;
          },
        }}
        labels={{
          "Export file": t("attachments.exportFile"),
          "Open in system app": t("attachments.openInApp"),
        }}
        styles={{
          container: { backgroundColor: "rgba(15, 23, 42, 0.97)" },
        }}
      />

      {/* Slide info bar (filename + size) */}
      {isOpen && <SlideInfoBar attachment={attachments[index]} />}
    </>
  );
};

export default AttachmentLightbox;
