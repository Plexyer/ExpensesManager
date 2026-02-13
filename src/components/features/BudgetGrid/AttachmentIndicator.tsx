import { useCallback } from "react";
import { useTranslation } from "react-i18next";

// ============================================================================
// Types
// ============================================================================

interface AttachmentIndicatorProps {
  /** The line item this indicator belongs to */
  lineItemId: number;
  /** Number of attachments on this line item (0 = no attachments) */
  attachmentCount: number;
  /** Base64 data URL of the first attachment's thumbnail, or null */
  firstThumbnail: string | null;
  /** MIME type of the first attachment, or null */
  firstMimeType: string | null;
  /** Called when the indicator is clicked (opens popover or lightbox) */
  onClick: (event: React.MouseEvent<HTMLElement>) => void;
}

// ============================================================================
// Helpers
// ============================================================================

/** Returns true if the MIME type represents an image. */
const isImageMimeType = (mimeType: string | null): boolean => {
  if (!mimeType) return false;
  return mimeType.startsWith("image/");
};

// ============================================================================
// Sub-components (SVG icons)
// ============================================================================

/** Camera icon — shown when there are no attachments. */
const CameraIcon = () => (
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
      d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
    />
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
    />
  </svg>
);

/** Generic file/document icon — shown for non-image attachments. */
const FileIcon = () => (
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
      d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
    />
  </svg>
);

/** Emerald count badge — positioned top-right on the button. */
const CountBadge = ({ count }: { count: number }) => (
  <span
    className="absolute -top-1 -right-1 flex items-center justify-center w-4 h-4 bg-emerald-600 text-white text-[10px] font-bold rounded-full pointer-events-none"
    aria-hidden="true"
  >
    {count > 99 ? "99+" : count}
  </span>
);

// ============================================================================
// Main Component
// ============================================================================

/**
 * Compact attachment indicator for each transaction row.
 *
 * Visual states:
 * 1. No attachments (count === 0): Camera icon
 * 2. Image attachment(s) with thumbnail: Rounded thumbnail image
 * 3. Non-image attachment(s) or no thumbnail: File/document icon
 *
 * Shows an emerald count badge when count > 1.
 */
const AttachmentIndicator = ({
  lineItemId,
  attachmentCount,
  firstThumbnail,
  firstMimeType,
  onClick,
}: AttachmentIndicatorProps) => {
  const { t } = useTranslation();

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLElement>) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        // Synthesize a mouse event from the keyboard event target
        // so the parent can compute anchor rect for popover positioning
        onClick(e as unknown as React.MouseEvent<HTMLElement>);
      }
    },
    [onClick]
  );

  // Determine which visual state to render
  const hasAttachments = attachmentCount > 0;
  const hasImageThumbnail =
    hasAttachments && firstThumbnail && isImageMimeType(firstMimeType);
  const showBadge = attachmentCount > 1;

  // Build aria-label
  const ariaLabel = hasAttachments
    ? t("attachments.ariaViewCount", { count: attachmentCount })
    : t("attachments.ariaAttach");

  // ── No attachments: camera icon ──
  if (!hasAttachments) {
    return (
      <button
        type="button"
        onClick={onClick}
        onKeyDown={handleKeyDown}
        className="relative p-1 text-slate-500 hover:text-emerald-400 hover:bg-slate-700 rounded transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500"
        aria-label={ariaLabel}
        title={ariaLabel}
        tabIndex={0}
        data-line-item-id={lineItemId}
      >
        <CameraIcon />
      </button>
    );
  }

  // ── Has image attachment with thumbnail ──
  if (hasImageThumbnail) {
    return (
      <button
        type="button"
        onClick={onClick}
        onKeyDown={handleKeyDown}
        className="relative p-0.5 rounded hover:ring-2 hover:ring-emerald-500 transition-all focus:outline-none focus:ring-2 focus:ring-emerald-500"
        aria-label={ariaLabel}
        title={ariaLabel}
        tabIndex={0}
        data-line-item-id={lineItemId}
      >
        <img
          src={firstThumbnail}
          alt=""
          className="w-5 h-5 rounded object-cover"
          aria-hidden="true"
        />
        {showBadge && <CountBadge count={attachmentCount} />}
      </button>
    );
  }

  // ── Has non-image attachment(s) or no thumbnail yet ──
  return (
    <button
      type="button"
      onClick={onClick}
      onKeyDown={handleKeyDown}
      className="relative p-1 text-slate-400 hover:text-emerald-400 hover:bg-slate-700 rounded transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500"
      aria-label={ariaLabel}
      title={ariaLabel}
      tabIndex={0}
      data-line-item-id={lineItemId}
    >
      <FileIcon />
      {showBadge && <CountBadge count={attachmentCount} />}
    </button>
  );
};

export default AttachmentIndicator;
