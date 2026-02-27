import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  DragDropContext,
  Draggable,
  Droppable,
  type DropResult,
} from "@hello-pangea/dnd";
import DashboardWidgetCard from "./DashboardWidgetCard";
import { dashboardWidgetRegistry } from "./widgetRegistry";
import DashboardStateViews from "./DashboardStateViews";
import {
  loadDashboardWidgetIds,
  saveDashboardWidgetIds,
} from "./dashboardWidgetSettings";
import { fetchGridData, fetchPeriods } from "../../../store/slices/budgetSlice";
import { useAppDispatch, useAppSelector } from "../../../store/hooks";
import { DASHBOARD_DEFERRED_WIDGET_DELAY_MS } from "./dashboardPerformanceBudget";

const areWidgetIdsEqual = (left: string[], right: string[]): boolean =>
  left.length === right.length && left.every((id, index) => id === right[index]);

const moveItem = (items: string[], fromIndex: number, toIndex: number): string[] => {
  const reordered = [...items];
  const [movedItem] = reordered.splice(fromIndex, 1);
  reordered.splice(toIndex, 0, movedItem);
  return reordered;
};

const DashboardShell = () => {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const { isFileOpen } = useAppSelector((state) => state.file);
  const { periodsStatus, currentBudgetInstanceId, gridData, gridDataStatus } =
    useAppSelector((state) => state.budget);
  const allWidgetIds = useMemo(
    () => dashboardWidgetRegistry.map((widget) => widget.id),
    []
  );
  const [areDeferredWidgetsReady, setAreDeferredWidgetsReady] = useState(false);
  const [activeWidgetIds, setActiveWidgetIds] = useState<string[]>(allWidgetIds);
  const [selectedInactiveWidgetId, setSelectedInactiveWidgetId] = useState<string>("");
  const [settingsError, setSettingsError] = useState<string | null>(null);

  useEffect(() => {
    if (!isFileOpen || periodsStatus !== "idle") {
      return;
    }
    void dispatch(fetchPeriods());
  }, [dispatch, isFileOpen, periodsStatus]);

  useEffect(() => {
    if (!isFileOpen || periodsStatus !== "succeeded" || currentBudgetInstanceId === null) {
      return;
    }
    if (
      gridDataStatus === "idle" ||
      gridData?.budget_instance_id !== currentBudgetInstanceId
    ) {
      void dispatch(fetchGridData(currentBudgetInstanceId));
    }
  }, [
    currentBudgetInstanceId,
    dispatch,
    gridData?.budget_instance_id,
    gridDataStatus,
    isFileOpen,
    periodsStatus,
  ]);

  useEffect(() => {
    const timerId = window.setTimeout(() => {
      setAreDeferredWidgetsReady(true);
    }, DASHBOARD_DEFERRED_WIDGET_DELAY_MS);

    return () => {
      window.clearTimeout(timerId);
    };
  }, []);

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

  const activeWidgetSet = useMemo(() => new Set(activeWidgetIds), [activeWidgetIds]);
  const activeWidgets = useMemo(
    () =>
      activeWidgetIds
        .map((widgetId) =>
          dashboardWidgetRegistry.find((widgetDefinition) => widgetDefinition.id === widgetId)
        )
        .filter((widget): widget is (typeof dashboardWidgetRegistry)[number] => Boolean(widget)),
    [activeWidgetIds]
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
    if (!selectedInactiveWidgetId || activeWidgetSet.has(selectedInactiveWidgetId)) {
      return;
    }

    const nextIds = [...activeWidgetIds, selectedInactiveWidgetId];

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

  const handleReorder = (sourceIndex: number, destinationIndex: number) => {
    if (
      sourceIndex < 0 ||
      destinationIndex < 0 ||
      sourceIndex >= activeWidgetIds.length ||
      destinationIndex >= activeWidgetIds.length ||
      sourceIndex === destinationIndex
    ) {
      return;
    }

    const nextIds = moveItem(activeWidgetIds, sourceIndex, destinationIndex);
    setSettingsError(null);
    setActiveWidgetIds(nextIds);
    void persistWidgetIds(nextIds);
  };

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) {
      return;
    }

    handleReorder(result.source.index, result.destination.index);
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

      <DragDropContext onDragEnd={handleDragEnd}>
        <Droppable droppableId="dashboard-widgets">
          {(droppableProvided) => (
            <div
              ref={droppableProvided.innerRef}
              {...droppableProvided.droppableProps}
              className="grid grid-cols-1 gap-4 xl:grid-cols-2"
              role="list"
              aria-label={t("dashboard.widgetsRegion", { defaultValue: "Dashboard widgets" })}
            >
              {activeWidgets.map((widget, index) => (
                <Draggable key={widget.id} draggableId={widget.id} index={index}>
                  {(draggableProvided, snapshot) => (
                    <div
                      ref={draggableProvided.innerRef}
                      {...draggableProvided.draggableProps}
                      className={`${widget.span === "double" ? "xl:col-span-2" : ""} ${
                        snapshot.isDragging ? "opacity-95" : ""
                      }`}
                      role="listitem"
                    >
                      <div className="mb-2 flex flex-wrap justify-end gap-2">
                        <button
                          type="button"
                          {...draggableProvided.dragHandleProps}
                          className="rounded-md border border-slate-600 px-2 py-1 text-[11px] font-medium text-slate-300 hover:bg-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
                          aria-label={t("dashboard.reorderWidgetHandle", {
                            widget: t(widget.titleKey),
                          })}
                        >
                          {t("dashboard.reorderWidgetAction")}
                        </button>
                        <button
                          type="button"
                          className="rounded-md border border-slate-600 px-2 py-1 text-[11px] font-medium text-slate-300 hover:bg-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 disabled:opacity-60"
                          onClick={() => handleReorder(index, index - 1)}
                          disabled={index === 0}
                          aria-label={t("dashboard.moveWidgetUpActionLabel", {
                            widget: t(widget.titleKey),
                          })}
                        >
                          {t("dashboard.moveWidgetUpAction")}
                        </button>
                        <button
                          type="button"
                          className="rounded-md border border-slate-600 px-2 py-1 text-[11px] font-medium text-slate-300 hover:bg-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 disabled:opacity-60"
                          onClick={() => handleReorder(index, index + 1)}
                          disabled={index === activeWidgets.length - 1}
                          aria-label={t("dashboard.moveWidgetDownActionLabel", {
                            widget: t(widget.titleKey),
                          })}
                        >
                          {t("dashboard.moveWidgetDownAction")}
                        </button>
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
                      {!areDeferredWidgetsReady &&
                      widget.loadingPriority === "deferred" ? (
                        <DashboardWidgetCard
                          widget={{
                            ...widget,
                            render: () => <DashboardStateViews state="loading" />,
                          }}
                        />
                      ) : (
                        <DashboardWidgetCard widget={widget} />
                      )}
                    </div>
                  )}
                </Draggable>
              ))}
              {droppableProvided.placeholder}
              {activeWidgets.length === 0 && (
                <div
                  className="rounded-lg border border-dashed border-slate-600 bg-slate-900/30 p-4 text-sm text-slate-300 xl:col-span-2"
                  role="status"
                >
                  {t("dashboard.noWidgetsSelected")}
                </div>
              )}
            </div>
          )}
        </Droppable>
      </DragDropContext>
    </section>
  );
};

export default DashboardShell;

