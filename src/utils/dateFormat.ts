import i18n from "../i18n";

/** Get the locale string based on current i18n language. */
const getLocale = (): string => (i18n.language === "de" ? "de-CH" : "en-US");

/**
 * Format an ISO datetime string as a readable date.
 * E.g., "Jan 15, 2026" (en) or "15. Jan. 2026" (de).
 */
export const formatDate = (isoString: string): string => {
  try {
    const date = new Date(isoString);
    return date.toLocaleDateString(getLocale(), {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return isoString;
  }
};

/**
 * Format an ISO datetime string as a readable time (if not midnight).
 * Returns empty string for midnight times.
 */
export const formatTime = (isoString: string): string => {
  try {
    const date = new Date(isoString);
    const hours = date.getHours();
    const minutes = date.getMinutes();
    if (hours === 0 && minutes === 0) return "";
    return date.toLocaleTimeString(getLocale(), {
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
};
