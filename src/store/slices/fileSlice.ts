import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import { selectNewFilePath, selectExistingFilePath, getDbInfo } from "../../services/fileService";

export type OnboardingStep = "select" | "create-password" | "unlock-password" | "complete";

interface FileState {
  filePath: string | null;
  fileName: string | null;
  passwordHint: string | null;
  isFileOpen: boolean;
  isLoading: boolean;
  error: string | null;
  onboardingStep: OnboardingStep;
}

const initialState: FileState = {
  filePath: null,
  fileName: null,
  passwordHint: null,
  isFileOpen: false,
  isLoading: false,
  error: null,
  onboardingStep: "select",
};

export const createNewFile = createAsyncThunk(
  "file/createNew",
  async (_, { rejectWithValue }) => {
    try {
      const result = await selectNewFilePath();
      if (!result) {
        // User cancelled - not an error
        return null;
      }
      return result;
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : "Failed to create file");
    }
  }
);

export interface OpenFileResult {
  path: string;
  name: string;
  passwordHint: string | null;
}

export const openExistingFile = createAsyncThunk(
  "file/openExisting",
  async (_, { rejectWithValue }) => {
    try {
      const result = await selectExistingFilePath();
      if (!result) {
        // User cancelled - not an error
        return null;
      }
      
      // Read database info to validate format and get password hint
      // This validates that the file is a valid encrypted database before showing unlock modal
      const fileInfo = await getDbInfo(result.path);
      
      return {
        path: result.path,
        name: result.name,
        passwordHint: fileInfo.password_hint,
      } as OpenFileResult;
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : "Failed to open file");
    }
  }
);

const fileSlice = createSlice({
  name: "file",
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    closeFile: (state) => {
      state.filePath = null;
      state.fileName = null;
      state.passwordHint = null;
      state.isFileOpen = false;
      state.error = null;
      state.onboardingStep = "select";
    },
    // Called after password is set during file creation
    completeFileCreation: (state, action: PayloadAction<{ hint: string | null }>) => {
      state.passwordHint = action.payload.hint;
      state.isFileOpen = true;
      state.onboardingStep = "complete";
    },
    // Cancel password creation and go back to file selection
    cancelPasswordCreation: (state) => {
      state.filePath = null;
      state.fileName = null;
      state.onboardingStep = "select";
    },
    // Called after password is verified during file unlock
    completeFileUnlock: (state, action: PayloadAction<{ hint: string | null }>) => {
      state.passwordHint = action.payload.hint;
      state.isFileOpen = true;
      state.onboardingStep = "complete";
    },
    // Cancel file unlock and go back to file selection
    cancelFileUnlock: (state) => {
      state.filePath = null;
      state.fileName = null;
      state.onboardingStep = "select";
    },
    // Set password hint (used when reading from stub file)
    setPasswordHint: (state, action: PayloadAction<string | null>) => {
      state.passwordHint = action.payload;
    },
    // Set error message
    setError: (state, action: PayloadAction<string>) => {
      state.error = action.payload;
    },
  },
  extraReducers: (builder) => {
    // Create new file - store path and go to password creation step
    builder
      .addCase(createNewFile.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(createNewFile.fulfilled, (state, action: PayloadAction<{ path: string; name: string } | null>) => {
        state.isLoading = false;
        if (action.payload) {
          state.filePath = action.payload.path;
          state.fileName = action.payload.name;
          // Don't mark as open yet - need password first
          state.onboardingStep = "create-password";
        }
        // If null (cancelled), just stop loading - no state change
      })
      .addCase(createNewFile.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Open existing file
    builder
      .addCase(openExistingFile.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(openExistingFile.fulfilled, (state, action: PayloadAction<OpenFileResult | null>) => {
        state.isLoading = false;
        if (action.payload) {
          state.filePath = action.payload.path;
          state.fileName = action.payload.name;
          state.passwordHint = action.payload.passwordHint;
          // Don't mark as open yet - need password verification first
          state.onboardingStep = "unlock-password";
        }
        // If null (cancelled), just stop loading - no state change
      })
      .addCase(openExistingFile.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });
  },
});

export const { clearError, closeFile, completeFileCreation, cancelPasswordCreation, completeFileUnlock, cancelFileUnlock, setPasswordHint, setError } = fileSlice.actions;
export default fileSlice.reducer;
