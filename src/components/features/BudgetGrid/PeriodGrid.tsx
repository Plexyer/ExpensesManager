import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useAppSelector, useAppDispatch } from "../../../store/hooks";
import {
  fetchPeriods,
  fetchGridData,
  setCurrentBudgetInstanceId,
  setShowPeriodSelector,
  setPeriodViewMode,
  loadColumnWidths,
  loadShowSpentMinus,
  clearPeriodsError,
  clearSettingsError,
} from "../../../store/slices/budgetSlice";
import type { PeriodViewMode } from "../../../store/slices/budgetSlice";
import PeriodList from "./PeriodList";
import PeriodDetailToolbar from "./PeriodDetailToolbar";
import PeriodGridTable from "./PeriodGridTable";
import PeriodGridSkeleton from "./PeriodGridSkeleton";
import PeriodGridEmpty from "./PeriodGridEmpty";
import CreatePeriodModal from "./CreatePeriodModal";

const PeriodGrid = () => {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const {
    periods,
    periodsStatus,
    periodsError,
    currentBudgetInstanceId,
    gridData,
    gridDataStatus,
    gridDataError,
    showPeriodSelector,
    periodViewMode,
    settingsError,
  } = useAppSelector((state) => state.budget);

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // Load periods, column widths, and snap mode on mount
  useEffect(() => {
    if (periodsStatus === "idle") {
      dispatch(fetchPeriods());
      dispatch(loadColumnWidths());
      dispatch(loadShowSpentMinus());
    }
  }, [dispatch, periodsStatus]);

  // Load grid data when the selected period changes
  useEffect(() => {
    if (currentBudgetInstanceId !== null) {
      dispatch(fetchGridData(currentBudgetInstanceId));
    }
  }, [dispatch, currentBudgetInstanceId]);

  /** Handle period card/row selection — navigate to the table view. */
  const handleSelectPeriod = (budgetInstanceId: number) => {
    const isSamePeriod = budgetInstanceId === currentBudgetInstanceId;
    dispatch(setCurrentBudgetInstanceId(budgetInstanceId));
    // When re-selecting the same period, the useEffect watching
    // currentBudgetInstanceId won't fire (value unchanged), so we
    // explicitly fetch grid data to avoid a blank detail view.
    if (isSamePeriod) {
      dispatch(fetchGridData(budgetInstanceId));
    }
    dispatch(setShowPeriodSelector(false));
  };

  /** Handle opening the create period modal. */
  const handleOpenCreateModal = () => {
    setIsCreateModalOpen(true);
  };

  /** Handle closing the create period modal. Navigate to table if a period was created. */
  const handleCloseCreateModal = (created?: boolean) => {
    setIsCreateModalOpen(false);
    if (created) {
      dispatch(setShowPeriodSelector(false));
    }
  };

  /** Handle navigating back to the period selection view. */
  const handleBackToSelection = () => {
    dispatch(setShowPeriodSelector(true));
  };

  /** Handle retry on periods load error. */
  const handleRetryPeriods = () => {
    dispatch(clearPeriodsError());
    dispatch(fetchPeriods());
  };

  /** Handle dismiss on periods load error. */
  const handleDismissPeriodsError = () => {
    dispatch(clearPeriodsError());
  };

  /** Handle dismiss on settings persistence error. */
  const handleDismissSettingsError = () => {
    dispatch(clearSettingsError());
  };

  /** Handle retry on grid data error. */
  const handleRetry = () => {
    if (currentBudgetInstanceId !== null) {
      dispatch(fetchGridData(currentBudgetInstanceId));
    }
  };

  /** Refresh grid data after a transaction is added/modified in the modal. */
  const handleGridDataChanged = useCallback(() => {
    if (currentBudgetInstanceId !== null) {
      dispatch(fetchGridData(currentBudgetInstanceId));
    }
  }, [dispatch, currentBudgetInstanceId]);

  // Find the current period object for the detail toolbar
  const currentPeriod = periods.find(
    (p) => p.budget_instance_id === currentBudgetInstanceId
  );

  // Loading periods
  if (periodsStatus === "loading") {
    return <PeriodGridSkeleton />;
  }

  // Failed to load periods — show error UI with retry + dismiss
  if (periodsStatus === "failed") {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="w-10 h-10 mb-4 rounded-full bg-red-500/10 flex items-center justify-center">
          <svg
            className="w-5 h-5 text-red-400"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
            />
          </svg>
        </div>
        <p className="text-red-400 text-sm mb-1 font-medium">
          {t("grid.failedToLoadPeriods")}
        </p>
        <p className="text-slate-400 text-xs mb-4 max-w-xs">
          {periodsError ?? t("grid.failedToLoadPeriodsDesc")}
        </p>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={handleDismissPeriodsError}
            className="px-4 py-2 text-sm font-medium text-slate-300 hover:text-white hover:bg-slate-700 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500"
            aria-label={t("grid.dismissPeriodsError")}
          >
            {t("common.dismiss")}
          </button>
          <button
            type="button"
            onClick={handleRetryPeriods}
            className="px-4 py-2 text-sm font-medium text-blue-400 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/30 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500"
            aria-label={t("grid.retryLoadingPeriods")}
          >
            {t("common.retry")}
          </button>
        </div>
      </div>
    );
  }

  // No periods exist — show empty state
  if (periodsStatus === "succeeded" && periods.length === 0) {
    return (
      <>
        <PeriodGridEmpty
          variant="no-periods"
          onCreatePeriod={handleOpenCreateModal}
        />
        <CreatePeriodModal
          isOpen={isCreateModalOpen}
          onClose={handleCloseCreateModal}
        />
      </>
    );
  }

  // ── Period Selection View ──
  if (showPeriodSelector || currentBudgetInstanceId === null) {
    return (
      <div className="flex flex-col gap-6">
        <PeriodList
          periods={periods}
          currentBudgetInstanceId={currentBudgetInstanceId}
          viewMode={periodViewMode}
          onViewModeChange={(mode: PeriodViewMode) => dispatch(setPeriodViewMode(mode))}
          onSelectPeriod={handleSelectPeriod}
          onCreatePeriod={handleOpenCreateModal}
        />

        <CreatePeriodModal
          isOpen={isCreateModalOpen}
          onClose={handleCloseCreateModal}
        />
      </div>
    );
  }

  // ── Period Detail / Table View ──
  return (
    <div className="flex flex-col gap-4">
      {/* Settings persistence error banner */}
      {settingsError && (
        <div
          className="flex items-center justify-between gap-2 px-3 py-2 text-sm bg-amber-500/10 border border-amber-500/30 rounded-lg text-amber-400"
          role="alert"
        >
          <span>{settingsError}</span>
          <button
            type="button"
            onClick={handleDismissSettingsError}
            className="text-amber-400 hover:text-amber-300 transition-colors flex-shrink-0 p-0.5"
            aria-label={t("grid.dismissSettingsError")}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {/* Toolbar: back button + period info + save button */}
      <PeriodDetailToolbar
        period={currentPeriod}
        onBackToSelection={handleBackToSelection}
      />

      {/* Grid Content for selected period */}
      {gridDataStatus === "loading" && <PeriodGridSkeleton />}

      {gridDataStatus === "failed" && (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <p className="text-red-400 text-sm mb-3">
            {gridDataError ?? t("grid.failedToLoadGridData")}
          </p>
          <button
            type="button"
            onClick={handleRetry}
            className="px-4 py-2 text-sm font-medium text-blue-400 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/30 rounded-lg transition-colors"
            aria-label={t("grid.retryLoadingGridData")}
          >
            {t("common.retry")}
          </button>
        </div>
      )}

      {gridDataStatus === "succeeded" && gridData && (
        <>
          {gridData.rows.length === 0 ? (
            <PeriodGridEmpty variant="no-categories" />
          ) : (
            <PeriodGridTable rows={gridData.rows} onDataChanged={handleGridDataChanged} />
          )}
        </>
      )}

      {/* Create Period Modal (accessible from toolbar if needed in future) */}
      <CreatePeriodModal
        isOpen={isCreateModalOpen}
        onClose={handleCloseCreateModal}
      />
    </div>
  );
};

export default PeriodGrid;
