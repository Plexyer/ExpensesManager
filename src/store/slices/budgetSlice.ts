import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import { getGridData } from "../../services/fileService";
import type { GetGridDataResult } from "../../services/fileService";
import { listPeriods, createPeriodFromTemplate } from "../../services/periodService";
import type { PeriodBudgetInstance, CreatePeriodFromTemplateArgs, CreatePeriodResult } from "../../types/period.types";

// ============================================================================
// State
// ============================================================================

interface BudgetState {
  /** All periods for the current file, ordered by start_date DESC */
  periods: PeriodBudgetInstance[];
  /** Loading status for period list */
  periodsStatus: "idle" | "loading" | "succeeded" | "failed";
  /** Error message if period list or creation failed */
  periodsError: string | null;
  /** Currently viewed period's budget instance ID */
  currentBudgetInstanceId: number | null;
  /** Grid data for the current period */
  gridData: GetGridDataResult | null;
  /** Loading status for grid data */
  gridDataStatus: "idle" | "loading" | "succeeded" | "failed";
  /** Error message if grid data load failed */
  gridDataError: string | null;
  /** Whether period creation is in progress */
  isCreatingPeriod: boolean;
}

const initialState: BudgetState = {
  periods: [],
  periodsStatus: "idle",
  periodsError: null,
  currentBudgetInstanceId: null,
  gridData: null,
  gridDataStatus: "idle",
  gridDataError: null,
  isCreatingPeriod: false,
};

// ============================================================================
// Async Thunks
// ============================================================================

/** Fetches all periods for the current file. */
export const fetchPeriods = createAsyncThunk(
  "budget/fetchPeriods",
  async (_, { rejectWithValue }) => {
    try {
      return await listPeriods();
    } catch (error) {
      const message = typeof error === "string" ? error : error instanceof Error ? error.message : "Failed to load periods";
      return rejectWithValue(message);
    }
  }
);

/** Fetches grid data (category rows with rollups) for a budget instance. */
export const fetchGridData = createAsyncThunk(
  "budget/fetchGridData",
  async (budgetInstanceId: number, { rejectWithValue }) => {
    try {
      return await getGridData(budgetInstanceId);
    } catch (error) {
      const message = typeof error === "string" ? error : error instanceof Error ? error.message : "Failed to load grid data";
      return rejectWithValue(message);
    }
  }
);

/** Creates a new period from a template, then refreshes the periods list and auto-selects it. */
export const createPeriod = createAsyncThunk(
  "budget/createPeriod",
  async (args: CreatePeriodFromTemplateArgs, { dispatch, rejectWithValue }) => {
    try {
      const result: CreatePeriodResult = await createPeriodFromTemplate(args);
      // Refresh the periods list so the new period shows up
      await dispatch(fetchPeriods()).unwrap();
      return result;
    } catch (error) {
      const message = typeof error === "string" ? error : error instanceof Error ? error.message : "Failed to create period";
      return rejectWithValue(message);
    }
  }
);

// ============================================================================
// Slice
// ============================================================================

const budgetSlice = createSlice({
  name: "budget",
  initialState,
  reducers: {
    /** Sets the currently active period and clears stale grid data. */
    setCurrentBudgetInstanceId: (state, action: PayloadAction<number | null>) => {
      state.currentBudgetInstanceId = action.payload;
      // Clear grid data so the UI shows skeleton while new data loads
      state.gridData = null;
      state.gridDataStatus = "idle";
      state.gridDataError = null;
    },
    /** Resets all budget state (e.g. on file close). */
    clearBudgetState: () => initialState,
    /** Clears periods error (e.g. after dismissing an error message). */
    clearPeriodsError: (state) => {
      state.periodsError = null;
    },
  },
  extraReducers: (builder) => {
    // fetchPeriods
    builder
      .addCase(fetchPeriods.pending, (state) => {
        state.periodsStatus = "loading";
        state.periodsError = null;
      })
      .addCase(fetchPeriods.fulfilled, (state, action: PayloadAction<PeriodBudgetInstance[]>) => {
        state.periodsStatus = "succeeded";
        state.periods = action.payload;
        state.periodsError = null;
        // Auto-select the most recent period if none is selected
        if (state.currentBudgetInstanceId === null && action.payload.length > 0) {
          state.currentBudgetInstanceId = action.payload[0].budget_instance_id;
        }
      })
      .addCase(fetchPeriods.rejected, (state, action) => {
        state.periodsStatus = "failed";
        state.periodsError = action.payload as string;
      });

    // fetchGridData
    builder
      .addCase(fetchGridData.pending, (state) => {
        state.gridDataStatus = "loading";
        state.gridDataError = null;
      })
      .addCase(fetchGridData.fulfilled, (state, action: PayloadAction<GetGridDataResult>) => {
        state.gridDataStatus = "succeeded";
        state.gridData = action.payload;
        state.gridDataError = null;
      })
      .addCase(fetchGridData.rejected, (state, action) => {
        state.gridDataStatus = "failed";
        state.gridDataError = action.payload as string;
      });

    // createPeriod
    builder
      .addCase(createPeriod.pending, (state) => {
        state.isCreatingPeriod = true;
        state.periodsError = null;
      })
      .addCase(createPeriod.fulfilled, (state, action) => {
        state.isCreatingPeriod = false;
        // Auto-select the newly created period
        state.currentBudgetInstanceId = action.payload.period.budget_instance_id;
      })
      .addCase(createPeriod.rejected, (state, action) => {
        state.isCreatingPeriod = false;
        state.periodsError = action.payload as string;
      });
  },
});

export const { setCurrentBudgetInstanceId, clearBudgetState, clearPeriodsError } = budgetSlice.actions;
export default budgetSlice.reducer;
