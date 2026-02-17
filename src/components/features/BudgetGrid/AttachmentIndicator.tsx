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

/** Plus icon — shown when there are no attachments. */
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
 * 1. No attachments (count === 0): Plus icon
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

  // ── No attachments: plus icon ──
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
        <PlusIcon />
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
