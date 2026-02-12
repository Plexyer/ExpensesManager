import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import { getGridData } from "../../services/fileService";
import type { GetGridDataResult } from "../../services/fileService";
import { listPeriods, createPeriodFromTemplate } from "../../services/periodService";
import type { PeriodBudgetInstance, CreatePeriodFromTemplateArgs, CreatePeriodResult } from "../../types/period.types";
import { getUiSetting, setUiSetting } from "../../services/settingsService";
import type { ColumnWidths, GridColumnId, OptimalWidths, SelectedCell } from "../../components/features/BudgetGrid/types";
import { getDefaultColumnWidths, MIN_COLUMN_WIDTH, COLUMN_CONFIG } from "../../components/features/BudgetGrid/types";
import { formatErrorMessage } from "../../utils/formatErrorMessage";

// ============================================================================
// Constants
// ============================================================================

/** Key used to persist column widths in the ui_settings table. */
const COLUMN_WIDTHS_SETTING_KEY = "grid_column_widths";

/** Key used to persist the "show spent minus" preference. */
const SHOW_SPENT_MINUS_SETTING_KEY = "grid_show_spent_minus";

// ============================================================================
// Types
// ============================================================================

/** Display mode for the period selection list (grid cards vs list rows). */
export type PeriodViewMode = "grid" | "list";

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
  /** Whether the period selection view is shown (true) vs the detail/table view (false). Persisted in Redux so it survives tab switches. */
  showPeriodSelector: boolean;
  /** View mode for the period selection list. Persisted in Redux so it survives tab switches. */
  periodViewMode: PeriodViewMode;
  /** Current column widths for the budget grid. Persisted in Redux (survives tab switches) and in the database (survives app restarts). */
  columnWidths: ColumnWidths;
  /** Optimal (content-fit) widths for each resizable column, computed from data. */
  optimalWidths: OptimalWidths;
  /** Currently selected cell in the budget grid (TASK-4.3). */
  selectedCell: SelectedCell | null;
  /** Whether spent amounts display a minus sign in the period table. */
  showSpentMinus: boolean;
  /** Error from settings persistence (column widths). */
  settingsError: string | null;
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
  showPeriodSelector: true,
  periodViewMode: "grid",
  columnWidths: getDefaultColumnWidths(),
  optimalWidths: {},
  selectedCell: null,
  showSpentMinus: true,
  settingsError: null,
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
      return rejectWithValue(formatErrorMessage(error, "Failed to load periods"));
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
      return rejectWithValue(formatErrorMessage(error, "Failed to load grid data"));
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
      return rejectWithValue(formatErrorMessage(error, "Failed to create period"));
    }
  }
);

/** IDs of resizable columns — only these are persisted to the DB. Non-resizable columns (frozen + fixed-width) are auto-computed. */
const RESIZABLE_COLUMN_IDS = COLUMN_CONFIG.filter((c) => c.resizable).map((c) => c.id);

/** Loads column widths from the database. Falls back to defaults if not found. Only loads resizable columns. */
export const loadColumnWidths = createAsyncThunk(
  "budget/loadColumnWidths",
  async (_, { rejectWithValue }) => {
    try {
      const json = await getUiSetting(COLUMN_WIDTHS_SETTING_KEY);
      if (!json) return getDefaultColumnWidths();

      const parsed = JSON.parse(json) as Partial<ColumnWidths>;
      const defaults = getDefaultColumnWidths();

      // Merge saved widths with defaults — only apply persisted widths to resizable columns
      const merged: ColumnWidths = { ...defaults };
      for (const key of RESIZABLE_COLUMN_IDS) {
        if (typeof parsed[key] === "number" && parsed[key] >= MIN_COLUMN_WIDTH) {
          merged[key] = parsed[key];
        }
      }

      return merged;
    } catch {
      return rejectWithValue("Failed to load column widths");
    }
  }
);

/** Persists only resizable column widths to the database. */
export const saveColumnWidths = createAsyncThunk(
  "budget/saveColumnWidths",
  async (widths: ColumnWidths, { rejectWithValue }) => {
    try {
      // Only persist resizable column widths (frozen columns are auto-computed)
      const resizableWidths: Partial<ColumnWidths> = {};
      for (const id of RESIZABLE_COLUMN_IDS) {
        resizableWidths[id] = widths[id];
      }
      await setUiSetting(COLUMN_WIDTHS_SETTING_KEY, JSON.stringify(resizableWidths));
    } catch {
      return rejectWithValue("Failed to save column widths");
    }
  }
);

/** Loads the "show spent minus" preference from the database. Defaults to true. */
export const loadShowSpentMinus = createAsyncThunk(
  "budget/loadShowSpentMinus",
  async (_, { rejectWithValue }) => {
    try {
      const value = await getUiSetting(SHOW_SPENT_MINUS_SETTING_KEY);
      if (value === "false") return false;
      return true; // default on
    } catch {
      return rejectWithValue("Failed to load spent minus setting");
    }
  }
);

