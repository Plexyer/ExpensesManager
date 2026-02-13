import { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { getUiSetting, setUiSetting } from "../../../services/settingsService";

type AttachmentViewMode = "popover" | "lightbox";

const SETTING_KEY = "attachment_view_mode";
const DEFAULT_MODE: AttachmentViewMode = "popover";

const AttachmentViewSettings = () => {
  const { t } = useTranslation();
  const [viewMode, setViewMode] = useState<AttachmentViewMode>(DEFAULT_MODE);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadSetting = async () => {
      try {
        const stored = await getUiSetting(SETTING_KEY);
        if (stored === "popover" || stored === "lightbox") {
          setViewMode(stored);
        }
      } catch {
        // Fall back to default silently
      } finally {
        setIsLoading(false);
      }
    };
    loadSetting();
  }, []);

  const handleSelectMode = useCallback(
    async (mode: AttachmentViewMode) => {
      if (mode === viewMode) return;
      setViewMode(mode);
      try {
        await setUiSetting(SETTING_KEY, mode);
      } catch {
        // Revert on failure
        setViewMode(viewMode);
      }
    },
    [viewMode]
  );

  if (isLoading) {
    return (
      <section
        aria-labelledby="attachment-view-settings-heading"
        className="bg-slate-800/50 border border-slate-700 rounded-xl p-6"
      >
        <div className="h-6 w-40 bg-slate-700/50 rounded animate-pulse" />
        <div className="mt-4 space-y-3">
          <div className="h-16 bg-slate-700/30 rounded-lg animate-pulse" />
          <div className="h-16 bg-slate-700/30 rounded-lg animate-pulse" />
        </div>
      </section>
    );
  }

  return (
    <section
      aria-labelledby="attachment-view-settings-heading"
      className="bg-slate-800/50 border border-slate-700 rounded-xl p-6"
    >
      <h2
        id="attachment-view-settings-heading"
        className="text-lg font-medium text-white mb-1"
      >
        {t("settings.attachments")}
      </h2>
      <p className="text-xs text-slate-400 mb-4">
        {t("settings.attachmentsDesc")}
      </p>

      <fieldset>
        <legend className="sr-only">{t("settings.attachmentViewMode")}</legend>
        <div className="space-y-3">
          {/* Popover option */}
          <label
            className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
              viewMode === "popover"
                ? "border-emerald-500/60 bg-emerald-500/10"
                : "border-slate-600/50 bg-slate-700/20 hover:border-slate-500/60"
            }`}
          >
            <input
              type="radio"
              name="attachment-view-mode"
              value="popover"
              checked={viewMode === "popover"}
              onChange={() => handleSelectMode("popover")}
              className="mt-0.5 h-4 w-4 shrink-0 accent-emerald-500 cursor-pointer"
              aria-label={t("settings.attachmentPopover")}
            />
            <div className="min-w-0">
              <span
                className={`text-sm font-medium ${
                  viewMode === "popover" ? "text-emerald-300" : "text-white"
                }`}
              >
                {t("settings.attachmentPopover")}
              </span>
              <p className="text-xs text-slate-400 mt-0.5">
                {t("settings.attachmentPopoverDesc")}
              </p>
            </div>
          </label>

          {/* Lightbox option */}
          <label
            className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
              viewMode === "lightbox"
                ? "border-emerald-500/60 bg-emerald-500/10"
                : "border-slate-600/50 bg-slate-700/20 hover:border-slate-500/60"
            }`}
          >
            <input
              type="radio"
              name="attachment-view-mode"
              value="lightbox"
              checked={viewMode === "lightbox"}
              onChange={() => handleSelectMode("lightbox")}
              className="mt-0.5 h-4 w-4 shrink-0 accent-emerald-500 cursor-pointer"
              aria-label={t("settings.attachmentLightbox")}
            />
            <div className="min-w-0">
              <span
                className={`text-sm font-medium ${
                  viewMode === "lightbox" ? "text-emerald-300" : "text-white"
                }`}
              >
                {t("settings.attachmentLightbox")}
              </span>
              <p className="text-xs text-slate-400 mt-0.5">
                {t("settings.attachmentLightboxDesc")}
              </p>
            </div>
          </label>
        </div>
      </fieldset>
    </section>
  );
};

export default AttachmentViewSettings;
