import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import { selectNewFilePath, selectExistingFilePath } from "../../services/fileService";

interface FileState {
  filePath: string | null;
  fileName: string | null;
  isFileOpen: boolean;
  isLoading: boolean;
  error: string | null;
}

const initialState: FileState = {
  filePath: null,
  fileName: null,
  isFileOpen: false,
  isLoading: false,
  error: null,
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

export const openExistingFile = createAsyncThunk(
  "file/openExisting",
  async (_, { rejectWithValue }) => {
    try {
      const result = await selectExistingFilePath();
      if (!result) {
        // User cancelled - not an error
        return null;
      }
      return result;
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
      state.isFileOpen = false;
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    // Create new file
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
          state.isFileOpen = true;
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
      .addCase(openExistingFile.fulfilled, (state, action: PayloadAction<{ path: string; name: string } | null>) => {
        state.isLoading = false;
        if (action.payload) {
          state.filePath = action.payload.path;
          state.fileName = action.payload.name;
          state.isFileOpen = true;
        }
        // If null (cancelled), just stop loading - no state change
      })
      .addCase(openExistingFile.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });
  },
});

export const { clearError, closeFile } = fileSlice.actions;
export default fileSlice.reducer;
