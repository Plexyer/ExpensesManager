import i18n from "../i18n";

/**
 * Format a number as currency using Intl.NumberFormat, locale-aware.
 * The locale is derived from the current i18n language.
 */
export const formatCurrency = (
  value: number,
  currencyCode: string
): string => {
  const locale = i18n.language === "de" ? "de-CH" : "en-US";
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: currencyCode,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
};
