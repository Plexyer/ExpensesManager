import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import DashboardWidgetCard from "./DashboardWidgetCard";
import { dashboardWidgetRegistry } from "./widgetRegistry";
import {
  loadDashboardWidgetIds,
  saveDashboardWidgetIds,
} from "./dashboardWidgetSettings";

const areWidgetIdsEqual = (left: string[], right: string[]): boolean =>
  left.length === right.length && left.every((id, index) => id === right[index]);

const DashboardShell = () => {
  const { t } = useTranslation();
  const allWidgetIds = useMemo(
    () => dashboardWidgetRegistry.map((widget) => widget.id),
    []
  );
  const [activeWidgetIds, setActiveWidgetIds] = useState<string[]>(allWidgetIds);
  const [selectedInactiveWidgetId, setSelectedInactiveWidgetId] = useState<string>("");
  const [settingsError, setSettingsError] = useState<string | null>(null);

  useEffect(() => {
    let isCancelled = false;

    const loadSettings = async () => {
      try {
        const loadedIds = await loadDashboardWidgetIds(allWidgetIds);
        if (!isCancelled) {
          setActiveWidgetIds((previousIds) =>
            areWidgetIdsEqual(previousIds, loadedIds) ? previousIds : loadedIds
          );
        }
      } catch {
        if (!isCancelled) {
          setSettingsError(t("dashboard.layoutLoadError"));
        }
      }
    };

    void loadSettings();

    return () => {
      isCancelled = true;
    };
  }, [allWidgetIds, t]);

  const activeWidgetSet = useMemo(
    () => new Set(activeWidgetIds),
    [activeWidgetIds]
  );
  const activeWidgets = useMemo(
    () => dashboardWidgetRegistry.filter((widget) => activeWidgetSet.has(widget.id)),
    [activeWidgetSet]
  );
  const inactiveWidgets = useMemo(
    () => dashboardWidgetRegistry.filter((widget) => !activeWidgetSet.has(widget.id)),
    [activeWidgetSet]
  );

  useEffect(() => {
    if (inactiveWidgets.length === 0) {
      setSelectedInactiveWidgetId("");
      return;
    }

    if (!inactiveWidgets.some((widget) => widget.id === selectedInactiveWidgetId)) {
      setSelectedInactiveWidgetId(inactiveWidgets[0].id);
    }
  }, [inactiveWidgets, selectedInactiveWidgetId]);

  const persistWidgetIds = async (widgetIds: string[]) => {
    try {
      await saveDashboardWidgetIds(widgetIds);
    } catch {
      setSettingsError(t("dashboard.layoutSaveError"));
    }
  };

  const handleAddWidget = () => {
    if (!selectedInactiveWidgetId) {
      return;
    }

    const nextIds = allWidgetIds.filter(
      (widgetId) => widgetId === selectedInactiveWidgetId || activeWidgetSet.has(widgetId)
    );

    setSettingsError(null);
    setActiveWidgetIds(nextIds);
    void persistWidgetIds(nextIds);
  };

  const handleRemoveWidget = (widgetId: string) => {
    const nextIds = activeWidgetIds.filter((id) => id !== widgetId);

    setSettingsError(null);
    setActiveWidgetIds(nextIds);
    void persistWidgetIds(nextIds);
  };

  const handleResetWidgets = () => {
    setSettingsError(null);
    setActiveWidgetIds(allWidgetIds);
    void persistWidgetIds(allWidgetIds);
  };

  return (
    <section
      className="mx-auto w-full max-w-6xl"
      aria-labelledby="dashboard-shell-title"
      aria-describedby="dashboard-shell-description"
    >
      <header className="mb-5">
        <h2 id="dashboard-shell-title" className="text-xl font-semibold text-white">
          {t("dashboard.title")}
        </h2>
        <p id="dashboard-shell-description" className="mt-1 text-sm text-slate-400">
          {t("dashboard.shellDescription", {
            defaultValue: "Widget-based dashboard foundation. Business widgets are added in upcoming tasks.",
          })}
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-2" aria-label={t("dashboard.layoutControls")}>
          <label htmlFor="dashboard-add-widget-select" className="text-xs text-slate-300">
            {t("dashboard.addWidgetLabel")}
          </label>
          <select
            id="dashboard-add-widget-select"
            className="rounded-md border border-slate-600 bg-slate-900 px-2 py-1 text-xs text-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 disabled:opacity-60"
            value={selectedInactiveWidgetId}
            onChange={(event) => setSelectedInactiveWidgetId(event.target.value)}
            disabled={inactiveWidgets.length === 0}
            aria-label={t("dashboard.addWidgetLabel")}
          >
            {inactiveWidgets.length === 0 ? (
              <option value="">{t("dashboard.noInactiveWidgets")}</option>
            ) : (
              inactiveWidgets.map((widget) => (
                <option key={widget.id} value={widget.id}>
                  {t(widget.titleKey)}
                </option>
              ))
            )}
          </select>

          <button
            type="button"
            className="rounded-md border border-slate-600 px-3 py-1 text-xs font-medium text-slate-200 hover:bg-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 disabled:opacity-60"
            onClick={handleAddWidget}
            disabled={!selectedInactiveWidgetId}
          >
            {t("dashboard.addWidgetAction")}
          </button>

          <button
            type="button"
            className="rounded-md border border-slate-600 px-3 py-1 text-xs font-medium text-slate-200 hover:bg-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
            onClick={handleResetWidgets}
          >
            {t("dashboard.resetWidgetsAction")}
          </button>
        </div>
        {settingsError && (
          <p className="mt-2 text-xs text-amber-300" role="alert">
            {settingsError}
          </p>
        )}
      </header>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2" role="list" aria-label={t("dashboard.widgetsRegion", { defaultValue: "Dashboard widgets" })}>
        {activeWidgets.map((widget) => (
          <div
            key={widget.id}
            className={widget.span === "double" ? "xl:col-span-2" : ""}
            role="listitem"
          >
            <div className="mb-2 flex justify-end">
              <button
                type="button"
                className="rounded-md border border-slate-600 px-2 py-1 text-[11px] font-medium text-slate-300 hover:bg-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
                onClick={() => handleRemoveWidget(widget.id)}
                aria-label={t("dashboard.removeWidgetActionLabel", {
                  widget: t(widget.titleKey),
                })}
              >
                {t("dashboard.removeWidgetAction")}
              </button>
            </div>
            <DashboardWidgetCard widget={widget} />
          </div>
        ))}
        {activeWidgets.length === 0 && (
          <div className="rounded-lg border border-dashed border-slate-600 bg-slate-900/30 p-4 text-sm text-slate-300 xl:col-span-2" role="status">
            {t("dashboard.noWidgetsSelected")}
          </div>
        )}
      </div>
    </section>
  );
};

export default DashboardShell;

