import { useEffect, useState } from "react";
import { useAppSelector, useAppDispatch } from "../../../store/hooks";
import {
  fetchPeriods,
  fetchGridData,
  setCurrentBudgetInstanceId,
  setShowPeriodSelector,
  setPeriodViewMode,
  loadColumnWidths,
  loadSnapMode,
} from "../../../store/slices/budgetSlice";
import type { PeriodViewMode } from "../../../store/slices/budgetSlice";
import PeriodList from "./PeriodList";
import PeriodDetailToolbar from "./PeriodDetailToolbar";
import PeriodGridTable from "./PeriodGridTable";
import PeriodGridSkeleton from "./PeriodGridSkeleton";
import PeriodGridEmpty from "./PeriodGridEmpty";
import CreatePeriodModal from "./CreatePeriodModal";

const PeriodGrid = () => {
  const dispatch = useAppDispatch();
  const {
    periods,
    periodsStatus,
    currentBudgetInstanceId,
    gridData,
    gridDataStatus,
    gridDataError,
    showPeriodSelector,
    periodViewMode,
  } = useAppSelector((state) => state.budget);

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // Load periods, column widths, and snap mode on mount
  useEffect(() => {
    if (periodsStatus === "idle") {
      dispatch(fetchPeriods());
      dispatch(loadColumnWidths());
      dispatch(loadSnapMode());
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

  /** Handle retry on grid data error. */
  const handleRetry = () => {
    if (currentBudgetInstanceId !== null) {
      dispatch(fetchGridData(currentBudgetInstanceId));
    }
  };

  // Find the current period object for the detail toolbar
  const currentPeriod = periods.find(
    (p) => p.budget_instance_id === currentBudgetInstanceId
  );

  // Loading periods
  if (periodsStatus === "loading") {
    return <PeriodGridSkeleton />;
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
            {gridDataError ?? "Failed to load grid data."}
          </p>
          <button
            type="button"
            onClick={handleRetry}
            className="px-4 py-2 text-sm font-medium text-blue-400 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/30 rounded-lg transition-colors"
            aria-label="Retry loading grid data"
          >
            Retry
          </button>
        </div>
      )}

      {gridDataStatus === "succeeded" && gridData && (
        <>
          {gridData.rows.length === 0 ? (
            <PeriodGridEmpty variant="no-categories" />
          ) : (
            <PeriodGridTable rows={gridData.rows} />
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
