import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { dashboardWidgetRegistry } from "../Dashboard/widgetRegistry";
import {
  loadDashboardWidgetIds,
  saveDashboardWidgetIds,
} from "../Dashboard/dashboardWidgetSettings";

const areWidgetIdsEqual = (left: string[], right: string[]): boolean =>
  left.length === right.length && left.every((id, index) => id === right[index]);

const moveItem = (items: string[], fromIndex: number, toIndex: number): string[] => {
  const reordered = [...items];
  const [movedItem] = reordered.splice(fromIndex, 1);
  reordered.splice(toIndex, 0, movedItem);
  return reordered;
};

const DashboardPreferencesSettings = () => {
  const { t } = useTranslation();
  const allWidgetIds = useMemo(
    () => dashboardWidgetRegistry.map((widget) => widget.id),
    []
  );
  const [activeWidgetIds, setActiveWidgetIds] = useState<string[]>(allWidgetIds);
  const [settingsError, setSettingsError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const loadSettings = async () => {
      try {
        const loadedIds = await loadDashboardWidgetIds(allWidgetIds);
        if (!cancelled) {
          setActiveWidgetIds((previousIds) =>
            areWidgetIdsEqual(previousIds, loadedIds) ? previousIds : loadedIds
          );
        }
      } catch {
        if (!cancelled) {
          setSettingsError(t("settings.dashboardPreferencesLoadError"));
        }
      }
    };

    void loadSettings();

    return () => {
      cancelled = true;
    };
  }, [allWidgetIds, t]);

  const persistWidgetIds = async (widgetIds: string[]) => {
    try {
      await saveDashboardWidgetIds(widgetIds);
    } catch {
      setSettingsError(t("settings.dashboardPreferencesSaveError"));
    }
  };

  const handleToggleWidget = (widgetId: string) => {
    const isActive = activeWidgetIds.includes(widgetId);
    let nextIds: string[];

    if (isActive) {
      nextIds = activeWidgetIds.filter((id) => id !== widgetId);
    } else {
      const activeSet = new Set([...activeWidgetIds, widgetId]);
      nextIds = allWidgetIds.filter((id) => activeSet.has(id));
    }

    setSettingsError(null);
    setActiveWidgetIds(nextIds);
    void persistWidgetIds(nextIds);
  };

  const handleReset = () => {
    setSettingsError(null);
    setActiveWidgetIds(allWidgetIds);
    void persistWidgetIds(allWidgetIds);
  };

  const handleMoveWidget = (widgetId: string, direction: "up" | "down") => {
    const sourceIndex = activeWidgetIds.indexOf(widgetId);
    if (sourceIndex === -1) {
      return;
    }

    const destinationIndex = direction === "up" ? sourceIndex - 1 : sourceIndex + 1;
    if (destinationIndex < 0 || destinationIndex >= activeWidgetIds.length) {
      return;
    }

    const nextIds = moveItem(activeWidgetIds, sourceIndex, destinationIndex);
    setSettingsError(null);
    setActiveWidgetIds(nextIds);
    void persistWidgetIds(nextIds);
  };

  return (
    <section
      aria-labelledby="dashboard-preferences-heading"
      className="rounded-xl border border-slate-700 bg-slate-800/50 p-6"
    >
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 id="dashboard-preferences-heading" className="text-lg font-medium text-white">
            {t("settings.dashboardPreferences")}
          </h2>
          <p className="mt-1 text-sm text-slate-400">
            {t("settings.dashboardPreferencesDesc")}
          </p>
        </div>
        <button
          type="button"
          onClick={handleReset}
          className="rounded-md border border-slate-600 px-3 py-1.5 text-xs font-medium text-slate-200 hover:bg-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
        >
          {t("settings.dashboardPreferencesReset")}
        </button>
      </div>

      {settingsError && (
        <p className="mb-3 text-xs text-amber-300" role="alert">
          {settingsError}
        </p>
      )}

      <ul className="space-y-2" aria-label={t("settings.dashboardPreferencesListLabel")}>
        {dashboardWidgetRegistry.map((widget) => {
          const isActive = activeWidgetIds.includes(widget.id);
          const activeIndex = activeWidgetIds.indexOf(widget.id);
          const canMoveUp = isActive && activeIndex > 0;
          const canMoveDown = isActive && activeIndex < activeWidgetIds.length - 1;

          return (
            <li
              key={widget.id}
              className="rounded-lg border border-slate-700/80 bg-slate-900/30 p-3"
            >
              <div className="mb-2 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-slate-100">
                    {t(widget.titleKey)}
                  </p>
                  {widget.descriptionKey && (
                    <p className="mt-0.5 text-xs text-slate-400">{t(widget.descriptionKey)}</p>
                  )}
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={isActive}
                  aria-label={t("settings.dashboardWidgetVisibilityToggleLabel", {
                    widget: t(widget.titleKey),
                  })}
                  onClick={() => handleToggleWidget(widget.id)}
                  className={`relative inline-flex h-6 w-11 shrink-0 rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900 ${
                    isActive ? "bg-emerald-600" : "bg-slate-600"
                  }`}
                >
                  <span
                    aria-hidden="true"
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
                      isActive ? "translate-x-5" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  className="rounded-md border border-slate-600 px-2 py-1 text-[11px] font-medium text-slate-300 hover:bg-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 disabled:opacity-60"
                  onClick={() => handleMoveWidget(widget.id, "up")}
                  disabled={!canMoveUp}
                >
                  {t("settings.dashboardMoveUp")}
                </button>
                <button
                  type="button"
                  className="rounded-md border border-slate-600 px-2 py-1 text-[11px] font-medium text-slate-300 hover:bg-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 disabled:opacity-60"
                  onClick={() => handleMoveWidget(widget.id, "down")}
                  disabled={!canMoveDown}
                >
                  {t("settings.dashboardMoveDown")}
                </button>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
};

export default DashboardPreferencesSettings;
