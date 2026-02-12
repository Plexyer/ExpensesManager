import { useTranslation } from "react-i18next";
import {
  SUPPORTED_LANGUAGES,
  persistLanguage,
  type SupportedLanguage,
} from "../../../i18n";

const LanguageSettings = () => {
  const { t, i18n } = useTranslation();

  const handleLanguageChange = (lang: SupportedLanguage) => {
    i18n.changeLanguage(lang);
    persistLanguage(lang);
  };

  return (
    <section
      aria-labelledby="language-settings-heading"
      className="bg-slate-800/50 border border-slate-700 rounded-xl p-6"
    >
      <h2
        id="language-settings-heading"
        className="text-lg font-medium text-white mb-1"
      >
        {t("settings.language")}
      </h2>
      <p className="text-sm text-slate-400 mb-4">
        {t("settings.languageDesc")}
      </p>

      <fieldset>
        <legend className="sr-only">{t("settings.language")}</legend>
        <div className="space-y-2">
          {SUPPORTED_LANGUAGES.map((lang) => {
            const isSelected = i18n.language === lang.code;
            return (
              <label
                key={lang.code}
                className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                  isSelected
                    ? "border-blue-500/50 bg-blue-500/10"
                    : "border-slate-600/50 hover:border-slate-500/50 hover:bg-slate-700/30"
                }`}
              >
                <input
                  type="radio"
                  name="language"
                  value={lang.code}
                  checked={isSelected}
                  onChange={() => handleLanguageChange(lang.code)}
                  className="w-4 h-4 text-blue-500 bg-slate-700 border-slate-500 focus:ring-blue-500 focus:ring-offset-0 focus:ring-2"
                />
                <span className="text-sm font-medium text-white">
                  {lang.label}
                </span>
              </label>
            );
          })}
        </div>
      </fieldset>
    </section>
  );
};

export default LanguageSettings;
