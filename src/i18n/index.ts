import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import en from "./en.json";
import de from "./de.json";
import hu from "./hu.json";

/** Supported language codes. */
export type SupportedLanguage = "en" | "de" | "hu";

/** All supported languages with their display labels. */
export const SUPPORTED_LANGUAGES: ReadonlyArray<{
  code: SupportedLanguage;
  label: string;
}> = [
  { code: "en", label: "English" },
  { code: "de", label: "Deutsch" },
  { code: "hu", label: "Magyar" },
] as const;

const STORAGE_KEY = "expenses-manager-language";

/** Read persisted language from localStorage (pre-DB-open). */
const getStoredLanguage = (): SupportedLanguage => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "en" || stored === "de" || stored === "hu") return stored;
  } catch {
    // localStorage not available — fall through to default
  }
  return "en";
};

/** Persist the selected language to localStorage. */
export const persistLanguage = (lang: SupportedLanguage): void => {
  try {
    localStorage.setItem(STORAGE_KEY, lang);
  } catch {
    // localStorage not available — silent fail
  }
};

i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    de: { translation: de },
    hu: { translation: hu },
  },
  lng: getStoredLanguage(),
  fallbackLng: "en",
  interpolation: {
    escapeValue: false, // React already escapes
  },
});

export default i18n;