/** Persists the "show spent minus" preference to the database. */
export const saveShowSpentMinus = createAsyncThunk(
  "budget/saveShowSpentMinus",
  async (enabled: boolean, { rejectWithValue }) => {
    try {
      await setUiSetting(SHOW_SPENT_MINUS_SETTING_KEY, String(enabled));
      return enabled;
    } catch {
      return rejectWithValue("Failed to save spent minus setting");
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
      // Clear cell selection when switching periods
      state.selectedCell = null;
    },
    /** Resets all budget state (e.g. on file close). */
    clearBudgetState: () => initialState,
    /** Clears periods error (e.g. after dismissing an error message). */
    clearPeriodsError: (state) => {
      state.periodsError = null;
    },
    /** Clears settings persistence error (e.g. after dismissing an error message). */
    clearSettingsError: (state) => {
      state.settingsError = null;
    },
    /** Sets whether the period selector view is shown. */
    setShowPeriodSelector: (state, action: PayloadAction<boolean>) => {
      state.showPeriodSelector = action.payload;
    },
    /** Sets the period list display mode (grid cards vs list rows). */
    setPeriodViewMode: (state, action: PayloadAction<PeriodViewMode>) => {
      state.periodViewMode = action.payload;
    },
    /** Sets the width of a single column (used during drag resize). */
    setColumnWidth: (
      state,
      action: PayloadAction<{ columnId: GridColumnId; width: number }>
    ) => {
      const { columnId, width } = action.payload;
      state.columnWidths[columnId] = Math.max(width, MIN_COLUMN_WIDTH);
    },
    /** Batch-set multiple column widths at once (used during paired resize). */
    setColumnWidths: (
      state,
      action: PayloadAction<Partial<Record<GridColumnId, number>>>
    ) => {
      for (const [id, width] of Object.entries(action.payload) as [GridColumnId, number][]) {
        state.columnWidths[id] = Math.max(width, MIN_COLUMN_WIDTH);
      }
    },
    /** Sets the computed optimal widths for columns (from measureText). */
    setOptimalWidths: (state, action: PayloadAction<OptimalWidths>) => {
      state.optimalWidths = action.payload;
    },
    /** Sets the currently selected cell in the grid (TASK-4.3). */
    setSelectedCell: (state, action: PayloadAction<SelectedCell | null>) => {
      state.selectedCell = action.payload;
    },
    /** Clears the selected cell (convenience alias). */
    clearSelectedCell: (state) => {
      state.selectedCell = null;
    },
    /** Sets whether spent amounts show a minus sign. */
    setShowSpentMinus: (state, action: PayloadAction<boolean>) => {
      state.showSpentMinus = action.payload;
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
        // Clear cell selection when grid data is reloading
        state.selectedCell = null;
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

    // loadColumnWidths
    builder
      .addCase(loadColumnWidths.fulfilled, (state, action: PayloadAction<ColumnWidths>) => {
        state.columnWidths = action.payload;
      })
      .addCase(loadColumnWidths.rejected, (state, action) => {
        console.warn("[budgetSlice] loadColumnWidths failed:", action.payload);
        state.settingsError = action.payload as string;
      });

    // saveColumnWidths
    builder
      .addCase(saveColumnWidths.rejected, (state, action) => {
        console.warn("[budgetSlice] saveColumnWidths failed:", action.payload);
        state.settingsError = action.payload as string;
      });

    // loadShowSpentMinus
    builder
      .addCase(loadShowSpentMinus.fulfilled, (state, action: PayloadAction<boolean>) => {
        state.showSpentMinus = action.payload;
      })
      .addCase(loadShowSpentMinus.rejected, (state, action) => {
        console.warn("[budgetSlice] loadShowSpentMinus failed:", action.payload);
        state.settingsError = action.payload as string;
      });

    // saveShowSpentMinus
    builder
      .addCase(saveShowSpentMinus.fulfilled, (state, action: PayloadAction<boolean>) => {
        state.showSpentMinus = action.payload;
      })
      .addCase(saveShowSpentMinus.rejected, (state, action) => {
        console.warn("[budgetSlice] saveShowSpentMinus failed:", action.payload);
        state.settingsError = action.payload as string;
      });
  },
});

export const {
  setCurrentBudgetInstanceId,
  clearBudgetState,
  clearPeriodsError,
  clearSettingsError,
  setShowPeriodSelector,
  setPeriodViewMode,
  setColumnWidth,
  setColumnWidths,
  setOptimalWidths,
  setSelectedCell,
  clearSelectedCell,
  setShowSpentMinus,
} = budgetSlice.actions;
export default budgetSlice.reducer;
